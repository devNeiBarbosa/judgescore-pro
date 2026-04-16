export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const championship = await prisma.championship.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    const items = await prisma.championshipItem.findMany({
      where: {
        championshipId: params.id,
        isActive: true,
      },
      select: {
        name: true,
        priceInCents: true,
        description: true,
        imageUrl: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('Public championship items fetch error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
