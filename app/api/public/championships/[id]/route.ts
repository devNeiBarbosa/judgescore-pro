export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const championship = await prisma.championship.findUnique({
      where: { id: params.id },
      select: {
        name: true,
        slug: true,
        date: true,
        description: true,
        venue: true,
        city: true,
        state: true,
        bannerUrl: true,
        logoUrl: true,
        organization: {
          select: {
            externalPaymentEnabled: true,
            externalPaymentUrl: true,
            externalPaymentLabel: true,
          },
        },
      },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
    }

    const responsePayload = {
      name: championship.name,
      slug: championship.slug,
      date: championship.date,
      description: championship.description,
      venue: championship.venue,
      city: championship.city,
      state: championship.state,
      bannerUrl: championship.bannerUrl,
      logoUrl: championship.logoUrl,
      externalPaymentEnabled: championship.organization?.externalPaymentEnabled ?? false,
      externalPaymentUrl: championship.organization?.externalPaymentUrl ?? null,
      externalPaymentLabel: championship.organization?.externalPaymentLabel ?? null,
    };

    return NextResponse.json({ championship: responsePayload });
  } catch (error: unknown) {
    console.error('Public championship fetch error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
