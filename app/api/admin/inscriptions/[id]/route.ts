export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { resolveOrganizationIdForScope, ScopeResolutionError } from '@/lib/organization-scope';

const CHECKIN_ROLES = ['ADMIN', 'ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL', 'SUPER_ADMIN'] as const;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [...CHECKIN_ROLES]);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = await resolveOrganizationIdForScope({
      user: auth,
      inscriptionId: params.id,
    });

    if (!organizationId) {
      return NextResponse.json({ error: 'Selecione uma organização para operar check-in' }, { status: 400 });
    }

    const inscription = await prisma.inscription.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      select: {
        id: true,
        status: true,
        baseRegistration: true,
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
        championship: {
          select: {
            id: true,
            name: true,
            date: true,
            status: true,
            organizationId: true,
          },
        },
        participations: {
          where: { organizationId },
          select: {
            id: true,
            status: true,
            createdAt: true,
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
    });

    if (!inscription) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ inscription });
  } catch (error: unknown) {
    if (error instanceof ScopeResolutionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Get inscription details error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
