export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse, type AuthenticatedUser } from '@/lib/api-guard';
import { sanitizeInput } from '@/lib/validation';
import { tenantWhere } from '@/lib/tenant';
import { logAuditAction } from '@/lib/audit-log';

function resolveOrganizationIdFromContext(auth: AuthenticatedUser): string | NextResponse {
  if (auth.isSuperAdmin && !auth.actingOrganizationId) {
    return NextResponse.json(
      { error: 'SUPER_ADMIN precisa de impersonação ativa para editar/excluir categoria' },
      { status: 403 },
    );
  }

  if (!auth.actingOrganizationId) {
    return NextResponse.json({ error: 'Usuário sem organização ativa' }, { status: 403 });
  }

  return auth.actingOrganizationId;
}

async function ensureChampionshipInScope(auth: AuthenticatedUser, championshipId: string) {
  return prisma.championship.findFirst({
    where: tenantWhere(auth, 'organizationId', { id: championshipId }),
    select: { id: true, organizationId: true },
  });
}

async function ensureCategoryInScope(auth: AuthenticatedUser, championshipId: string, categoryId: string) {
  return prisma.category.findFirst({
    where: tenantWhere(auth, 'organizationId', {
      id: categoryId,
      championshipId,
    }),
    select: {
      id: true,
      name: true,
      description: true,
      organizationId: true,
      championshipId: true,
    },
  });
}

async function updateCategory(
  request: NextRequest,
  { params }: { params: { id: string; categoryId: string } },
) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const championship = await ensureChampionshipInScope(auth, params.id);
    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    if (championship.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Campeonato fora do contexto da organização ativa' }, { status: 403 });
    }

    const category = await ensureCategoryInScope(auth, params.id, params.categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada neste campeonato' }, { status: 404 });
    }

    const body = await request.json();

    const data: { name?: string; description?: string | null } = {};

    if (body?.name !== undefined) {
      if (typeof body.name !== 'string') {
        return NextResponse.json({ error: 'Campo name inválido' }, { status: 400 });
      }

      const name = sanitizeInput(body.name);
      if (!name || name.length < 2) {
        return NextResponse.json({ error: 'Nome da categoria é obrigatório (mín. 2 chars)' }, { status: 400 });
      }

      data.name = name;
    }

    if (body?.description !== undefined) {
      if (body.description !== null && typeof body.description !== 'string') {
        return NextResponse.json({ error: 'Campo description inválido' }, { status: 400 });
      }

      const description = body.description === null ? '' : sanitizeInput(body.description);
      data.description = description || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualização' }, { status: 400 });
    }

    if (data.name && data.name.toLowerCase() !== category.name.toLowerCase()) {
      const duplicated = await prisma.category.findFirst({
        where: {
          organizationId,
          championshipId: params.id,
          name: { equals: data.name, mode: 'insensitive' },
          NOT: { id: category.id },
        },
        select: { id: true },
      });

      if (duplicated) {
        return NextResponse.json({ error: 'Categoria com este nome já existe neste campeonato' }, { status: 409 });
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: category.id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        championshipId: true,
        organizationId: true,
        status: true,
        updatedAt: true,
      },
    });

    await logAuditAction(auth.id, auth.role, 'UPDATE', organizationId, 'Category', category.id, {
      championshipId: params.id,
      categoryId: category.id,
      previousName: category.name,
      nextName: updatedCategory.name,
      previousDescription: category.description,
      nextDescription: updatedCategory.description,
      updatedFields: Object.keys(data),
    });

    return NextResponse.json({ category: updatedCategory });
  } catch (error: unknown) {
    console.error('Update category error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string; categoryId: string } },
) {
  return updateCategory(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string; categoryId: string } },
) {
  return updateCategory(request, context);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; categoryId: string } },
) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const championship = await ensureChampionshipInScope(auth, params.id);
    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    if (championship.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Campeonato fora do contexto da organização ativa' }, { status: 403 });
    }

    const category = await ensureCategoryInScope(auth, params.id, params.categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada neste campeonato' }, { status: 404 });
    }

    const [judgmentsCount, categoryResultsCount] = await Promise.all([
      prisma.judgment.count({
        where: tenantWhere(auth, 'organizationId', {
          championshipId: params.id,
          categoryId: params.categoryId,
        }),
      }),
      prisma.categoryResult.count({
        where: tenantWhere(auth, 'organizationId', {
          championshipId: params.id,
          categoryId: params.categoryId,
        }),
      }),
    ]);

    if (judgmentsCount > 0 || categoryResultsCount > 0) {
      return NextResponse.json(
        {
          error:
            'Não é possível excluir esta categoria: existem julgamentos e/ou resultados de categoria vinculados. Remova os vínculos antes de excluir.',
        },
        { status: 409 },
      );
    }

    await prisma.category.delete({ where: { id: category.id } });

    await logAuditAction(auth.id, auth.role, 'DELETE', organizationId, 'Category', category.id, {
      championshipId: params.id,
      categoryId: category.id,
      categoryName: category.name,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete category error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
