export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  validatePassword,
  isValidEmail,
  sanitizeInput,
  isValidBirthDate,
  validateCPF,
} from '@/lib/validation';
import type { Invitation, Prisma } from '@prisma/client';
import { slugify } from '@/lib/utils';

const signupAttempts = new Map<string, { count: number; firstAttempt: number }>();
const SIGNUP_MAX = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

function checkSignupRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = signupAttempts.get(ip);
  if (!record || now - record.firstAttempt > SIGNUP_WINDOW_MS) {
    signupAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }
  if (record.count >= SIGNUP_MAX) return false;
  record.count++;
  return true;
}

async function auditInvalidSignupAttempt(params: {
  reason: string;
  ip: string;
  email?: string;
  token?: string;
  invitation?: Pick<Invitation, 'id' | 'organizationId'> | null;
}) {
  try {
    let actorUserId: string | null = null;
    let actorOrganizationId: string | null = params.invitation?.organizationId ?? null;

    if (params.email) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: params.email },
        select: { id: true, organizationId: true },
      });
      if (existingByEmail) {
        actorUserId = existingByEmail.id;
        actorOrganizationId = existingByEmail.organizationId;
      }
    }

    if (!actorUserId && params.invitation?.organizationId) {
      const orgAdmin = await prisma.user.findFirst({
        where: {
          organizationId: params.invitation.organizationId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (orgAdmin) {
        actorUserId = orgAdmin.id;
      }
    }

    if (!actorUserId) {
      const fallbackActor = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, organizationId: true },
      });
      if (fallbackActor) {
        actorUserId = fallbackActor.id;
        actorOrganizationId = fallbackActor.organizationId;
      }
    }

    if (!actorUserId) return;

    await prisma.auditLog.create({
      data: {
        action: 'SIGNUP_INVITATION_INVALID_ATTEMPT',
        entityType: 'Invitation',
        entityId: params.invitation?.id ?? 'unknown',
        userId: actorUserId,
        organizationId: actorOrganizationId,
        ipAddress: params.ip,
        details: JSON.stringify({
          reason: params.reason,
          email: params.email ?? null,
          tokenPrefix: params.token ? params.token.slice(0, 8) : null,
        }),
      },
    });
  } catch {
    // non-blocking
  }
}
async function generateUniqueOrganizationSlug(
  tx: Prisma.TransactionClient,
  organizationName: string
): Promise<string> {
  const baseSlug = slugify(organizationName) || 'organizacao';

  const existingSlugs = await tx.organization.findMany({
    where: {
      slug: {
        startsWith: baseSlug,
      },
    },
    select: { slug: true },
  });

  const usedSlugs = new Set(existingSlugs.map((row) => row.slug));
  if (!usedSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;
  while (usedSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkSignupRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas tentativas de cadastro. Aguarde antes de tentar novamente.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawEmail = (body?.email ?? '').trim().toLowerCase();
    const rawPassword = body?.password ?? '';
    const rawName = sanitizeInput(body?.name ?? '');
    const rawCpf = (body?.cpf ?? '').replace(/\D/g, '');
    const rawPhone = (body?.phone ?? '').replace(/\D/g, '');
    const rawBirthDate = (body?.birthDate ?? '').trim();
    const inviteToken = (body?.token ?? '').trim();

    const hasTenantBypassAttempt = Boolean(body?.organizationId || body?.organizationSlug || body?.slug);
    if (hasTenantBypassAttempt) {
      await auditInvalidSignupAttempt({
        reason: 'Payload com organizationId/organizationSlug/slug bloqueado',
        ip,
        email: rawEmail || undefined,
        token: inviteToken || undefined,
      });
      return NextResponse.json(
        { error: 'Campos organizationId/organizationSlug/slug não são permitidos no cadastro.' },
        { status: 400 }
      );
    }

    if (!rawName || !rawEmail || !rawPassword) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (rawName.length < 3 || rawName.length > 120) {
      return NextResponse.json(
        { error: 'Nome deve ter entre 3 e 120 caracteres' },
        { status: 400 }
      );
    }

    if (!isValidEmail(rawEmail)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    const passwordCheck = validatePassword(rawPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: 'Senha fraca: ' + passwordCheck.errors.join('; ') },
        { status: 400 }
      );
    }

    if (rawCpf && !validateCPF(rawCpf)) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
    }

    if (rawPhone && (rawPhone.length < 10 || rawPhone.length > 11)) {
      return NextResponse.json(
        { error: 'Telefone deve ter 10 ou 11 dígitos' },
        { status: 400 }
      );
    }

    if (rawBirthDate && !isValidBirthDate(rawBirthDate)) {
      return NextResponse.json(
        { error: 'Data de nascimento inválida' },
        { status: 400 }
      );
    }

    if (!inviteToken) {
      const [existingEmail, existingCpf] = await Promise.all([
        prisma.user.findUnique({ where: { email: rawEmail }, select: { id: true } }),
        rawCpf
          ? prisma.user.findUnique({ where: { cpf: rawCpf }, select: { id: true } })
          : Promise.resolve(null),
      ]);

      if (existingEmail || existingCpf) {
        return NextResponse.json(
          { error: 'Não foi possível completar o cadastro. Verifique seus dados ou tente fazer login.' },
          { status: 409 }
        );
      }

      const hashedPassword = await bcrypt.hash(rawPassword, 12);

      const { user } = await prisma.$transaction(async (tx) => {
        const orgSlug = await generateUniqueOrganizationSlug(tx, rawName);

        const organization = await tx.organization.create({
          data: {
            name: rawName,
            slug: orgSlug,
          },
        });

        const createdUser = await tx.user.create({
          data: {
            email: rawEmail,
            password: hashedPassword,
            name: rawName,
            cpf: rawCpf || null,
            phone: rawPhone || null,
            birthDate: rawBirthDate ? new Date(rawBirthDate) : null,
            role: 'ADMIN',
            organizationId: organization.id,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: createdUser.id,
            role: 'ADMIN',
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'USER_SIGNUP',
            entityType: 'User',
            entityId: createdUser.id,
            userId: createdUser.id,
            organizationId: organization.id,
            ipAddress: ip,
            details: JSON.stringify({ role: 'ADMIN', source: 'direct_signup_bootstrap' }),
          },
        });

        return { user: createdUser };
      });

      return NextResponse.json(
        { user: { id: user.id, name: user.name, role: user.role, organizationId: user.organizationId } },
        { status: 201 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token: inviteToken },
      select: {
        id: true,
        token: true,
        email: true,
        role: true,
        organizationId: true,
        expiresAt: true,
        usedAt: true,
        organization: {
          select: { id: true, isActive: true },
        },
      },
    });

    if (!invitation) {
      await auditInvalidSignupAttempt({
        reason: 'Token inexistente',
        ip,
        email: rawEmail,
        token: inviteToken,
      });
      return NextResponse.json(
        { error: 'Token de convite inválido ou expirado.' },
        { status: 400 }
      );
    }

    if (!invitation.organization.isActive) {
      await auditInvalidSignupAttempt({
        reason: 'Organização do convite desativada',
        ip,
        email: rawEmail,
        token: inviteToken,
        invitation,
      });
      return NextResponse.json(
        { error: 'Organização vinculada ao convite está inativa.' },
        { status: 403 }
      );
    }

    if (invitation.usedAt) {
      await auditInvalidSignupAttempt({
        reason: 'Token já utilizado',
        ip,
        email: rawEmail,
        token: inviteToken,
        invitation,
      });
      return NextResponse.json(
        { error: 'Este convite já foi utilizado.' },
        { status: 400 }
      );
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      await auditInvalidSignupAttempt({
        reason: 'Token expirado',
        ip,
        email: rawEmail,
        token: inviteToken,
        invitation,
      });
      return NextResponse.json(
        { error: 'Token de convite expirado.' },
        { status: 400 }
      );
    }

    if (invitation.email.toLowerCase() !== rawEmail) {
      await auditInvalidSignupAttempt({
        reason: 'Email não corresponde ao convite',
        ip,
        email: rawEmail,
        token: inviteToken,
        invitation,
      });
      return NextResponse.json(
        { error: 'O email informado não corresponde ao convite.' },
        { status: 400 }
      );
    }

    if (invitation.role === 'SUPER_ADMIN') {
      await auditInvalidSignupAttempt({
        reason: 'Convite com role SUPER_ADMIN bloqueado',
        ip,
        email: rawEmail,
        token: inviteToken,
        invitation,
      });
      return NextResponse.json(
        { error: 'Role de convite inválida para auto cadastro.' },
        { status: 400 }
      );
    }

    const [existingEmail, existingCpf] = await Promise.all([
      prisma.user.findUnique({ where: { email: rawEmail }, select: { id: true } }),
      rawCpf
        ? prisma.user.findUnique({ where: { cpf: rawCpf }, select: { id: true } })
        : Promise.resolve(null),
    ]);

    if (existingEmail || existingCpf) {
      await auditInvalidSignupAttempt({
        reason: 'Conflito de email/CPF já cadastrado',
        ip,
        email: rawEmail,
        token: inviteToken,
        invitation,
      });
      return NextResponse.json(
        { error: 'Não foi possível completar o cadastro. Verifique seus dados ou tente fazer login.' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    const { user } = await prisma.$transaction(async (tx) => {
      const lockInvite = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      if (lockInvite.count !== 1) {
        throw new Error('INVITATION_NOT_AVAILABLE');
      }

      const createdUser = await tx.user.create({
        data: {
          email: rawEmail,
          password: hashedPassword,
          name: rawName,
          cpf: rawCpf || null,
          phone: rawPhone || null,
          birthDate: rawBirthDate ? new Date(rawBirthDate) : null,
          role: invitation.role,
          organizationId: invitation.organizationId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'INVITATION_USED_SIGNUP',
          entityType: 'Invitation',
          entityId: invitation.id,
          userId: createdUser.id,
          organizationId: invitation.organizationId,
          ipAddress: ip,
          details: JSON.stringify({ role: invitation.role, email: rawEmail }),
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'USER_SIGNUP',
          entityType: 'User',
          entityId: createdUser.id,
          userId: createdUser.id,
          organizationId: invitation.organizationId,
          ipAddress: ip,
          details: JSON.stringify({ role: invitation.role, source: 'invitation_token' }),
        },
      });

      return { user: createdUser };
    });

    return NextResponse.json(
      { user: { id: user.id, name: user.name, role: user.role, organizationId: user.organizationId } },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'INVITATION_NOT_AVAILABLE') {
      return NextResponse.json(
        { error: 'Token de convite inválido, expirado ou já utilizado.' },
        { status: 400 }
      );
    }

    console.error('Signup error:', message);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}