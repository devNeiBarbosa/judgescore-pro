export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { sanitizeInput } from '@/lib/validation';
import { slugify } from '@/lib/utils';
import { tenantWhere } from '@/lib/tenant';
import { logAuditAction } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const championships = await prisma.championship.findMany({
      where: auth.isSuperAdmin && !auth.actingOrganizationId ? {} : tenantWhere(auth),
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { categories: true, participations: true, orders: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ championships });
  } catch (error: unknown) {
    console.error('List championships error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();

    if (auth.isSuperAdmin && !auth.actingOrganizationId) {
      return NextResponse.json(
        { error: 'SUPER_ADMIN precisa selecionar uma organização via impersonação antes de criar campeonato' },
        { status: 400 },
      );
    }

    const organizationId = auth.actingOrganizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'Usuário sem organização vinculada para criar campeonato' }, { status: 403 });
    }

    const organization = (await prisma.organization.findUnique({
      where: { id: organizationId },
    })) as any;

    if (!organization) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    if (organization.billingStatus !== 'ACTIVE') {
      return NextResponse.json(
        {
          error:
            'Seu plano expirou ou está inativo. Você ainda pode acessar resultados antigos, PDFs e auditoria, mas não pode criar novos campeonatos.',
        },
        { status: 403 },
      );
    }

    if (organization.billingPlanType === 'MONTHLY' && organization.championshipsUsedInCycle >= 2) {
      return NextResponse.json(
        {
          error: 'Você atingiu o limite mensal de 2 campeonatos. Cancele um existente ou atualize seu plano.',
        },
        { status: 403 },
      );
    }

    const name = sanitizeInput(body?.name ?? '');
    const description = sanitizeInput(body?.description ?? '');
    const venue = sanitizeInput(body?.venue ?? '');
    const city = sanitizeInput(body?.city ?? '');
    const state = sanitizeInput(body?.state ?? '');
    const dateStr = (body?.date ?? '').trim();

    if (!name || name.length < 3) {
      return NextResponse.json({ error: 'Nome do campeonato é obrigatório (mín. 3 chars)' }, { status: 400 });
    }

    if (!dateStr) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }

    let slug = slugify(name);
    const existingSlug = await prisma.championship.findFirst({
      where: {
        organizationId,
        slug,
      },
      select: { id: true },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const championship = await prisma.championship.create({
      data: {
        name,
        slug,
        date,
        description: description || null,
        venue: venue || null,
        city: city || null,
        state: state || null,
        organizationId,
      },
    });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_CHAMPIONSHIP_CREATED',
        organizationId,
        'Championship',
        championship.id,
        {
          name,
          slug,
          actingOrganizationId: auth.actingOrganizationId,
          isImpersonating: auth.isImpersonating,
        },
      );
    }

    return NextResponse.json({ championship }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create championship error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
