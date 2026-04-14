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
    const championship = await prisma.championship.findFirst({
      where: tenantWhere(auth, 'organizationId', { id: params.id }),
      include: {
        categories: {
          orderBy: { name: 'asc' },
          include: {
            categoryResults: {
              where: {
                organizationId: auth.actingOrganizationId ?? undefined,
                isOfficial: true,
                invalidatedAt: null,
              },
              select: {
                id: true,
                generatedAt: true,
              },
              orderBy: {
                generatedAt: 'desc',
              },
              take: 1,
            },
          },
        },
        referees: {
          include: { referee: { select: { id: true, name: true, email: true, role: true } } },
        },
        _count: { select: { participations: true, orders: true } },
      },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ championship });
  } catch (error: unknown) {
    console.error('Get championship error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const existing = await prisma.championship.findFirst({
      where: tenantWhere(auth, 'organizationId', { id: params.id }),
      select: { id: true, organizationId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = sanitizeInput(body.name);
    if (body.description !== undefined) data.description = sanitizeInput(body.description) || null;
    if (body.venue !== undefined) data.venue = sanitizeInput(body.venue) || null;
    if (body.city !== undefined) data.city = sanitizeInput(body.city) || null;
    if (body.state !== undefined) data.state = sanitizeInput(body.state) || null;
    if (body.status !== undefined) {
      const validStatuses = ['DRAFT', 'PUBLISHED', 'ONGOING', 'FINISHED'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
      }
      data.status = body.status;
    }
    if (body.date !== undefined) {
      const d = new Date(body.date);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
      data.date = d;
    }

    const championship = await prisma.championship.update({ where: { id: params.id }, data });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_CHAMPIONSHIP_UPDATED',
        championship.organizationId,
        'Championship',
        championship.id,
        {
          fields: Object.keys(data),
          crossOrganization: !auth.actingOrganizationId,
        },
      );
    }

    return NextResponse.json({ championship });
  } catch (error: unknown) {
    console.error('Update championship error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
