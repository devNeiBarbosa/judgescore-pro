export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { IMPERSONATION_COOKIE } from '@/lib/tenant';
import { logAuditAction } from '@/lib/audit-log';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const organizationId = String(body?.organizationId ?? '');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório' }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, isActive: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    if (!organization.isActive) {
      return NextResponse.json({ error: 'Organização está desativada' }, { status: 409 });
    }

    const response = NextResponse.json({ success: true, organization });
    response.cookies.set(IMPERSONATION_COOKIE, organization.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });

    await logAuditAction(
      auth.id,
      auth.role,
      'SUPER_ADMIN_IMPERSONATION_STARTED',
      organization.id,
      'Organization',
      organization.id,
      {
        superAdminId: auth.id,
        superAdminEmail: auth.email,
        organizationName: organization.name,
        startedAt: new Date().toISOString(),
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      },
    );

    return response;
  } catch (error: unknown) {
    console.error('Impersonation start error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const activeOrganizationId = request.cookies.get(IMPERSONATION_COOKIE)?.value ?? null;
    const response = NextResponse.json({ success: true });
    response.cookies.set(IMPERSONATION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });

    if (activeOrganizationId) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_IMPERSONATION_STOPPED',
        activeOrganizationId,
        'Organization',
        activeOrganizationId,
        {
          superAdminId: auth.id,
          superAdminEmail: auth.email,
          stoppedAt: new Date().toISOString(),
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        },
      );
    }

    return response;
  } catch (error: unknown) {
    console.error('Impersonation stop error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
