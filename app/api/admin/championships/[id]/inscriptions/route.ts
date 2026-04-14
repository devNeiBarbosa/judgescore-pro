export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { resolveOrganizationIdForScope, ScopeResolutionError } from '@/lib/organization-scope';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ADMIN', 'ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = await resolveOrganizationIdForScope({
      user: auth,
      championshipId: params.id,
    });

    if (!organizationId) {
      return NextResponse.json({ error: 'Selecione uma organização para visualizar inscrições' }, { status: 400 });
    }

    const championship = await prisma.championship.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      select: { id: true, organizationId: true },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    const inscriptions = await prisma.inscription.findMany({
      where: {
        organizationId,
        championshipId: params.id,
      },
      include: {
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ inscriptions });
  } catch (error: unknown) {
    if (error instanceof ScopeResolutionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Admin championship inscriptions error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
