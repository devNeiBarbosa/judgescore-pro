export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { logAuditAction } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        planType: true,
        subscriptionStatus: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            championships: true,
          },
        },
      },
    });

    return NextResponse.json({ organizations });
  } catch (error: unknown) {
    console.error('Super admin organizations list error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const organizationId = String(body?.organizationId ?? '');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (body.planType !== undefined) {
      const planType = String(body.planType);
      if (!['EVENTO', 'SAAS', 'LICENCA'].includes(planType)) {
        return NextResponse.json({ error: 'planType inválido' }, { status: 400 });
      }
      data.planType = planType;
    }

    if (body.subscriptionStatus !== undefined) {
      const subscriptionStatus = String(body.subscriptionStatus);
      if (!['ACTIVE', 'INACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED'].includes(subscriptionStatus)) {
        return NextResponse.json({ error: 'subscriptionStatus inválido' }, { status: 400 });
      }
      data.subscriptionStatus = subscriptionStatus;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualização' }, { status: 400 });
    }

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        planType: true,
        subscriptionStatus: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditAction(
      auth.id,
      auth.role,
      'SUPER_ADMIN_ORGANIZATION_UPDATED',
      organization.id,
      'Organization',
      organization.id,
      {
        changes: data,
        crossOrganization: true,
      },
    );

    return NextResponse.json({ organization });
  } catch (error: unknown) {
    console.error('Super admin organization update error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
