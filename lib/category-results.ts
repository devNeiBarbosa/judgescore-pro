import { CategoryStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { JUDGE_ROLES, getGlobalFinalizationStatus, listEligibleParticipations } from '@/lib/judging';

export type OfficialTop10Row = {
  participationId: string;
  athleteNumber: number | null;
  athleteName: string;
  totalScore: number;
  finalPosition: number;
  tie: boolean;
};

export type OfficialOtherRow = {
  participationId: string;
  athleteNumber: number | null;
  athleteName: string;
  classificationLabel: 'SEM CLASSIFICACAO';
};

export type CategoryOfficialSnapshot = {
  championshipId: string;
  categoryId: string;
  generatedAt: string;
  criteria: 'SOMA_POSICOES_MENOR_VENCE';
  tiePolicy: 'EMPATE_IDENTIFICADO_SEM_DESEMPATE_AUTOMATICO';
  top10: OfficialTop10Row[];
  others: OfficialOtherRow[];
  metadata: {
    eligibleAthletes: number;
    classifiedAthletes: number;
    judgesCount: number;
  };
};

type ComputeSnapshotParams = {
  championshipId: string;
  categoryId: string;
  generatedAt: Date;
  judgesCount: number;
  participations: Array<{
    id: string;
    athleteNumber: number | null;
    athlete: {
      name: string;
    };
  }>;
  judgments: Array<{
    participationId: string;
    position: number | null;
  }>;
};

type CalculateCategoryRankingParams = {
  participations: ComputeSnapshotParams['participations'];
  judgments: ComputeSnapshotParams['judgments'];
};

export type CategoryRankingCalculation = {
  fullRanking: OfficialTop10Row[];
  top10: OfficialTop10Row[];
  others: OfficialOtherRow[];
};

function isValidRankingPosition(position: number | null): position is number {
  return typeof position === 'number' && Number.isInteger(position) && position >= 1 && position <= 10;
}

export function calculateCategoryRanking(params: CalculateCategoryRankingParams): CategoryRankingCalculation {
  const scoreMap = new Map<
    string,
    {
      participationId: string;
      athleteNumber: number | null;
      athleteName: string;
      totalScore: number;
      receivedPositions: number;
    }
  >();

  for (const participation of params.participations) {
    scoreMap.set(participation.id, {
      participationId: participation.id,
      athleteNumber: participation.athleteNumber,
      athleteName: participation.athlete.name,
      totalScore: 0,
      receivedPositions: 0,
    });
  }

  for (const judgment of params.judgments) {
    if (!isValidRankingPosition(judgment.position)) continue;

    const row = scoreMap.get(judgment.participationId);
    if (!row) continue;

    row.totalScore += judgment.position;
    row.receivedPositions += 1;
  }

  const classified = Array.from(scoreMap.values())
    .filter((row) => row.receivedPositions > 0)
    .sort((a, b) => a.totalScore - b.totalScore || (a.athleteNumber ?? 999999) - (b.athleteNumber ?? 999999));

  const frequencyByScore = classified.reduce<Record<number, number>>((acc, item) => {
    acc[item.totalScore] = (acc[item.totalScore] ?? 0) + 1;
    return acc;
  }, {});

  let lastScore: number | null = null;
  let lastPosition = 0;

  const fullRanking: OfficialTop10Row[] = classified.map((item, index) => {
    const finalPosition = lastScore === item.totalScore ? lastPosition : index + 1;
    lastScore = item.totalScore;
    lastPosition = finalPosition;

    return {
      participationId: item.participationId,
      athleteNumber: item.athleteNumber,
      athleteName: item.athleteName,
      totalScore: item.totalScore,
      finalPosition,
      tie: (frequencyByScore[item.totalScore] ?? 0) > 1,
    };
  });

  const top10 = fullRanking.slice(0, 10);
  const top10Ids = new Set(top10.map((row) => row.participationId));

  const others: OfficialOtherRow[] = params.participations
    .filter((participation) => !top10Ids.has(participation.id))
    .map((participation) => ({
      participationId: participation.id,
      athleteNumber: participation.athleteNumber,
      athleteName: participation.athlete.name,
      classificationLabel: 'SEM CLASSIFICACAO' as const,
    }))
    .sort((a, b) => (a.athleteNumber ?? 999999) - (b.athleteNumber ?? 999999));

  return {
    fullRanking,
    top10,
    others,
  };
}

export function computeCategoryOfficialSnapshot(params: ComputeSnapshotParams): CategoryOfficialSnapshot {
  const ranking = calculateCategoryRanking({
    participations: params.participations,
    judgments: params.judgments,
  });

  return {
    championshipId: params.championshipId,
    categoryId: params.categoryId,
    generatedAt: params.generatedAt.toISOString(),
    criteria: 'SOMA_POSICOES_MENOR_VENCE',
    tiePolicy: 'EMPATE_IDENTIFICADO_SEM_DESEMPATE_AUTOMATICO',
    top10: ranking.top10,
    others: ranking.others,
    metadata: {
      eligibleAthletes: params.participations.length,
      classifiedAthletes: ranking.fullRanking.length,
      judgesCount: params.judgesCount,
    },
  };
}

export function toPrismaResultData(snapshot: CategoryOfficialSnapshot): Prisma.InputJsonValue {
  return snapshot as unknown as Prisma.InputJsonValue;
}

export function parseCategoryOfficialSnapshot(raw: Prisma.JsonValue): CategoryOfficialSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Partial<CategoryOfficialSnapshot>;
  if (!Array.isArray(data.top10) || !Array.isArray(data.others)) return null;

  return {
    championshipId: String(data.championshipId ?? ''),
    categoryId: String(data.categoryId ?? ''),
    generatedAt: String(data.generatedAt ?? ''),
    criteria: 'SOMA_POSICOES_MENOR_VENCE',
    tiePolicy: 'EMPATE_IDENTIFICADO_SEM_DESEMPATE_AUTOMATICO',
    top10: data.top10.map((row) => ({
      participationId: String((row as OfficialTop10Row).participationId ?? ''),
      athleteNumber: typeof (row as OfficialTop10Row).athleteNumber === 'number' ? (row as OfficialTop10Row).athleteNumber : null,
      athleteName: String((row as OfficialTop10Row).athleteName ?? ''),
      totalScore: Number((row as OfficialTop10Row).totalScore ?? 0),
      finalPosition: Number((row as OfficialTop10Row).finalPosition ?? 0),
      tie: Boolean((row as OfficialTop10Row).tie),
    })),
    others: data.others.map((row) => ({
      participationId: String((row as OfficialOtherRow).participationId ?? ''),
      athleteNumber: typeof (row as OfficialOtherRow).athleteNumber === 'number' ? (row as OfficialOtherRow).athleteNumber : null,
      athleteName: String((row as OfficialOtherRow).athleteName ?? ''),
      classificationLabel: 'SEM CLASSIFICACAO' as const,
    })),
    metadata: {
      eligibleAthletes: Number(data.metadata?.eligibleAthletes ?? 0),
      classifiedAthletes: Number(data.metadata?.classifiedAthletes ?? 0),
      judgesCount: Number(data.metadata?.judgesCount ?? 0),
    },
  };
}

export async function recalculateCategoryStatus(
  categoryId: string,
  championshipId: string,
  organizationId: string,
): Promise<CategoryStatus> {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      championshipId,
      organizationId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!category) {
    throw new Error('Categoria não encontrada para este campeonato');
  }

  if (category.status === 'RESULT_FINALIZED') {
    return category.status;
  }

  const participations = await listEligibleParticipations({
    organizationId,
    championshipId,
    categoryId,
  });

  const participationIds = participations.map((item) => item.id);

  const assignedJudges = await prisma.championshipReferee.count({
    where: {
      organizationId,
      championshipId,
      referee: {
        role: { in: [...JUDGE_ROLES] },
      },
    },
  });

  const globalStatus = await getGlobalFinalizationStatus({
    organizationId,
    championshipId,
    categoryId,
    participationIds,
  });

  const allJudgesFinalized = assignedJudges > 0 && globalStatus.pendingJudges.length === 0;

  const nextStatus: CategoryStatus = allJudgesFinalized
    ? 'ALL_JUDGES_FINALIZED'
    : category.status === 'REOPENED'
      ? 'REOPENED'
      : 'OPEN_FOR_JUDGING';

  if (nextStatus !== category.status) {
    await prisma.category.updateMany({
      where: {
        id: categoryId,
        championshipId,
        organizationId,
      },
      data: {
        status: nextStatus,
      },
    });
  }

  return nextStatus;
}
