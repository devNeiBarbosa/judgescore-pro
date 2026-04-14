export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { validatePassword } from '@/lib/validation';
import { logAuditAction } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !session.user.role) {
      throw new Error('Unauthorized');
    }

    const body = await request.json();
    const currentPassword = String(body?.currentPassword ?? '');
    const newPassword = String(body?.newPassword ?? '');

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Senha atual e nova senha são obrigatórias.' }, { status: 400 });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: `Senha fraca: ${passwordValidation.errors.join('; ')}` }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user || !user.role) {
      throw new Error('Unauthorized');
    }

    const currentOk = await bcrypt.compare(currentPassword, user.password);
    if (!currentOk) {
      return NextResponse.json({ error: 'Senha atual inválida.' }, { status: 400 });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return NextResponse.json({ error: 'A nova senha deve ser diferente da senha atual.' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        mustChangePassword: false,
      },
    });

    await logAuditAction(user.id, user.role, 'UPDATE', user.organizationId, 'User', user.id, {
      event: 'PASSWORD_CHANGE',
      mustChangePassword: false,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Erro interno ao alterar senha.' }, { status: 500 });
  }
}
