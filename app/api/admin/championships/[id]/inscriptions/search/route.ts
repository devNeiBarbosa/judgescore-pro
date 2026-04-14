export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { sanitizeInput } from '@/lib/validation';
import { resolveOrganizationIdForScope, ScopeResolutionError } from '@/lib/organization-scope';

const CHECKIN_ROLES = ['ADMIN', 'ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL', 'SUPER_ADMIN'] as const;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [...CHECKIN_ROLES]);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = await resolveOrganizationIdForScope({
      user: auth,
      championshipId: params.id,
    });

    if (!organizationId) {
      return NextResponse.json({ error: 'Selecione uma organização para operar check-in' }, { status: 400 });
    }

    const championship = await prisma.championship.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      select: { id: true },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    const query = sanitizeInput(request.nextUrl.searchParams.get('q') ?? '');
    if (!query) {
      return NextResponse.json({ inscriptions: [] });
    }

    const whereByQuery = {
      OR: [
        { id: query },
        { athlete: { cpf: { contains: query, mode: 'insensitive' as const } } },
        { athlete: { name: { contains: query, mode: 'insensitive' as const } } },
        { athlete: { email: { contains: query, mode: 'insensitive' as const } } },
      ],
    };

    const inscriptions = await prisma.inscription.findMany({
      where: {
        organizationId,
        championshipId: params.id,
        ...whereByQuery,
      },
      select: {
        id: true,
        status: true,
        extraCategories: true,
        totalCategoriesAllowed: true,
        painting: true,
        photos: true,
        weight: true,
        height: true,
        athleteNumber: true,
        checkedInAt: true,
        createdAt: true,
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
          },
        },
        participations: {
          where: { organizationId },
          select: {
            id: true,
            status: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 30,
    });

    return NextResponse.json({ inscriptions });
  } catch (error: unknown) {
    if (error instanceof ScopeResolutionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Search inscriptions for check-in error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
