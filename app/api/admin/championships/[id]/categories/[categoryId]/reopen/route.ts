export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { assertCategoryInChampionship, assertJudgeAssignedToChampionship } from '@/lib/judging';
import { recalculateCategoryStatus } from '@/lib/category-results';
import { resolveOrganizationIdForScope, ScopeResolutionError } from '@/lib/organization-scope';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; categoryId: string } },
) {
  const auth = await requireRole(request, ['ADMIN', 'ARBITRO_CENTRAL']);
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

    if (auth.role === 'ARBITRO_CENTRAL' && !auth.isSuperAdmin) {
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

    const body = await request.json();
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!reason) {
      return NextResponse.json({ error: 'Motivo da reabertura é obrigatório' }, { status: 400 });
    }

    const officialResult = await prisma.categoryResult.findFirst({
      where: {
        organizationId,
        championshipId: params.id,
        categoryId: params.categoryId,
        isOfficial: true,
        invalidatedAt: null,
      },
      select: {
        id: true,
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });

    if (!officialResult || category.status !== 'RESULT_FINALIZED') {
      return NextResponse.json(
        { error: 'Reabertura bloqueada: categoria não possui resultado oficial vigente para invalidar' },
        { status: 409 },
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.categoryResult.update({
        where: { id: officialResult.id },
        data: {
          isOfficial: false,
          invalidatedAt: now,
          invalidatedById: auth.id,
          invalidationReason: reason,
        },
      });

      await tx.judgment.updateMany({
        where: {
          organizationId,
          championshipId: params.id,
          categoryId: params.categoryId,
        },
        data: {
          finalized: false,
        },
      });

      await tx.category.update({
        where: { id: params.categoryId },
        data: {
          status: 'REOPENED',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CATEGORY_REOPENED',
          entityType: 'Category',
          entityId: params.categoryId,
          userId: auth.id,
          role: auth.role,
          organizationId,
          timestamp: new Date(),
          details: JSON.stringify({
            championshipId: params.id,
            categoryId: params.categoryId,
            invalidatedCategoryResultId: officialResult.id,
            reason,
          }),
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CATEGORY_RESULT_INVALIDATED',
          entityType: 'CategoryResult',
          entityId: officialResult.id,
          userId: auth.id,
          role: auth.role,
          organizationId,
          timestamp: now,
          details: JSON.stringify({
            championshipId: params.id,
            categoryId: params.categoryId,
            reason,
            invalidatedAt: now.toISOString(),
          }),
        },
      });
    });

    const categoryStatus = await recalculateCategoryStatus(params.categoryId, params.id, organizationId);
    return NextResponse.json({
      success: true,
      categoryId: params.categoryId,
      championshipId: params.id,
      categoryStatus,
      invalidatedResultId: officialResult.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const isNotAssigned = message.includes('não está vinculado');
    const isNotFound = message.includes('Categoria não encontrada');
    const isScopeError = error instanceof ScopeResolutionError;

    if (!isNotAssigned && !isNotFound && !isScopeError) {
      console.error('Reopen category error:', message);
    }

    return NextResponse.json(
      { error: message },
      { status: isScopeError ? error.status : isNotFound ? 404 : isNotAssigned ? 403 : 500 },
    );
  }
}