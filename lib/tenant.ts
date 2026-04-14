import type { AuthenticatedUser } from '@/lib/api-guard';

export const IMPERSONATION_COOKIE = 'stagecore_impersonation_org';

export function isSuperAdmin(user: AuthenticatedUser): boolean {
  return user.role === 'SUPER_ADMIN';
}

export function getActingOrganizationId(user: AuthenticatedUser): string | null {
  return user.actingOrganizationId ?? null;
}

export function tenantWhere(
  user: AuthenticatedUser,
  field = 'organizationId',
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const actingOrganizationId = getActingOrganizationId(user);
  if (isSuperAdmin(user) && !actingOrganizationId) {
    return { ...extra };
  }

  return {
    ...extra,
    [field]: actingOrganizationId,
  };
}

export function assertTenantAccess(user: AuthenticatedUser, entityOrganizationId: string | null | undefined): boolean {
  if (isSuperAdmin(user)) {
    return true;
  }

  return Boolean(entityOrganizationId && entityOrganizationId === user.actingOrganizationId);
}
