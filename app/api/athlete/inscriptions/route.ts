export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { tenantWhere } from '@/lib/tenant';
import { generateInscriptionReceiptPdf, toInscriptionReceiptData } from '@/lib/inscription-receipt';
import { sendInscriptionConfirmationEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ATLETA']);
  if (isErrorResponse(auth)) return auth;

  try {
    const inscriptions = await prisma.inscription.findMany({
      where: tenantWhere(auth, 'organizationId', {
        athleteId: auth.id,
      }),
      include: {
        championship: {
          select: {
            id: true,
            name: true,
            slug: true,
            date: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ inscriptions });
  } catch (error: unknown) {
    console.error('Athlete inscriptions list error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ATLETA']);
  if (isErrorResponse(auth)) return auth;

  try {
    if (!auth.actingOrganizationId) {
      return NextResponse.json({ error: 'Usuário sem organização vinculada' }, { status: 403 });
    }

    const body = await request.json();
    const championshipId = typeof body?.championshipId === 'string' ? body.championshipId.trim() : '';
    const extraCategoriesRaw = Number(body?.extraCategories ?? 0);
    const extraCategories = Number.isInteger(extraCategoriesRaw) ? extraCategoriesRaw : -1;
    const painting = Boolean(body?.painting);
    const photos = Boolean(body?.photos);

    if (!championshipId) {
      return NextResponse.json({ error: 'championshipId é obrigatório' }, { status: 400 });
    }

    if (extraCategories < 0 || extraCategories > 20) {
      return NextResponse.json({ error: 'extraCategories deve ser um inteiro entre 0 e 20' }, { status: 400 });
    }

    const championship = await prisma.championship.findFirst({
      where: tenantWhere(auth, 'organizationId', {
        id: championshipId,
        status: { in: ['PUBLISHED', 'ONGOING'] },
      }),
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!championship) {
      return NextResponse.json({ error: 'Campeonato não encontrado para sua organização' }, { status: 404 });
    }

    if (championship.organizationId !== auth.actingOrganizationId) {
      return NextResponse.json({ error: 'Acesso negado ao campeonato de outra organização' }, { status: 403 });
    }

    const existingInscription = await prisma.inscription.findFirst({
      where: tenantWhere(auth, 'organizationId', {
        athleteId: auth.id,
        championshipId,
      }),
      select: { id: true },
    });

    if (existingInscription) {
      return NextResponse.json({ error: 'Você já está inscrito neste campeonato' }, { status: 409 });
    }

    const inscription = await prisma.inscription.create({
      data: {
        athleteId: auth.id,
        championshipId,
        organizationId: auth.actingOrganizationId,
        baseRegistration: true,
        extraCategories,
        totalCategoriesAllowed: 1 + extraCategories,
        painting,
        photos,
      },
    });

    try {
      const inscriptionForReceipt = await prisma.inscription.findFirst({
        where: tenantWhere(auth, 'organizationId', {
          id: inscription.id,
          athleteId: auth.id,
        }),
        include: {
          athlete: {
            select: {
              name: true,
              cpf: true,
              email: true,
            },
          },
          championship: {
            select: {
              name: true,
            },
          },
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      if (inscriptionForReceipt) {
        const pdfBuffer = await generateInscriptionReceiptPdf(toInscriptionReceiptData(inscriptionForReceipt));
        await sendInscriptionConfirmationEmail({
          to: inscriptionForReceipt.athlete.email,
          pdfBuffer,
          inscriptionId: inscriptionForReceipt.id,
        });
      }
    } catch (emailError: unknown) {
      console.error(
        'Inscription email send error (non-blocking):',
        emailError instanceof Error ? emailError.message : 'Unknown',
      );
    }

    return NextResponse.json({ inscription }, { status: 201 });
  } catch (error: unknown) {
    console.error('Athlete inscription create error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
