export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import {
  assertCategoryInChampionship,
  assertJudgeAssignedToChampionship,
  getGlobalFinalizationStatus,
  listEligibleParticipations,
} from '@/lib/judging';
import { computeCategoryOfficialSnapshot, toPrismaResultData } from '@/lib/category-results';
import { resolveOrganizationIdForScope, ScopeResolutionError } from '@/lib/organization-scope';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; categoryId: string } },
) {
  const auth = await requireRole(request, ['ARBITRO_CENTRAL']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = await resolveOrganizationIdForScope({
      user: auth,
      championshipId: params.id,
      categoryId: params.categoryId,
    });

    if (!organizationId) {
      return NextResponse.json({ error: 'Organização ativa é obrigatória' }, { status: 400 });
    }

    if (!auth.isSuperAdmin) {
      await assertJudgeAssignedToChampionship({
        organizationId,
        championshipId: params.id,
        judgeId: auth.id,
      });
    }

    const category = await assertCategoryInChampionship({
      organizationId,
      championshipId: params.id,
      categoryId: params.categoryId,
    });

    if (category.status === 'RESULT_FINALIZED') {
      return NextResponse.json({ error: 'Categoria já possui resultado oficial vigente' }, { status: 409 });
    }

    const participations = await listEligibleParticipations({
      organizationId,
      championshipId: params.id,
      categoryId: params.categoryId,
    });

    if (participations.length === 0) {
      return NextResponse.json({ error: 'Não há atletas elegíveis para gerar resultado oficial' }, { status: 400 });
    }

    const participationIds = participations.map((item) => item.id);

    const globalStatus = await getGlobalFinalizationStatus({
      organizationId,
      championshipId: params.id,
      categoryId: params.categoryId,
      participationIds,
    });

    if (globalStatus.pendingJudges.length > 0 && !auth.isSuperAdmin) {
      return NextResponse.json(
        {
          error: 'Resultado oficial bloqueado: ainda existem árbitros pendentes de finalização',
          globalStatus,
        },
        { status: 409 },
      );
    }

    const judgeIds = [
      ...globalStatus.finalizedJudges.map((judge) => judge.judgeId),
      ...globalStatus.pendingJudges.map((judge) => judge.judgeId),
    ];

    const judgments = await prisma.judgment.findMany({
      where: {
        organizationId,
        championshipId: params.id,
        categoryId: params.categoryId,
        participationId: { in: participationIds },
        judgeId: judgeIds.length ? { in: judgeIds } : undefined,
      },
      select: {
        participationId: true,
        position: true,
      },
    });

    const generatedAt = new Date();

    const snapshot = computeCategoryOfficialSnapshot({
      championshipId: params.id,
      categoryId: params.categoryId,
      generatedAt,
      judgesCount: globalStatus.totalJudges,
      participations,
      judgments,
    });

    const createdResult = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`category_result_finalize:${params.categoryId}`}))`;

      const currentOfficial = await tx.categoryResult.findFirst({
        where: {
          organizationId,
          championshipId: params.id,
          categoryId: params.categoryId,
          isOfficial: true,
          invalidatedAt: null,
        },
        select: { id: true },
      });

      if (currentOfficial) {
        throw new Error('OFFICIAL_RESULT_ALREADY_EXISTS');
      }

      const result = await tx.categoryResult.create({
        data: {
          organizationId,
          championshipId: params.id,
          categoryId: params.categoryId,
          generatedById: auth.id,
          generatedAt,
          isOfficial: true,
          resultData: toPrismaResultData(snapshot),
        },
        select: {
          id: true,
          generatedAt: true,
          isOfficial: true,
        },
      });

      await tx.category.update({
        where: { id: params.categoryId },
        data: { status: 'RESULT_FINALIZED' },
      });

      await tx.auditLog.create({
        data: {
          action: 'CATEGORY_RESULT_FINALIZED',
          entityType: 'CategoryResult',
          entityId: result.id,
          userId: auth.id,
          role: auth.role,
          organizationId,
          timestamp: generatedAt,
          details: JSON.stringify({
            championshipId: params.id,
            categoryId: params.categoryId,
            top10Count: snapshot.top10.length,
            othersCount: snapshot.others.length,
            judgesCount: snapshot.metadata.judgesCount,
          }),
        },
      });

      return result;
    });

    return NextResponse.json({
      success: true,
      categoryResultId: createdResult.id,
      generatedAt: createdResult.generatedAt,
      isOfficial: createdResult.isOfficial,
      categoryStatus: 'RESULT_FINALIZED',
      snapshot,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const isNotAssigned = message.includes('não está vinculado');
    const isNotFound = message.includes('Categoria não encontrada');
    const isAlreadyOfficial = message === 'OFFICIAL_RESULT_ALREADY_EXISTS';
    const isScopeError = error instanceof ScopeResolutionError;

    if (!isNotAssigned && !isNotFound && !isAlreadyOfficial && !isScopeError) {
      console.error('Finalize official result error:', message);
    }

    return NextResponse.json(
      { error: isAlreadyOfficial ? 'Já existe resultado oficial vigente para esta categoria' : message },
      { status: isScopeError ? error.status : isNotFound ? 404 : isNotAssigned ? 403 : isAlreadyOfficial ? 409 : 500 },
    );
  }
}