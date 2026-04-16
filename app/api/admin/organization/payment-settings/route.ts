export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isErrorResponse, type AuthenticatedUser } from '@/lib/api-guard';
import { sanitizeInput } from '@/lib/validation';
import { logAuditAction } from '@/lib/audit-log';

type PaymentSettingsPayload = {
  externalPaymentEnabled?: unknown;
  externalPaymentUrl?: unknown;
  externalPaymentLabel?: unknown;
  organizationId?: unknown;
};

function resolveOrganizationIdFromContext(auth: AuthenticatedUser): string | NextResponse {
  if (auth.isSuperAdmin && !auth.actingOrganizationId) {
    return NextResponse.json(
      { error: 'SUPER_ADMIN precisa de impersonação ativa para alterar configurações da organização' },
      { status: 403 },
    );
  }

  if (!auth.actingOrganizationId) {
    return NextResponse.json({ error: 'Usuário sem organização vinculada' }, { status: 403 });
  }

  return auth.actingOrganizationId;
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatPaymentSettings(organization: {
  id: string;
  externalPaymentEnabled: boolean;
  externalPaymentUrl: string | null;
  externalPaymentLabel: string | null;
}) {
  return {
    organizationId: organization.id,
    externalPaymentEnabled: organization.externalPaymentEnabled,
    externalPaymentUrl: organization.externalPaymentUrl,
    externalPaymentLabel: organization.externalPaymentLabel,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        externalPaymentEnabled: true,
        externalPaymentUrl: true,
        externalPaymentLabel: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ paymentSettings: formatPaymentSettings(organization) });
  } catch (error: unknown) {
    console.error('Get payment settings error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (isErrorResponse(auth)) return auth;

  try {
    const organizationId = resolveOrganizationIdFromContext(auth);
    if (organizationId instanceof NextResponse) return organizationId;

    const body = (await request.json()) as PaymentSettingsPayload;

    const payloadOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : '';
    if (payloadOrganizationId && payloadOrganizationId !== organizationId) {
      return NextResponse.json({ error: 'organizationId do payload não corresponde ao contexto ativo' }, { status: 403 });
    }

    const data: {
      externalPaymentEnabled?: boolean;
      externalPaymentUrl?: string | null;
      externalPaymentLabel?: string | null;
    } = {};

    if (body?.externalPaymentEnabled !== undefined) {
      if (typeof body.externalPaymentEnabled !== 'boolean') {
        return NextResponse.json({ error: 'externalPaymentEnabled deve ser boolean' }, { status: 400 });
      }
      data.externalPaymentEnabled = body.externalPaymentEnabled;
    }

    if (body?.externalPaymentUrl !== undefined) {
      if (typeof body.externalPaymentUrl !== 'string') {
        return NextResponse.json({ error: 'externalPaymentUrl deve ser string' }, { status: 400 });
      }

      const sanitizedUrl = sanitizeInput(body.externalPaymentUrl);
      if (!sanitizedUrl) {
        data.externalPaymentUrl = null;
      } else {
        if (!isValidHttpUrl(sanitizedUrl)) {
          return NextResponse.json({ error: 'externalPaymentUrl inválida. Use http(s)://...' }, { status: 400 });
        }
        data.externalPaymentUrl = sanitizedUrl;
      }
    }

    if (body?.externalPaymentLabel !== undefined) {
      if (typeof body.externalPaymentLabel !== 'string') {
        return NextResponse.json({ error: 'externalPaymentLabel deve ser string' }, { status: 400 });
      }

      const sanitizedLabel = sanitizeInput(body.externalPaymentLabel);
      if (sanitizedLabel.length > 120) {
        return NextResponse.json({ error: 'externalPaymentLabel deve ter no máximo 120 caracteres' }, { status: 400 });
      }

      data.externalPaymentLabel = sanitizedLabel || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado para atualização' }, { status: 400 });
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data,
      select: {
        id: true,
        externalPaymentEnabled: true,
        externalPaymentUrl: true,
        externalPaymentLabel: true,
      },
    });

    if (auth.isSuperAdmin) {
      await logAuditAction(
        auth.id,
        auth.role,
        'SUPER_ADMIN_ORGANIZATION_PAYMENT_SETTINGS_UPDATED',
        organizationId,
        'Organization',
        organizationId,
        {
          actingOrganizationId: auth.actingOrganizationId,
          isImpersonating: auth.isImpersonating,
          changedFields: Object.keys(data),
        },
      );
    }

    return NextResponse.json({ paymentSettings: formatPaymentSettings(updatedOrganization) }, { status: 200 });
  } catch (error: unknown) {
    console.error('Update payment settings error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
