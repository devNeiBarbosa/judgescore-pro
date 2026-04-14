export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { logAuditAction } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !session.user.role) {
      throw new Error('Unauthorized');
    }

    await logAuditAction(
      session.user.id,
      session.user.role,
      'LOGOUT',
      session.user.organizationId,
      'User',
      session.user.id,
      {
        event: 'SESSION_END',
        userAgent: request.headers.get('user-agent') ?? null,
      },
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Erro ao registrar logout' }, { status: 500 });
  }
}
