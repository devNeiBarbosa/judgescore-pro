export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { isValidEmail, sanitizeInput, validatePassword } from '@/lib/validation';
import { tenantWhere } from '@/lib/tenant';
import { logAuditAction } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const hasGlobalScope = auth.isSuperAdmin && !auth.actingOrganizationId;

    const users = await prisma.user.findMany({
      // Segurança: visão global somente para SUPER_ADMIN sem actingOrganizationId.
      where: hasGlobalScope ? {} : tenantWhere(auth),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        organizationId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('List users error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    if (!auth || !auth.role) {
      throw new Error('Unauthorized');
    }

    const body = await request.json();
    const name = sanitizeInput(body?.name ?? '');
    const email = (body?.email ?? '').trim().toLowerCase();
    const role = body?.role;
    const password = body?.password ?? '';
    const organizationId = auth.actingOrganizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'Selecione uma organização antes de criar usuários' }, { status: 400 });
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: 'Senha fraca: ' + pwCheck.errors.join('; ') }, { status: 400 });
    }

    const validRoles = ['ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL', 'ADMIN'] as const;
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role inválido. Use: ARBITRO_AUXILIAR, ARBITRO_CENTRAL ou ADMIN' },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        organizationId,
      },
      select: { id: true, name: true, email: true, role: true, organizationId: true },
    });

    await logAuditAction(auth.id, auth.role, 'CREATE', organizationId, 'User', user.id, {
      createdUserRole: user.role,
      createdUserEmail: user.email,
    });

    await logAuditAction(auth.id, auth.role, 'ROLE_CHANGE', organizationId, 'User', user.id, {
      targetUserId: user.id,
      newRole: user.role,
      reason: 'INITIAL_ASSIGNMENT',
    });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_USER_CREATED',
        organizationId,
        'User',
        user.id,
        {
          createdUserRole: user.role,
          createdUserEmail: user.email,
          crossOrganization: !auth.actingOrganizationId,
        },
      );
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Create user error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
