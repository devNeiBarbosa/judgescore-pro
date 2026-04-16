export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse, type AuthenticatedUser } from '@/lib/api-guard';
import { sanitizeInput } from '@/lib/validation';
import { logAuditAction } from '@/lib/audit-log';

function parsePriceInCents(raw: unknown): number | null {
  const numeric = typeof raw === 'number' ? raw : Number(raw);

  if (!Number.isInteger(numeric) || numeric < 0) {
    return null;
  }

  return numeric;
}

function resolveOrganizationIdFromContext(auth: AuthenticatedUser): string | NextResponse {
  if (auth.isSuperAdmin && !auth.actingOrganizationId) {
    return NextResponse.json(
      { error: 'SUPER_ADMIN precisa de impersonação ativa para operar itens de campeonato' },
      { status: 403 },
    );
  }

  if (!auth.actingOrganizationId) {
    return NextResponse.json({ error: 'Usuário sem organização vinculada' }, { status: 403 });
  }

  return auth.actingOrganizationId;
}

type ScopeResolution =
  | {
      status: 'ok';
      championship: { id: string; organizationId: string };
      item: { id: string; championshipId: string; organizationId: string };
    }
  | { status: 'championship_not_found' }
  | { status: 'championship_out_of_context' }
  | { status: 'item_not_found' }
  | { status: 'item_out_of_context' };

async function resolveChampionshipAndItemScope(
  organizationId: string,
  championshipId: string,
  itemId: string,
): Promise<ScopeResolution> {
  const championship = await prisma.championship.findUnique({
    where: { id: championshipId },
    select: { id: true, organizationId: true },
  });

  if (!championship) {
    return { status: 'championship_not_found' };
  }

  if (championship.organizationId !== organizationId) {
    return { status: 'championship_out_of_context' };
  }

  const item = await prisma.championshipItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      championshipId: true,
      organizationId: true,
    },
  });

  if (!item) {
    return { status: 'item_not_found' };
  }

  if (item.organizationId !== organizationId || item.championshipId !== championship.id) {
    return { status: 'item_out_of_context' };
  }

  return {
    status: 'ok',
    championship,
    item,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const scope = await resolveChampionshipAndItemScope(organizationId, params.id, params.itemId);

    if (scope.status === 'championship_not_found') {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    if (scope.status === 'championship_out_of_context') {
      return NextResponse.json({ error: 'Campeonato fora do contexto da organização ativa' }, { status: 403 });
    }

    if (scope.status === 'item_not_found') {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    if (scope.status === 'item_out_of_context') {
      return NextResponse.json({ error: 'Item fora do contexto do campeonato/organização ativa' }, { status: 403 });
    }

    const body = await request.json();

    const payloadChampionshipId = typeof body?.championshipId === 'string' ? body.championshipId.trim() : '';
    if (payloadChampionshipId && payloadChampionshipId !== params.id) {
      return NextResponse.json({ error: 'championshipId do payload não corresponde à rota' }, { status: 400 });
    }

    const payloadOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : '';
    if (payloadOrganizationId && payloadOrganizationId !== organizationId) {
      return NextResponse.json({ error: 'organizationId do payload não corresponde ao contexto ativo' }, { status: 403 });
    }

    const data: {
      name?: string;
      priceInCents?: number;
      description?: string | null;
      imageUrl?: string | null;
      isActive?: boolean;
    } = {};

    if (body?.name !== undefined) {
      const name = sanitizeInput(body.name ?? '');
      if (!name || name.length < 2) {
        return NextResponse.json({ error: 'Nome do item é obrigatório (mín. 2 chars)' }, { status: 400 });
      }
      data.name = name;
    }

    if (body?.price !== undefined) {
      const priceInCents = parsePriceInCents(body.price);
      if (priceInCents === null) {
        return NextResponse.json({ error: 'Preço inválido: use inteiro em centavos (>= 0)' }, { status: 400 });
      }
      data.priceInCents = priceInCents;
    }

    if (body?.description !== undefined) {
      const description = sanitizeInput(body.description ?? '');
      data.description = description || null;
    }

    if (body?.imageUrl !== undefined) {
      const imageUrl = sanitizeInput(body.imageUrl ?? '');
      data.imageUrl = imageUrl || null;
    }

    if (body?.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive deve ser boolean' }, { status: 400 });
      }
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado para atualização' }, { status: 400 });
    }

    const item = await prisma.championshipItem.update({
      where: { id: scope.item.id },
      data,
    });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_CHAMPIONSHIP_ITEM_UPDATED',
        organizationId,
        'ChampionshipItem',
        scope.item.id,
        {
          championshipId: params.id,
          actingOrganizationId: auth.actingOrganizationId,
          isImpersonating: auth.isImpersonating,
          changedFields: Object.keys(data),
        },
      );
    }

    return NextResponse.json({ item });
  } catch (error: unknown) {
    console.error('Update championship item error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const scope = await resolveChampionshipAndItemScope(organizationId, params.id, params.itemId);

    if (scope.status === 'championship_not_found') {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    if (scope.status === 'championship_out_of_context') {
      return NextResponse.json({ error: 'Campeonato fora do contexto da organização ativa' }, { status: 403 });
    }

    if (scope.status === 'item_not_found') {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    if (scope.status === 'item_out_of_context') {
      return NextResponse.json({ error: 'Item fora do contexto do campeonato/organização ativa' }, { status: 403 });
    }

    await prisma.championshipItem.delete({
      where: { id: scope.item.id },
    });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_CHAMPIONSHIP_ITEM_DELETED',
        organizationId,
        'ChampionshipItem',
        scope.item.id,
        {
          championshipId: params.id,
          actingOrganizationId: auth.actingOrganizationId,
          isImpersonating: auth.isImpersonating,
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete championship item error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

