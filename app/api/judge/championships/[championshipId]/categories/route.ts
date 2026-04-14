export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import {
  assertJudgeAssignedToChampionship,
  JUDGE_ROLES,
} from '@/lib/judging';

export async function GET(request: NextRequest, { params }: { params: { championshipId: string } }) {
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

    const categories = await prisma.category.findMany({
      where: {
        championshipId: params.championshipId,
        organizationId: auth.actingOrganizationId,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const categoryIds = categories.map((item) => item.id);

    const participations = categoryIds.length
      ? await prisma.participation.findMany({
          where: {
            organizationId: auth.actingOrganizationId,
            championshipId: params.championshipId,
            categoryId: { in: categoryIds },
            status: { not: 'DISQUALIFIED' },
          },
          select: {
            id: true,
            categoryId: true,
          },
        })
      : [];

    const participationsByCategory = participations.reduce<Record<string, string[]>>((acc, item) => {
      if (!item.categoryId) return acc;
      if (!acc[item.categoryId]) acc[item.categoryId] = [];
      acc[item.categoryId].push(item.id);
      return acc;
    }, {});

    const judgments = participations.length
      ? await prisma.judgment.findMany({
          where: {
            organizationId: auth.actingOrganizationId,
            championshipId: params.championshipId,
            judgeId: auth.id,
            categoryId: { in: categoryIds },
            participationId: { in: participations.map((item) => item.id) },
          },
          select: {
            categoryId: true,
            participationId: true,
            finalized: true,
          },
        })
      : [];

    const judgmentsByCategory = judgments.reduce<Record<string, Array<{ participationId: string; finalized: boolean }>>>((acc, item) => {
      if (!acc[item.categoryId]) acc[item.categoryId] = [];
      acc[item.categoryId].push({ participationId: item.participationId, finalized: item.finalized });
      return acc;
    }, {});

    const categoriesWithStatus = categories.map((category) => {
      const requiredParticipationIds = new Set(participationsByCategory[category.id] ?? []);
      const categoryJudgments = judgmentsByCategory[category.id] ?? [];
      const judgedParticipationIds = new Set(categoryJudgments.map((item) => item.participationId));
      const finalized =
        requiredParticipationIds.size > 0 &&
        judgedParticipationIds.size === requiredParticipationIds.size &&
        categoryJudgments.every((item) => item.finalized);

      return {
        ...category,
        requiredParticipations: requiredParticipationIds.size,
        completedJudgments: judgedParticipationIds.size,
        finalized,
      };
    });

    return NextResponse.json({ categories: categoriesWithStatus });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const isNotAssigned = message.includes('não está vinculado');

    if (!isNotAssigned) {
      console.error('Judge categories error:', message);
    }

    return NextResponse.json({ error: message }, { status: isNotAssigned ? 403 : 500 });
  }
}