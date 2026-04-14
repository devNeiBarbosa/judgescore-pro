import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function serializeDetails(details?: unknown): string | null {
  if (details === undefined || details === null) return null;
  if (typeof details === 'string') return details;

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export async function logAuditAction(
  userId: string,
  role: UserRole,
  action: string,
  organizationId: string | null,
  entityType: string,
  entityId: string,
  details?: unknown,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        role,
        action,
        organizationId,
        entityType,
        entityId,
        timestamp: new Date(),
        details: serializeDetails(details),
      },
    });
  } catch {
    // non-blocking by design
  }
}
