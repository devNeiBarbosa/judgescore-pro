export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !session.user.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Only return minimal safe fields. Never expose cpf, phone, birthDate, etc.
    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        organizationId: session.user.organizationId,
        actingOrganizationId: session.user.actingOrganizationId,
        isSuperAdmin: session.user.isSuperAdmin,
        isImpersonating: session.user.isImpersonating,
        mustChangePassword: session.user.mustChangePassword,
      },
    });
  } catch (error: unknown) {
    console.error('Me error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
