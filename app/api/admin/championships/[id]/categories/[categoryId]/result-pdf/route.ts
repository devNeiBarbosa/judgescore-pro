export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { assertCategoryInChampionship, assertJudgeAssignedToChampionship } from '@/lib/judging';
import { parseCategoryOfficialSnapshot } from '@/lib/category-results';
import { generateOfficialCategoryResultPdf } from '@/lib/category-result-pdf';
import { resolveOrganizationIdForScope, ScopeResolutionError } from '@/lib/organization-scope';
import { logAuditAction } from '@/lib/audit-log';

export async function GET(
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

    await assertCategoryInChampionship({
      organizationId,
      championshipId: params.id,
      categoryId: params.categoryId,
    });

    const result = await prisma.categoryResult.findFirst({
      where: {
        organizationId,
        championshipId: params.id,
        categoryId: params.categoryId,
        isOfficial: true,
        invalidatedAt: null,
      },
      include: {
        championship: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'PDF indisponível: categoria sem resultado oficial vigente' }, { status: 409 });
    }

    const snapshot = parseCategoryOfficialSnapshot(result.resultData);
    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot oficial inválido para geração do PDF' }, { status: 500 });
    }

    const pdfBuffer = await generateOfficialCategoryResultPdf({
      championshipName: result.championship.name,
      categoryName: result.category.name,
      generatedAt: result.generatedAt,
      documentId: result.id,
      snapshot,
    });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_RESULT_PDF_GENERATED',
        organizationId,
        'CategoryResult',
        result.id,
        {
          championshipId: params.id,
          categoryId: params.categoryId,
          crossOrganization: !auth.actingOrganizationId,
        },
      );
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resultado-oficial-${params.categoryId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const isNotAssigned = message.includes('não está vinculado');
    const isNotFound = message.includes('Categoria não encontrada');
    const isScopeError = error instanceof ScopeResolutionError;

    if (!isNotAssigned && !isNotFound && !isScopeError) {
      console.error('Official result PDF error:', message);
    }

    return NextResponse.json(
      { error: message },
      { status: isScopeError ? error.status : isNotFound ? 404 : isNotAssigned ? 403 : 500 },
    );
  }
}
