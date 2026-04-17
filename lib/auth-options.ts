import { NextAuthOptions } from 'next-auth';
import type { UserRole } from '@prisma/client';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit-log';
import { headers, cookies } from 'next/headers';

const IMPERSONATION_COOKIE = 'stagecore_impersonation_org';
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(email);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(email, { count: 1, firstAttempt: now });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) return false;
  record.count++;
  return true;
}

function resetRateLimit(email: string): void {
  loginAttempts.delete(email);
}

async function logAuthEvent(
  action: string,
  userId: string | null,
  role: UserRole | null,
  details: string,
  ipAddress: string | null,
  organizationId?: string | null,
) {
  if (!userId || !role) return;

  await logAuditAction(userId, role, action, organizationId ?? null, 'User', userId, {
    details,
    ipAddress,
  });
}

function getClientIP(): string | null {
  try {
    const h = headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
  } catch {
    return null;
  }
}

function getImpersonationCookie(): string | null {
  try {
    return cookies().get(IMPERSONATION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Credenciais inválidas');
        }

        const rawEmail = credentials.email.trim();
        const email = rawEmail.toLowerCase();
        const ip = getClientIP();

        if (!checkRateLimit(email)) {
          await logAuthEvent('LOGIN_RATE_LIMITED', null, null, `Email: ${email}`, ip);
          throw new Error('Muitas tentativas. Aguarde 15 minutos.');
        }

        const user = await prisma.user.findFirst({
          where: { email: { equals: rawEmail, mode: 'insensitive' } },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            organizationId: true,
            mustChangePassword: true,
            organization: {
              select: {
                id: true,
                isActive: true,
              },
            },
          },
        });

        if (!user) {
          await bcrypt.hash('dummy-timing-safe', 12);
          await logAuthEvent('LOGIN_FAILED', null, null, `Email não encontrado: ${email}`, ip);
          throw new Error('Credenciais inválidas');
        }

        if (!user.role) {
          throw new Error('Unauthorized');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          await logAuthEvent('LOGIN_FAILED', user.id, user.role, `Senha incorreta para: ${email}`, ip, user.organizationId);
          throw new Error('Credenciais inválidas');
        }

        if (user.role !== 'SUPER_ADMIN') {
          if (!user.organizationId) {
            await logAuthEvent('LOGIN_BLOCKED', user.id, user.role, 'Usuário sem organizationId', ip);
            throw new Error('Usuário sem organização vinculada');
          }
          if (!user.organization?.isActive) {
            await logAuthEvent('LOGIN_BLOCKED', user.id, user.role, 'Organização desativada', ip, user.organizationId);
            throw new Error('Organização desativada');
          }
        }

        resetRateLimit(email);
        await logAuthEvent('LOGIN_SUCCESS', user.id, user.role, `Login bem-sucedido: ${email}`, ip, user.organizationId);
        await logAuditAction(user.id, user.role, 'LOGIN', user.organizationId, 'User', user.id, {
          email,
          ipAddress: ip,
        });

        if (user.role === 'SUPER_ADMIN') {
          await logAuditAction(
            user.id,
            user.role,
            'SUPER_ADMIN_LOGIN_SUCCESS',
            user.organizationId,
            'Auth',
            user.id,
            { email, ipAddress: ip, scope: 'global' },
          );
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.mustChangePassword = user.mustChangePassword;
        return token;
      }

      if (token?.id && token.mustChangePassword) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { mustChangePassword: true },
        });
        token.mustChangePassword = Boolean(dbUser?.mustChangePassword);
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        const isSuperAdmin = token.role === 'SUPER_ADMIN';
        const impersonatedOrganizationId = isSuperAdmin ? getImpersonationCookie() : null;

        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.isSuperAdmin = isSuperAdmin;
        session.user.isImpersonating = Boolean(isSuperAdmin && impersonatedOrganizationId);
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.actingOrganizationId = isSuperAdmin
          ? impersonatedOrganizationId
          : (token.organizationId ?? null);
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
