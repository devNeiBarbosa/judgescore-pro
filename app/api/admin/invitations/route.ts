export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { isValidEmail } from '@/lib/validation';
import { logAuditAction } from '@/lib/audit-log';

const INVITATION_EXPIRATION_DAYS = 7;
const ALLOWED_INVITATION_ROLES = ['ATLETA', 'ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL', 'ADMIN'] as const;

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const queryOrganizationId = request.nextUrl.searchParams.get('organizationId')?.trim() ?? '';
    const organizationId = auth.actingOrganizationId ?? (auth.isSuperAdmin ? queryOrganizationId : null);

    if (!organizationId) {
      return NextResponse.json({ error: 'Selecione uma organização para listar convites' }, { status: 400 });
    }

    const invitations = await prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        token: true,
        role: true,
        organizationId: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ invitations });
  } catch (error: unknown) {
    console.error('List invitations error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const email = (body?.email ?? '').trim().toLowerCase();
    const role = body?.role;
    const requestedOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : '';
    const organizationId = auth.actingOrganizationId ?? (auth.isSuperAdmin ? requestedOrganizationId : null);

    if (!organizationId) {
      return NextResponse.json({ error: 'Selecione uma organização para criar convites' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    if (!ALLOWED_INVITATION_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Role inválido. Use: ATLETA, ARBITRO_AUXILIAR, ARBITRO_CENTRAL ou ADMIN' },
        { status: 400 },
      );
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        organizationId,
        role,
        expiresAt,
      },
      select: {
        id: true,
        email: true,
        token: true,
        role: true,
        organizationId: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
      },
    });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_INVITATION_CREATED',
        organizationId,
        'Invitation',
        invitation.id,
        {
          email: invitation.email,
          invitedRole: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
          crossOrganization: !auth.actingOrganizationId,
          requestedOrganizationId,
        },
      );
    }

    const invitationLink = `${request.nextUrl.origin}/signup?token=${invitation.token}`;

    return NextResponse.json({ invitation, invitationLink }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create invitation error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
