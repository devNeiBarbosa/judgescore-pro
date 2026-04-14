import type { AuthenticatedUser } from '@/lib/api-guard';
import { prisma } from '@/lib/prisma';

export class ScopeResolutionError extends Error {
  status: number;

  constructor(message: string, status = 404) {
    super(message);
    this.status = status;
  }
}

function canBypassTenantBinding(user: AuthenticatedUser): boolean {
  return user.isSuperAdmin && !user.actingOrganizationId;
}

export async function resolveOrganizationIdForScope(params: {
  user: AuthenticatedUser;
  championshipId?: string;
  categoryId?: string;
  inscriptionId?: string;
}): Promise<string | null> {
  const { user, championshipId, categoryId, inscriptionId } = params;

  if (user.actingOrganizationId) {
    return user.actingOrganizationId;
  }

  if (!canBypassTenantBinding(user)) {
    return null;
  }

  if (championshipId) {
    const championship = await prisma.championship.findUnique({
      where: { id: championshipId },
      select: { organizationId: true },
    });

    if (!championship) {
      throw new ScopeResolutionError('Championship not found');
    }

    return championship.organizationId;
  }

  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { organizationId: true },
    });

    if (!category) {
      throw new ScopeResolutionError('Category not found');
    }

    return category.organizationId;
  }

  if (inscriptionId) {
    const inscription = await prisma.inscription.findUnique({
      where: { id: inscriptionId },
      select: { organizationId: true },
    });

    if (!inscription) {
      throw new ScopeResolutionError('Inscription not found');
    }

    return inscription.organizationId;
  }

  return null;
}
