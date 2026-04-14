'use client';

import { useSession } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();
  const user = session?.user ?? null;
  const role = user?.role ?? null;
  const isAuth = status === 'authenticated';
  const isLoading = status === 'loading';

  return {
    session,
    user,
    role,
    isAuth,
    isLoading,
    isAdmin: role === 'ADMIN',
    isSuperAdmin: role === 'SUPER_ADMIN',
    isImpersonating: Boolean(user?.isImpersonating),
    actingOrganizationId: user?.actingOrganizationId ?? null,
    isArbitro: role === 'ARBITRO_AUXILIAR' || role === 'ARBITRO_CENTRAL',
    isArbitroCentral: role === 'ARBITRO_CENTRAL',
    isAtleta: role === 'ATLETA',
  };
}
