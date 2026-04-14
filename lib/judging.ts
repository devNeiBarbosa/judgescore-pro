import { prisma } from '@/lib/prisma';

export const JUDGE_ROLES = ['ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL'] as const;

export class JudgmentValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function assertJudgeAssignedToChampionship(params: {
  organizationId: string;
  championshipId: string;
  judgeId: string;
}) {
  const assignment = await prisma.championshipReferee.findFirst({
    where: {
      organizationId: params.organizationId,
      championshipId: params.championshipId,
      refereeId: params.judgeId,
    },
    select: {
      id: true,
      championship: {
        select: {
          id: true,
          name: true,
          organizationId: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new JudgmentValidationError('Árbitro não está vinculado a este campeonato', 403);
  }

  return assignment;
}

export async function assertCategoryInChampionship(params: {
  organizationId: string;
  championshipId: string;
  categoryId: string;
}) {
  const category = await prisma.category.findFirst({
    where: {
      id: params.categoryId,
      championshipId: params.championshipId,
      organizationId: params.organizationId,
    },
    select: {
      id: true,
      name: true,
      championshipId: true,
      organizationId: true,
      status: true,
    },
  });

  if (!category) {
    throw new JudgmentValidationError('Categoria não encontrada para este campeonato', 404);
  }

  return category;
}

export async function listEligibleParticipations(params: {
  organizationId: string;
  championshipId: string;
  categoryId: string;
}) {
  return prisma.participation.findMany({
    where: {
      organizationId: params.organizationId,
      championshipId: params.championshipId,
      categoryId: params.categoryId,
      status: { not: 'DISQUALIFIED' },
    },
    select: {
      id: true,
      athleteNumber: true,
      athlete: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ athleteNumber: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getGlobalFinalizationStatus(params: {
  organizationId: string;
  championshipId: string;
  categoryId: string;
  participationIds: string[];
}) {
  const assignments = await prisma.championshipReferee.findMany({
    where: {
      organizationId: params.organizationId,
      championshipId: params.championshipId,
      referee: {
        role: { in: [...JUDGE_ROLES] },
      },
    },
    select: {
      refereeId: true,
      referee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      referee: { name: 'asc' },
    },
  });

  const judgments = params.participationIds.length
    ? await prisma.judgment.findMany({
        where: {
          organizationId: params.organizationId,
          championshipId: params.championshipId,
          categoryId: params.categoryId,
          participationId: { in: params.participationIds },
          judgeId: { in: assignments.map((item) => item.refereeId) },
        },
        select: {
          judgeId: true,
          participationId: true,
          finalized: true,
        },
      })
    : [];

  const requiredCount = params.participationIds.length;

  const statusByJudge = assignments.map((assignment) => {
    const judgeJudgments = judgments.filter((judgment) => judgment.judgeId === assignment.refereeId);
    const uniqueParticipationIds = new Set(judgeJudgments.map((judgment) => judgment.participationId));
    const hasAllRequired = uniqueParticipationIds.size === requiredCount;
    const isFinalized = requiredCount > 0 && hasAllRequired && judgeJudgments.every((judgment) => judgment.finalized);

    return {
      judgeId: assignment.referee.id,
      name: assignment.referee.name,
      email: assignment.referee.email,
      role: assignment.referee.role,
      completedJudgments: uniqueParticipationIds.size,
      totalRequiredJudgments: requiredCount,
      finalized: isFinalized,
    };
  });

  return {
    finalizedJudges: statusByJudge.filter((item) => item.finalized),
    pendingJudges: statusByJudge.filter((item) => !item.finalized),
    totalJudges: statusByJudge.length,
    totalRequiredJudgmentsPerJudge: requiredCount,
  };
}
