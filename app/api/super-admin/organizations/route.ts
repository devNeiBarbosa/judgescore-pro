export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { logAuditAction } from '@/lib/audit-log';
import { sanitizeInput } from '@/lib/validation';
import { slugify } from '@/lib/utils';

async function generateUniqueOrganizationSlug(baseInput: string): Promise<string> {
  const baseSlug = slugify(baseInput) || 'organizacao';

  const existingSlugs = await prisma.organization.findMany({
    where: {
      slug: {
        startsWith: baseSlug,
      },
    },
    select: { slug: true },
  });

  const usedSlugs = new Set(existingSlugs.map((row) => row.slug));
  if (!usedSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;
  while (usedSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationsRaw = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            championships: true,
          },
        },
      },
    });

    const organizations = organizationsRaw.map((org) => {
      const item = org as any;
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        planType: item.planType,
        subscriptionStatus: item.subscriptionStatus,
        billingPlanType: item.billingPlanType ?? null,
        billingStatus: item.billingStatus ?? null,
        billingExpiresAt: item.billingExpiresAt ?? null,
        championshipsUsedInCycle: item.championshipsUsedInCycle ?? 0,
        isActive: item.isActive,
        createdAt: item.createdAt,
        _count: item._count,
      };
    });

    return NextResponse.json({ organizations });
  } catch (error: unknown) {
    console.error('Super admin organizations list error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const name = sanitizeInput(typeof body?.name === 'string' ? body.name : '');
    const providedSlug = sanitizeInput(typeof body?.slug === 'string' ? body.slug : '');

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'name é obrigatório (mín. 2 caracteres)' }, { status: 400 });
    }

    const slugSource = providedSlug || name;
    const slug = await generateUniqueOrganizationSlug(slugSource);

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
      },
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
      'SUPER_ADMIN_ORGANIZATION_CREATED',
      organization.id,
      'Organization',
      organization.id,
      {
        name: organization.name,
        slug: organization.slug,
        providedSlug: providedSlug || null,
      },
    );

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error: unknown) {
    console.error('Super admin organization create error:', error instanceof Error ? error.message : 'Unknown');
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
