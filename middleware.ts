import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { JWT } from 'next-auth/jwt';

const IMPERSONATION_COOKIE = 'stagecore_impersonation_org';

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  response.headers.delete('X-Powered-By');
  return response;
}

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: JWT | null } }) {
    const token = req.nextauth?.token;
    const pathname = req.nextUrl.pathname;

    if (!token || !token.role) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const requestHeaders = new Headers(req.headers);
    const isSuperAdmin = token.role === 'SUPER_ADMIN';
    const impersonationOrganizationId = req.cookies.get(IMPERSONATION_COOKIE)?.value ?? null;
    const tenantId = isSuperAdmin
      ? (impersonationOrganizationId ?? null)
      : (token?.organizationId ?? null);

    if (tenantId) {
      requestHeaders.set('x-tenant-id', tenantId);
    } else {
      requestHeaders.delete('x-tenant-id');
    }

    if (token.mustChangePassword && pathname !== '/first-access') {
      return NextResponse.redirect(new URL('/first-access', req.url));
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    applySecurityHeaders(response);

    if (pathname.startsWith('/super-admin') && !isSuperAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    const isAdminCheckinPage = /^\/dashboard\/admin\/(championships|campeonatos)\/[^/]+\/checkin$/.test(pathname);
    const isAdminChampionshipDetailPage = /^\/dashboard\/admin\/(championships|campeonatos)\/[^/]+$/.test(pathname);
    const canAccessAdminCheckin =
      token?.role === 'ARBITRO_AUXILIAR' ||
      token?.role === 'ARBITRO_CENTRAL' ||
      token?.role === 'ADMIN' ||
      Boolean(isSuperAdmin);
    const canAccessAdminChampionshipDetail =
      token?.role === 'ARBITRO_CENTRAL' || token?.role === 'ADMIN' || Boolean(isSuperAdmin);

    if (pathname.startsWith('/dashboard/admin') && token?.role !== 'ADMIN' && !isSuperAdmin) {
      if (!((isAdminCheckinPage && canAccessAdminCheckin) || (isAdminChampionshipDetailPage && canAccessAdminChampionshipDetail))) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    if (
      pathname.startsWith('/dashboard/judge') &&
      token?.role !== 'ARBITRO_AUXILIAR' &&
      token?.role !== 'ARBITRO_CENTRAL' &&
      !isSuperAdmin
    ) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return response;
  },
  {
    callbacks: {
      authorized({ token }) {
        return Boolean(token && token.role);
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/super-admin/:path*', '/api/admin/:path*', '/api/super-admin/:path*'],
};
