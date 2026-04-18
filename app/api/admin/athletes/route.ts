export const dynamic = 'force-dynamic';

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse, type AuthenticatedUser } from '@/lib/api-guard';
import { isValidEmail, sanitizeInput } from '@/lib/validation';
import { logAuditAction } from '@/lib/audit-log';

function resolveOrganizationIdFromContext(auth: AuthenticatedUser): string | NextResponse {
  if (auth.isSuperAdmin && !auth.actingOrganizationId) {
    return NextResponse.json(
      { error: 'SUPER_ADMIN precisa de impersonação ativa para criar atleta' },
      { status: 403 },
    );
  }

  if (!auth.actingOrganizationId) {
    return NextResponse.json({ error: 'Usuário sem organização ativa' }, { status: 403 });
  }

  return auth.actingOrganizationId;
}

function generateTemporaryPassword(length = 12): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(length);
  let generated = '';

  for (let i = 0; i < length; i += 1) {
    generated += charset[bytes[i] % charset.length];
  }

  return generated;
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const body = await request.json();
    const name = sanitizeInput(body?.name ?? '');
    const email = (body?.email ?? '').trim().toLowerCase();

    if (body?.role !== undefined && body.role !== 'ATLETA') {
      return NextResponse.json({ error: 'Role inválido. Use ATLETA' }, { status: 400 });
    }

    if (!name || name.length < 2 || !email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
    }

    const temporaryPassword = generateTemporaryPassword(12);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const athlete = await prisma.user.create({
      data: {
        name,
        email,
        role: 'ATLETA',
        password: hashedPassword,
        mustChangePassword: true,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    await logAuditAction(auth.id, auth.role, 'CREATE', organizationId, 'User', athlete.id, {
      createdUserRole: athlete.role,
      createdUserEmail: athlete.email,
      createdByEndpoint: '/api/admin/athletes',
    });

    return NextResponse.json(
      {
        user: athlete,
        temporaryPassword,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('Create athlete error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
