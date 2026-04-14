export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import {
  assertCategoryInChampionship,
  assertJudgeAssignedToChampionship,
  getGlobalFinalizationStatus,
  JUDGE_ROLES,
} from '@/lib/judging';
import { recalculateCategoryStatus } from '@/lib/category-results';

export async function POST(
  request: NextRequest,
  { params }: { params: { championshipId: string; categoryId: string } },
) {
  const auth = await requireRole(request, [...JUDGE_ROLES]);
  if (isErrorResponse(auth)) return auth;

  try {
    if (!auth.actingOrganizationId) {
      return NextResponse.json({ error: 'Organização ativa é obrigatória' }, { status: 400 });
    }

    const organizationId = auth.actingOrganizationId;

    await assertJudgeAssignedToChampionship({
      organizationId,
      championshipId: params.championshipId,
      judgeId: auth.id,
    });

    await assertCategoryInChampionship({
      organizationId,
      championshipId: params.championshipId,
      categoryId: params.categoryId,
    });

    const participations = await prisma.participation.findMany({
      where: {
        organizationId,
        championshipId: params.championshipId,
        categoryId: params.categoryId,
        status: { not: 'DISQUALIFIED' },
      },
      select: { id: true },
    });

    if (participations.length === 0) {
      return NextResponse.json(
        { error: 'Não há atletas elegíveis para finalizar esta categoria' },
        { status: 400 },
      );
    }

    const participationIds = participations.map((item) => item.id);

    const judgments = await prisma.judgment.findMany({
      where: {
        organizationId,
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
      },
    });

    const judgedIds = new Set(judgments.map((item) => item.participationId));
    const missingParticipationIds = participationIds.filter((id) => !judgedIds.has(id));

    const seenPositions = new Set<number>();
    for (const judgment of judgments) {
      if (judgment.position === null) continue;
      if (seenPositions.has(judgment.position)) {
        return NextResponse.json(
          {
            error: `Finalize bloqueado: posição ${judgment.position} duplicada na categoria`,
          },
          { status: 409 },
        );
      }
      seenPositions.add(judgment.position);
    }

    await prisma.$transaction(async (tx) => {
      if (missingParticipationIds.length > 0) {
        await tx.judgment.createMany({
          data: missingParticipationIds.map((participationId) => ({
            organizationId,
            championshipId: params.championshipId,
            categoryId: params.categoryId,
            judgeId: auth.id,
            participationId,
            position: null,
            finalized: true,
          })),
          skipDuplicates: true,
        });
      }

      await tx.judgment.updateMany({
        where: {
          organizationId,
          championshipId: params.championshipId,
          categoryId: params.categoryId,
          judgeId: auth.id,
          participationId: { in: participationIds },
        },
        data: {
          finalized: true,
        },
      });
    });

    const globalStatus = await getGlobalFinalizationStatus({
      organizationId,
      championshipId: params.championshipId,
      categoryId: params.categoryId,
      participationIds,
    });

    const categoryStatus = await recalculateCategoryStatus(
      params.categoryId,
      params.championshipId,
      organizationId,
    );

    try {
      await prisma.auditLog.create({
        data: {
          action: 'JUDGMENT_FINALIZED',
          entityType: 'JudgmentCategoryFinalize',
          entityId: `${params.categoryId}:${auth.id}`,
          userId: auth.id,
          organizationId,
          details: JSON.stringify({
            championshipId: params.championshipId,
            categoryId: params.categoryId,
            judgeId: auth.id,
            participationsCount: participationIds.length,
          }),
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      finalizedByJudge: auth.id,
      categoryId: params.categoryId,
      championshipId: params.championshipId,
      globalStatus,
      categoryStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const isNotAssigned = message.includes('não está vinculado');
    const isNotFound = message.includes('Categoria não encontrada');

    if (!isNotAssigned && !isNotFound) {
      console.error('Finalize category error:', message);
    }

    return NextResponse.json({ error: message }, { status: isNotFound ? 404 : isNotAssigned ? 403 : 500 });
  }
}
