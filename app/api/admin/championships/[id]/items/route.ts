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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const championship = await prisma.championship.findUnique({
      where: { id: params.id },
      select: { id: true, organizationId: true },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    if (championship.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Campeonato fora do contexto da organização ativa' }, { status: 403 });
    }

    const items = await prisma.championshipItem.findMany({
      where: {
        championshipId: params.id,
        organizationId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('List championship items error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const championship = await prisma.championship.findUnique({
      where: { id: params.id },
      select: { id: true, organizationId: true },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    if (championship.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Campeonato fora do contexto da organização ativa' }, { status: 403 });
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

    const name = sanitizeInput(body?.name ?? '');
    const description = sanitizeInput(body?.description ?? '');
    const imageUrl = sanitizeInput(body?.imageUrl ?? '');
    const priceInCents = parsePriceInCents(body?.price);

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Nome do item é obrigatório (mín. 2 chars)' }, { status: 400 });
    }

    if (priceInCents === null) {
      return NextResponse.json({ error: 'Preço inválido: use inteiro em centavos (>= 0)' }, { status: 400 });
    }

    const item = await prisma.championshipItem.create({
      data: {
        championshipId: params.id,
        organizationId,
        name,
        priceInCents,
        description: description || null,
        imageUrl: imageUrl || null,
      },
    });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_CHAMPIONSHIP_ITEM_CREATED',
        organizationId,
        'ChampionshipItem',
        item.id,
        {
          championshipId: params.id,
          actingOrganizationId: auth.actingOrganizationId,
          isImpersonating: auth.isImpersonating,
          name,
        },
      );
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create championship item error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

