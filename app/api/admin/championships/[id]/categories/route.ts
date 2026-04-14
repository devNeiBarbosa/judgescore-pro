export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { sanitizeInput } from '@/lib/validation';
import { tenantWhere } from '@/lib/tenant';
import { logAuditAction } from '@/lib/audit-log';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const categories = await prisma.category.findMany({
      where: tenantWhere(auth, 'organizationId', { championshipId: params.id }),
      include: { _count: { select: { categoryRegistrations: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error: unknown) {
    console.error('List categories error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const championship = await prisma.championship.findFirst({
      where: tenantWhere(auth, 'organizationId', { id: params.id }),
      select: { id: true, organizationId: true },
    });
    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const name = sanitizeInput(body?.name ?? '');
    const description = sanitizeInput(body?.description ?? '');
    const payloadChampionshipId = typeof body?.championshipId === 'string' ? body.championshipId.trim() : '';

    if (payloadChampionshipId && payloadChampionshipId !== params.id) {
      return NextResponse.json({ error: 'championshipId do payload não corresponde à rota' }, { status: 400 });
    }

    if (auth.actingOrganizationId && championship.organizationId !== auth.actingOrganizationId) {
      return NextResponse.json({ error: 'Campeonato pertence a outra organização' }, { status: 403 });
    }

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório (mín. 2 chars)' }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: {
        organizationId: championship.organizationId,
        championshipId: params.id,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Categoria com este nome já existe neste campeonato' }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || null,
        championshipId: params.id,
        organizationId: championship.organizationId,
      },
    });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_CATEGORY_CREATED',
        championship.organizationId,
        'Category',
        category.id,
        {
          name,
          championshipId: params.id,
          crossOrganization: !auth.actingOrganizationId,
        },
      );
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create category error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
