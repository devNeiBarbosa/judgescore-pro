export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import {
  assertCategoryInChampionship,
  assertJudgeAssignedToChampionship,
  JUDGE_ROLES,
  JudgmentValidationError,
} from '@/lib/judging';
import { recalculateCategoryStatus } from '@/lib/category-results';

function parsePosition(position: unknown): number | null {
  if (position === null || position === undefined || position === '') {
    return null;
  }

  const numeric = Number(position);

  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 10) {
    throw new JudgmentValidationError('Posição deve ser um inteiro entre 1 e 10 ou null', 400);
  }

  return numeric;
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [...JUDGE_ROLES]);
  if (isErrorResponse(auth)) return auth;

  try {
    if (!auth.actingOrganizationId) {
      return NextResponse.json({ error: 'Organização ativa é obrigatória' }, { status: 400 });
    }

    const body = await request.json();

    const championshipId = typeof body?.championshipId === 'string' ? body.championshipId.trim() : '';
    const categoryId = typeof body?.categoryId === 'string' ? body.categoryId.trim() : '';
    const participationId = typeof body?.participationId === 'string' ? body.participationId.trim() : '';

    if (!championshipId || !categoryId || !participationId) {
      return NextResponse.json(
        { error: 'championshipId, categoryId e participationId são obrigatórios' },
        { status: 400 },
      );
    }

    const position = parsePosition(body?.position);

    await assertJudgeAssignedToChampionship({
      organizationId: auth.actingOrganizationId,
      championshipId,
      judgeId: auth.id,
    });

    const category = await assertCategoryInChampionship({
      organizationId: auth.actingOrganizationId,
      championshipId,
      categoryId,
    });


    if (category.status === 'RESULT_FINALIZED') {
      return NextResponse.json(
        { error: 'Categoria com resultado oficial finalizado. Reabra a categoria para editar julgamentos.' },
        { status: 409 },
      );
    }
    const participation = await prisma.participation.findFirst({
      where: {
        id: participationId,
        organizationId: auth.actingOrganizationId,
        championshipId,
        categoryId,
        status: { not: 'DISQUALIFIED' },
      },
      select: {
        id: true,
      },
    });

    if (!participation) {
      return NextResponse.json(
        { error: 'Participação não encontrada para a categoria/campeonato atual' },
        { status: 404 },
      );
    }

    const categoryAlreadyFinalized = await prisma.judgment.findFirst({
      where: {
        organizationId: auth.actingOrganizationId,
        championshipId,
        categoryId,
        judgeId: auth.id,
        finalized: true,
      },
      select: { id: true },
    });

    if (categoryAlreadyFinalized) {
      return NextResponse.json(
        { error: 'Categoria já foi finalizada por este árbitro. Edição bloqueada.' },
        { status: 409 },
      );
    }

    if (position !== null) {
      const conflictingPosition = await prisma.judgment.findFirst({
        where: {
          organizationId: auth.actingOrganizationId,
          championshipId,
          categoryId,
          judgeId: auth.id,
          position,
          participationId: { not: participationId },
        },
        select: {
          id: true,
          participationId: true,
        },
      });

      if (conflictingPosition) {
        return NextResponse.json(
          { error: `Posição ${position} já foi utilizada nesta categoria por este árbitro` },
          { status: 409 },
        );
      }
    }

    const existing = await prisma.judgment.findUnique({
      where: {
        judgeId_participationId: {
          judgeId: auth.id,
          participationId,
        },
      },
      select: {
        id: true,
        finalized: true,
      },
    });

    if (existing?.finalized) {
      return NextResponse.json({ error: 'Julgamento já finalizado e não pode ser alterado' }, { status: 409 });
    }

    const judgment = await prisma.judgment.upsert({
      where: {
        judgeId_participationId: {
          judgeId: auth.id,
          participationId,
        },
      },
      update: {
        position,
      },
      create: {
        participationId,
        judgeId: auth.id,
        championshipId,
        categoryId,
        organizationId: auth.actingOrganizationId,
        position,
      },
      select: {
        id: true,
        participationId: true,
        position: true,
        finalized: true,
        updatedAt: true,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          action: 'JUDGMENT_SUBMITTED',
          entityType: 'Judgment',
          entityId: judgment.id,
          userId: auth.id,
          organizationId: auth.actingOrganizationId,
          details: JSON.stringify({
            championshipId,
            categoryId,
            participationId,
            position,
          }),
        },
      });
    } catch {
      // non-blocking
    }

    const categoryStatus = await recalculateCategoryStatus(
      categoryId,
      championshipId,
      auth.actingOrganizationId,
    );

    return NextResponse.json({ judgment, categoryStatus });
  } catch (error: unknown) {
    if (error instanceof JudgmentValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        {
          error:
            'Violação de unicidade: posição duplicada na categoria ou avaliação duplicada do mesmo atleta',
        },
        { status: 409 },
      );
    }

    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('Save judgment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}