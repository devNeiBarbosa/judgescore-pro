export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const athleteId = typeof body?.athleteId === 'string' ? body.athleteId.trim() : '';
    const championshipId = typeof body?.championshipId === 'string' ? body.championshipId.trim() : '';

    if (!athleteId || !championshipId) {
      return NextResponse.json({ error: 'athleteId e championshipId são obrigatórios' }, { status: 400 });
    }

    const championship = await prisma.championship.findUnique({
      where: { id: championshipId },
      select: { id: true, organizationId: true },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    const championshipOrgId = championship.organizationId;

    if (!auth.isSuperAdmin && auth.actingOrganizationId !== championshipOrgId) {
      return NextResponse.json({ error: 'Organization mismatch' }, { status: 403 });
    }

    const athlete = await prisma.user.findFirst({
      where: {
        id: athleteId,
        organizationId: championshipOrgId,
        role: 'ATLETA',
      },
      select: { id: true },
    });

    if (!athlete) {
      return NextResponse.json({ error: 'Atleta inválido para esta organização' }, { status: 400 });
    }

    const participation = await prisma.participation.create({
      data: {
        athleteId,
        championshipId,
        organizationId: championshipOrgId,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          action: 'PARTICIPATION_CREATED',
          entityType: 'Participation',
          entityId: participation.id,
          userId: auth.id,
          organizationId: championshipOrgId,
          details: JSON.stringify({ athleteId, championshipId }),
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({ participation }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create participation error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}