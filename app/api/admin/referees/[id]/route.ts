export const dynamic = 'force-dynamic';

import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse, type AuthenticatedUser } from '@/lib/api-guard';
import { tenantWhere } from '@/lib/tenant';
import { logAuditAction } from '@/lib/audit-log';

function resolveOrganizationIdFromContext(auth: AuthenticatedUser): string | NextResponse {
  if (auth.isSuperAdmin && !auth.actingOrganizationId) {
    return NextResponse.json(
      { error: 'SUPER_ADMIN precisa de impersonação ativa para excluir árbitro' },
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

    const referee = await prisma.user.findFirst({
      where: tenantWhere(auth, 'organizationId', {
        id: targetUserId,
        role: { in: ['ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL'] },
      }),
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    if (!referee || referee.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Árbitro não encontrado na organização ativa' }, { status: 404 });
    }

    const [assignmentsCount, judgmentsCount] = await Promise.all([
      prisma.championshipReferee.count({
        where: {
          refereeId: referee.id,
          organizationId,
        },
      }),
      prisma.judgment.count({
        where: {
          judgeId: referee.id,
          organizationId,
        },
      }),
    ]);

    if (assignmentsCount > 0 || judgmentsCount > 0) {
      return NextResponse.json(
        {
          error:
            'Não é possível excluir este árbitro: existem vínculos (atribuições e/ou julgamentos) relacionados. Desvincule antes de excluir.',
        },
        { status: 409 },
      );
    }

    await prisma.user.delete({ where: { id: referee.id } });

    await logAuditAction(auth.id, auth.role, 'DELETE', organizationId, 'User', referee.id, {
      deletedUserEmail: referee.email,
      deletedUserRole: referee.role,
      deletedByEndpoint: '/api/admin/referees/[id]',
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        {
          error:
            'Não é possível excluir este árbitro: existem vínculos relacionados. Desvincule os registros dependentes antes de excluir.',
        },
        { status: 409 },
      );
    }

    console.error('Delete referee error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
