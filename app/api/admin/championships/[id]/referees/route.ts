export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse, type AuthenticatedUser } from '@/lib/api-guard';
import { tenantWhere } from '@/lib/tenant';
import { logAuditAction } from '@/lib/audit-log';

function resolveOrganizationIdFromContext(auth: AuthenticatedUser, championshipOrganizationId: string): string | NextResponse {
  if (auth.isSuperAdmin) {
    return auth.actingOrganizationId ?? championshipOrganizationId;
  }

  if (!auth.actingOrganizationId) {
    return NextResponse.json({ error: 'Usuário sem organização ativa' }, { status: 403 });
  }

  return auth.actingOrganizationId;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const championship = await prisma.championship.findUnique({
      where: { id: params.id },
      select: { id: true, organizationId: true },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    const organizationId = resolveOrganizationIdFromContext(auth, championship.organizationId);
    if (organizationId instanceof NextResponse) return organizationId;

    if (!auth.isSuperAdmin && championship.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Campeonato fora do contexto da organização ativa' }, { status: 403 });
    }

    const body = await request.json();
    const refereeId = body?.refereeId;

    if (!refereeId) {
      return NextResponse.json({ error: 'refereeId é obrigatório' }, { status: 400 });
    }

    const referee = await prisma.user.findFirst({
      where: {
        id: refereeId,
        organizationId,
        role: { in: ['ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL'] },
      },
      select: { id: true, role: true, name: true },
    });

    if (!referee) {
      return NextResponse.json({ error: 'Usuário não é um árbitro válido' }, { status: 400 });
    }

    const existing = await prisma.championshipReferee.findUnique({
      where: { championshipId_refereeId: { championshipId: params.id, refereeId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Árbitro já está atribuído a este campeonato' }, { status: 409 });
    }

    const assignment = await prisma.championshipReferee.create({
      data: {
        championshipId: params.id,
        refereeId,
        organizationId,
      },
      include: { referee: { select: { id: true, name: true, email: true, role: true } } },
    });

    await logAuditAction(auth.id, auth.role, 'CREATE', organizationId, 'ChampionshipReferee', assignment.id, {
      refereeId,
      championshipId: params.id,
      refereeName: referee.name,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: unknown) {
    console.error('Assign referee error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const championship = await prisma.championship.findUnique({
      where: { id: params.id },
      select: { id: true, organizationId: true },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    const organizationId = resolveOrganizationIdFromContext(auth, championship.organizationId);
    if (organizationId instanceof NextResponse) return organizationId;

    if (!auth.isSuperAdmin && championship.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Campeonato fora do contexto da organização ativa' }, { status: 403 });
    }

    const body = await request.json();
    const refereeId = body?.refereeId;

    if (!refereeId) {
      return NextResponse.json({ error: 'refereeId é obrigatório' }, { status: 400 });
    }

    const existing = await prisma.championshipReferee.findFirst({
      where: {
        championshipId: params.id,
        refereeId,
        organizationId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Atribuição não encontrada' }, { status: 404 });
    }

    const existingJudgmentsCount = await prisma.judgment.count({
      where: {
        organizationId,
        championshipId: params.id,
        judgeId: refereeId,
      },
    });

    if (existingJudgmentsCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível remover: árbitro já possui julgamentos registrados' },
        { status: 409 },
      );
    }

    await prisma.championshipReferee.delete({
      where: { id: existing.id },
    });

    await logAuditAction(auth.id, auth.role, 'DELETE', organizationId, 'ChampionshipReferee', existing.id, {
      refereeId,
      championshipId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Remove referee error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
