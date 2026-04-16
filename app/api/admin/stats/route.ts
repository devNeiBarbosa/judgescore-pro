export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { tenantWhere } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const userScope = tenantWhere(auth);

    const [championships, athletes, categories, referees, orders, organization] = await Promise.all([
      prisma.championship.count({ where: userScope as never }),
      prisma.user.count({ where: tenantWhere(auth, 'organizationId', { role: 'ATLETA' }) as never }),
      prisma.category.count({ where: userScope as never }),
      prisma.user.count({ where: tenantWhere(auth, 'organizationId', { role: { in: ['ARBITRO_AUXILIAR', 'ARBITRO_CENTRAL'] } }) as never }),
      prisma.order.count({ where: tenantWhere(auth, 'organizationId', { paymentStatus: 'PAID' }) as never }),
      auth.actingOrganizationId
        ? prisma.organization.findUnique({ where: { id: auth.actingOrganizationId } })
        : Promise.resolve(null),
    ]);

    const org = organization as any;
    const organizationBilling = org
      ? {
          id: org.id,
          billingPlanType: org.billingPlanType ?? null,
          billingStatus: org.billingStatus ?? null,
          billingExpiresAt: org.billingExpiresAt ?? null,
          championshipsUsedInCycle: org.championshipsUsedInCycle ?? 0,
        }
      : null;

    return NextResponse.json({
      stats: { championships, athletes, categories, referees, orders },
      organizationBilling,
    });
  } catch (error: unknown) {
    console.error('Stats error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
