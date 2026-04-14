export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import {
  assertCategoryInChampionship,
  getGlobalFinalizationStatus,
  listEligibleParticipations,
} from '@/lib/judging';
import { calculateCategoryRanking } from '@/lib/category-results';
import { resolveOrganizationIdForScope, ScopeResolutionError } from '@/lib/organization-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; categoryId: string } },
) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
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

    await assertCategoryInChampionship({
      organizationId,
      championshipId: params.id,
      categoryId: params.categoryId,
    });

    const participations = await listEligibleParticipations({
      organizationId,
      championshipId: params.id,
      categoryId: params.categoryId,
    });

    const participationIds = participations.map((item) => item.id);

    const globalStatus = await getGlobalFinalizationStatus({
      organizationId,
      championshipId: params.id,
      categoryId: params.categoryId,
      participationIds,
    });

    if (participationIds.length === 0) {
      return NextResponse.json({
        ranking: [],
        top10: [],
        nonClassified: [],
        globalStatus,
      });
    }

    if (globalStatus.pendingJudges.length > 0 && !auth.isSuperAdmin) {
      return NextResponse.json(
        {
          error: 'Resultado bloqueado: ainda existem árbitros pendentes de finalização',
          globalStatus,
        },
        { status: 409 },
      );
    }

    const judgments = await prisma.judgment.findMany({
      where: {
        organizationId,
        championshipId: params.id,
        categoryId: params.categoryId,
        participationId: { in: participationIds },
      },
      select: {
        participationId: true,
        position: true,
      },
    });

    const rankingCalculation = calculateCategoryRanking({ participations, judgments });

    return NextResponse.json({
      ranking: rankingCalculation.fullRanking,
      top10: rankingCalculation.top10,
      nonClassified: rankingCalculation.others,
      globalStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const knownValidation = message.includes('Categoria não encontrada');
    const isScopeError = error instanceof ScopeResolutionError;

    if (!knownValidation && !isScopeError) {
      console.error('Calculate result error:', message);
    }

    return NextResponse.json({ error: message }, { status: isScopeError ? error.status : knownValidation ? 404 : 500 });
  }
}
