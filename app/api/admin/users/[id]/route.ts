export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse } from '@/lib/api-guard';
import { logAuditAction } from '@/lib/audit-log';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const targetUserId = String(params?.id ?? '');
    if (!targetUserId) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    if (auth.id === targetUserId) {
      return NextResponse.json({ error: 'Self-delete não é permitido' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const participations = await tx.participation.findMany({
        where: { athleteId: targetUser.id },
        select: { id: true },
      });

      const participationIds = participations.map((row) => row.id);

      if (participationIds.length > 0) {
        await tx.result.deleteMany({
          where: { participationId: { in: participationIds } },
        });

        await tx.judgment.deleteMany({
          where: { participationId: { in: participationIds } },
        });
      }

      await tx.participation.deleteMany({ where: { athleteId: targetUser.id } });
      await tx.order.deleteMany({ where: { athleteId: targetUser.id } });
      await tx.judgment.deleteMany({ where: { judgeId: targetUser.id } });
      await tx.categoryResult.deleteMany({ where: { generatedById: targetUser.id } });
      await tx.auditLog.deleteMany({ where: { userId: targetUser.id } });
      await tx.user.delete({ where: { id: targetUser.id } });
    });

    await logAuditAction(
      auth.id,
      auth.role,
      'SUPER_ADMIN_USER_DELETED',
      targetUser.organizationId,
      'User',
      targetUser.id,
      {
        deletedUserEmail: targetUser.email,
        deletedUserRole: targetUser.role,
        actingOrganizationId: auth.actingOrganizationId,
        isImpersonating: auth.isImpersonating,
      },
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Super admin delete user error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
