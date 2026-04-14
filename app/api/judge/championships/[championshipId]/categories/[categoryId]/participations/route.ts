export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import {
  assertCategoryInChampionship,
  assertJudgeAssignedToChampionship,
  getGlobalFinalizationStatus,
  JUDGE_ROLES,
  listEligibleParticipations,
} from '@/lib/judging';

export async function GET(
  request: NextRequest,
  { params }: { params: { championshipId: string; categoryId: string } },
) {
  const auth = await requireRole(request, [...JUDGE_ROLES]);
  if (isErrorResponse(auth)) return auth;

  try {
    if (!auth.actingOrganizationId) {
      return NextResponse.json({ error: 'Organização ativa é obrigatória' }, { status: 400 });
    }

    await assertJudgeAssignedToChampionship({
      organizationId: auth.actingOrganizationId,
      championshipId: params.championshipId,
      judgeId: auth.id,
    });

    const category = await assertCategoryInChampionship({
      organizationId: auth.actingOrganizationId,
      championshipId: params.championshipId,
      categoryId: params.categoryId,
    });

    const participations = await listEligibleParticipations({
      organizationId: auth.actingOrganizationId,
      championshipId: params.championshipId,
      categoryId: params.categoryId,
    });

    const participationIds = participations.map((item) => item.id);

    const judgments = participationIds.length
      ? await prisma.judgment.findMany({
          where: {
            organizationId: auth.actingOrganizationId,
            championshipId: params.championshipId,
            categoryId: params.categoryId,
            judgeId: auth.id,
            participationId: { in: participationIds },
          },
          select: {
            id: true,
            participationId: true,
            position: true,
            finalized: true,
            updatedAt: true,
          },
        })
      : [];

    const judgmentByParticipation = new Map(judgments.map((item) => [item.participationId, item]));
    const usedPositions = judgments
      .map((item) => item.position)
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);

    const isFinalized =
      participationIds.length > 0 &&
      judgments.length === participationIds.length &&
      judgments.every((item) => item.finalized);

    const globalStatus = await getGlobalFinalizationStatus({
      organizationId: auth.actingOrganizationId,
      championshipId: params.championshipId,
      categoryId: params.categoryId,
      participationIds,
    });

    return NextResponse.json({
      category,
      finalized: isFinalized,
      usedPositions,
      participations: participations.map((participation) => ({
        id: participation.id,
        athleteNumber: participation.athleteNumber,
        athlete: participation.athlete,
        judgment: judgmentByParticipation.get(participation.id) ?? null,
      })),
      globalStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const isNotAssigned = message.includes('não está vinculado');
    const isNotFound = message.includes('Categoria não encontrada');

    if (!isNotAssigned && !isNotFound) {
      console.error('Judge category participations error:', message);
    }

    return NextResponse.json({ error: message }, { status: isNotFound ? 404 : isNotAssigned ? 403 : 500 });
  }
}
