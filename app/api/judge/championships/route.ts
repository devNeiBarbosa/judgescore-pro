export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { JUDGE_ROLES } from '@/lib/judging';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [...JUDGE_ROLES]);
  if (isErrorResponse(auth)) return auth;

  try {
    if (!auth.actingOrganizationId) {
      return NextResponse.json({ error: 'Organização ativa é obrigatória' }, { status: 400 });
    }

    const assignments = await prisma.championshipReferee.findMany({
      where: {
        organizationId: auth.actingOrganizationId,
        refereeId: auth.id,
      },
      select: {
        championship: {
          select: {
            id: true,
            name: true,
            date: true,
            status: true,
          },
        },
      },
      orderBy: {
        championship: {
          date: 'desc',
        },
      },
    });

    return NextResponse.json({
      championships: assignments.map((item) => item.championship),
    });
  } catch (error: unknown) {
    console.error('Judge championships error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
