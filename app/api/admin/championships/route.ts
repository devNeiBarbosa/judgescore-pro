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
      where: tenantWhere(auth),
      include: {
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
    const requestedOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : '';
    const organizationId = auth.actingOrganizationId ?? (auth.isSuperAdmin ? requestedOrganizationId : null);

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Selecione uma organização para criar campeonato' },
        { status: 400 },
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
          crossOrganization: !auth.actingOrganizationId,
          requestedOrganizationId,
        },
      );
    }

    return NextResponse.json({ championship }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create championship error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
