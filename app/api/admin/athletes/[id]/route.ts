export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse, type AuthenticatedUser } from '@/lib/api-guard';
import { tenantWhere } from '@/lib/tenant';
import { logAuditAction } from '@/lib/audit-log';

function resolveOrganizationIdFromContext(auth: AuthenticatedUser): string | NextResponse {
  if (auth.isSuperAdmin && !auth.actingOrganizationId) {
    return NextResponse.json(
      { error: 'SUPER_ADMIN precisa de impersonação ativa para excluir atleta' },
      { status: 403 },
    );
  }

  if (!auth.actingOrganizationId) {
    return NextResponse.json({ error: 'Usuário sem organização ativa' }, { status: 403 });
  }

  return auth.actingOrganizationId;
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const targetUserId = String(params?.id ?? '');
    if (!targetUserId) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    if (auth.id === targetUserId) {
      return NextResponse.json({ error: 'Self-delete não é permitido' }, { status: 400 });
    }

    const athlete = await prisma.user.findFirst({
      where: tenantWhere(auth, 'organizationId', {
        id: targetUserId,
        role: 'ATLETA',
      }),
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    if (!athlete || athlete.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Atleta não encontrado na organização ativa' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const participations = await tx.participation.findMany({
        where: {
          athleteId: athlete.id,
          organizationId,
        },
        select: { id: true },
      });

      const participationIds = participations.map((row) => row.id);

      if (participationIds.length > 0) {
        await tx.result.deleteMany({
          where: { participationId: { in: participationIds } },
        });

        await tx.judgment.deleteMany({
          where: { participationId: { in: participationIds } },
        });
      }

      await tx.participation.deleteMany({ where: { athleteId: athlete.id, organizationId } });
      await tx.inscription.deleteMany({ where: { athleteId: athlete.id, organizationId } });
      await tx.order.deleteMany({ where: { athleteId: athlete.id, organizationId } });
      await tx.auditLog.deleteMany({ where: { userId: athlete.id } });
      await tx.user.delete({ where: { id: athlete.id } });
    });

    await logAuditAction(auth.id, auth.role, 'DELETE', organizationId, 'User', athlete.id, {
      deletedUserEmail: athlete.email,
      deletedUserRole: athlete.role,
      deletedByEndpoint: '/api/admin/athletes/[id]',
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete athlete error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
