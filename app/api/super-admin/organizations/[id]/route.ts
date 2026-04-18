export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { logAuditAction } from '@/lib/audit-log';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = String(params?.id ?? '');

    if (!organizationId) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    if (auth.organizationId === organizationId || auth.actingOrganizationId === organizationId) {
      return NextResponse.json({ error: 'Self-delete de organização não é permitido' }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    await prisma.organization.delete({
      where: { id: organization.id },
    });

    await logAuditAction(
      auth.id,
      auth.role,
      'SUPER_ADMIN_ORGANIZATION_DELETED',
      null,
      'Organization',
      organization.id,
      {
        deletedOrganizationId: organization.id,
        deletedOrganizationName: organization.name,
        deletedOrganizationSlug: organization.slug,
        actingOrganizationId: auth.actingOrganizationId,
        isImpersonating: auth.isImpersonating,
      },
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Super admin organization delete error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
