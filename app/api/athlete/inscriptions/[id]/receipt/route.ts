export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { tenantWhere } from '@/lib/tenant';
import { generateInscriptionReceiptPdf, toInscriptionReceiptData } from '@/lib/inscription-receipt';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['ATLETA']);
  if (isErrorResponse(auth)) return auth;

  try {
    if (!auth.actingOrganizationId) {
      return NextResponse.json({ error: 'Usuário sem organização vinculada' }, { status: 403 });
    }

    const inscription = await prisma.inscription.findFirst({
      where: tenantWhere(auth, 'organizationId', {
        id: params.id,
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

    if (!inscription) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 });
    }

    if (inscription.organizationId !== auth.actingOrganizationId || inscription.athleteId !== auth.id) {
      return NextResponse.json({ error: 'Acesso negado ao comprovante' }, { status: 403 });
    }

    const pdfBuffer = await generateInscriptionReceiptPdf(toInscriptionReceiptData(inscription));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comprovante-inscricao-${inscription.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Athlete inscription receipt error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
