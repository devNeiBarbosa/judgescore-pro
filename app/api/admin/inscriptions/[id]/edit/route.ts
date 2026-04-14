export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { applyCheckin, CheckinError, parseCheckinInput } from '@/lib/checkin';

const EDIT_ROLES = ['ADMIN', 'ARBITRO_CENTRAL', 'SUPER_ADMIN'] as const;

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [...EDIT_ROLES]);
  if (isErrorResponse(auth)) return auth;

  try {

    const body = await request.json();
    const input = parseCheckinInput(body);

    const result = await applyCheckin({
      inscriptionId: params.id,
      organizationId: auth.actingOrganizationId ?? null,
      actorId: auth.id,
      actorRole: auth.role,
      input,
      mode: 'EDIT',
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({
      message: 'Check-in editado com sucesso',
      inscription: result.inscription,
      participations: result.participations,
    });
  } catch (error: unknown) {
    if (error instanceof CheckinError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Check-in edit error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}