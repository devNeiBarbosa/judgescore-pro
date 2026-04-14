export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { NextResponse, NextRequest } from 'next/server';
import type { UserRole } from '@prisma/client';
import { IMPERSONATION_COOKIE } from '@/lib/tenant';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string | null;
  actingOrganizationId: string | null;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  mustChangePassword: boolean;
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[] = []
): Promise<AuthenticatedUser | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  if (!session.user || !session.user.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const organizationId = session.user.organizationId ?? null;
  const mustChangePassword = Boolean(session.user.mustChangePassword);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  if (allowedRoles.length > 0 && !isSuperAdmin && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const impersonationOrgCookie = request.cookies.get(IMPERSONATION_COOKIE)?.value ?? null;
  const actingOrganizationId = isSuperAdmin
    ? (impersonationOrgCookie ?? null)
    : organizationId;

  if (!isSuperAdmin && !actingOrganizationId) {
    return NextResponse.json({ error: 'Usuário sem organização vinculada' }, { status: 403 });
  }

  if (mustChangePassword && request.nextUrl.pathname !== '/api/auth/change-password') {
    return NextResponse.json({ error: 'Troca de senha obrigatória no primeiro acesso' }, { status: 403 });
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role,
    organizationId,
    actingOrganizationId,
    isSuperAdmin,
    isImpersonating: Boolean(isSuperAdmin && impersonationOrgCookie),
    mustChangePassword,
  };
}

export function isErrorResponse(result: AuthenticatedUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
