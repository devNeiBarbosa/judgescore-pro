export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { tenantWhere } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ATLETA']);
  if (isErrorResponse(auth)) return auth;

  try {
    const championships = await prisma.championship.findMany({
      where: tenantWhere(auth, 'organizationId', {
        status: { in: ['PUBLISHED', 'ONGOING'] },
      }),
      select: {
        id: true,
        name: true,
        slug: true,
        date: true,
        status: true,
        venue: true,
        city: true,
        state: true,
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ championships });
  } catch (error: unknown) {
    console.error('Athlete championships list error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
