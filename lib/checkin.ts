import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sanitizeInput } from '@/lib/validation';

export interface CheckinInput {
  weight: number;
  height: number;
  athleteNumber: string;
  categoryIds: string[];
}

export class CheckinError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function parseCheckinInput(body: unknown): CheckinInput {
  const payload = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  const weightRaw = Number(payload.weight);
  const heightRaw = Number(payload.height);
  const athleteNumber = sanitizeInput(String(payload.athleteNumber ?? ''));
  const categoryIdsRaw = Array.isArray(payload.categoryIds) ? payload.categoryIds : [];

  const categoryIds = Array.from(
    new Set(
      categoryIdsRaw
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  if (!Number.isFinite(weightRaw) || weightRaw <= 0) {
    throw new CheckinError('Peso é obrigatório e deve ser maior que zero');
  }

  if (!Number.isFinite(heightRaw) || heightRaw <= 0) {
    throw new CheckinError('Altura é obrigatória e deve ser maior que zero');
  }

  if (!athleteNumber) {
    throw new CheckinError('Número do atleta é obrigatório');
  }

  if (athleteNumber.length > 30) {
    throw new CheckinError('Número do atleta deve ter no máximo 30 caracteres');
  }

  if (categoryIds.length === 0) {
    throw new CheckinError('Selecione ao menos uma categoria');
  }

  return {
    weight: Number(weightRaw.toFixed(2)),
    height: Number(heightRaw.toFixed(2)),
    athleteNumber,
    categoryIds,
  };
}

type ApplyCheckinParams = {
  inscriptionId: string;
  organizationId?: string | null;
  actorId: string;
  actorRole: UserRole;
  input: CheckinInput;
  mode: 'CHECKIN' | 'EDIT';
  ipAddress: string | null;
};

type ApplyCheckinResult = {
  inscription: {
    id: string;
    athleteNumber: string | null;
    weight: Prisma.Decimal | null;
    height: Prisma.Decimal | null;
    checkedInAt: Date | null;
    status: string;
    totalCategoriesAllowed: number;
  };
  participations: Array<{
    id: string;
    categoryId: string | null;
    status: string;
    createdAt: Date;
  }>;
};

export async function applyCheckin(params: ApplyCheckinParams): Promise<ApplyCheckinResult> {
  const { inscriptionId, actorId, actorRole, input, mode, ipAddress } = params;

  let organizationId = params.organizationId ?? null;
  if (!organizationId && actorRole === 'SUPER_ADMIN') {
    const inscriptionScope = await prisma.inscription.findUnique({
      where: { id: inscriptionId },
      select: { organizationId: true },
    });
    organizationId = inscriptionScope?.organizationId ?? null;
  }

  if (!organizationId) {
    throw new CheckinError('Organização ativa é obrigatória', 400);
  }
  const resolvedOrganizationId = organizationId;

  const inscription = await prisma.inscription.findFirst({
    where: {
      id: inscriptionId,
      organizationId: resolvedOrganizationId,
    },
    select: {
      id: true,
      athleteId: true,
      championshipId: true,
      organizationId: true,
      status: true,
      totalCategoriesAllowed: true,
      checkedInAt: true,
    },
  });

  if (!inscription) {
    throw new CheckinError('Inscrição não encontrada', 404);
  }

  if (input.categoryIds.length > inscription.totalCategoriesAllowed) {
    throw new CheckinError(
      `Quantidade de categorias excede o permitido (${inscription.totalCategoriesAllowed})`,
      400,
    );
  }

  const categories = await prisma.category.findMany({
    where: {
      id: { in: input.categoryIds },
      championshipId: inscription.championshipId,
      organizationId: resolvedOrganizationId,
    },
    select: { id: true },
  });

  if (categories.length !== input.categoryIds.length) {
    throw new CheckinError('Uma ou mais categorias são inválidas para este campeonato/organização', 400);
  }

  const duplicateAthleteNumber = await prisma.inscription.findFirst({
    where: {
      organizationId: resolvedOrganizationId,
      championshipId: inscription.championshipId,
      athleteNumber: input.athleteNumber,
      NOT: { id: inscription.id },
    },
    select: { id: true },
  });

  if (duplicateAthleteNumber) {
    throw new CheckinError('Número do atleta já está em uso neste campeonato', 409);
  }

  if (mode === 'CHECKIN' && inscription.status === 'CHECKIN_DONE') {
    throw new CheckinError('Check-in já concluído. Utilize a rota de edição.', 409);
  }

  if (
    inscription.status === 'CHECKIN_DONE' &&
    !['ADMIN', 'ARBITRO_CENTRAL', 'SUPER_ADMIN'].includes(actorRole)
  ) {
    throw new CheckinError('Apenas ADMIN ou ARBITRO_CENTRAL podem editar após CHECKIN_DONE', 403);
  }

  const beforeEditSnapshot =
    mode === 'EDIT' && inscription.status === 'CHECKIN_DONE'
      ? await prisma.inscription.findFirst({
          where: { id: inscription.id, organizationId: resolvedOrganizationId },
          select: {
            id: true,
            weight: true,
            height: true,
            athleteNumber: true,
            status: true,
            checkedInAt: true,
            participations: {
              where: { organizationId: resolvedOrganizationId },
              select: {
                id: true,
                categoryId: true,
                status: true,
              },
            },
          },
        })
      : null;

  const checkedInAt = inscription.checkedInAt ?? new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.participation.deleteMany({
        where: {
          inscriptionId: inscription.id,
          organizationId: resolvedOrganizationId,
        },
      });

      await tx.participation.createMany({
        data: input.categoryIds.map((categoryId) => ({
          athleteId: inscription.athleteId,
          championshipId: inscription.championshipId,
          categoryId,
          organizationId: resolvedOrganizationId,
          inscriptionId: inscription.id,
          status: 'CONFIRMED',
        })),
      });

      const updatedInscription = await tx.inscription.update({
        where: { id: inscription.id },
        data: {
          weight: input.weight,
          height: input.height,
          athleteNumber: input.athleteNumber,
          status: 'CHECKIN_DONE',
          checkedInAt,
        },
        select: {
          id: true,
          athleteNumber: true,
          weight: true,
          height: true,
          checkedInAt: true,
          status: true,
          totalCategoriesAllowed: true,
        },
      });

      const participations = await tx.participation.findMany({
        where: {
          inscriptionId: inscription.id,
          organizationId: resolvedOrganizationId,
        },
        select: {
          id: true,
          categoryId: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      try {
        const action =
          mode === 'EDIT' && inscription.status === 'CHECKIN_DONE'
            ? 'INSCRIPTION_CHECKIN_EDITED_AFTER_DONE'
            : 'INSCRIPTION_CHECKIN_DONE';

        await tx.auditLog.create({
          data: {
            action,
            entityType: 'Inscription',
            entityId: inscription.id,
            userId: actorId,
            role: actorRole,
            organizationId: resolvedOrganizationId,
            ipAddress,
            timestamp: new Date(),
            details: JSON.stringify({
              mode,
              before: beforeEditSnapshot,
              after: {
                inscription: updatedInscription,
                participationCategoryIds: participations.map((participation) => participation.categoryId),
              },
            }),
          },
        });
      } catch {
        // non-blocking
      }

      return {
        inscription: updatedInscription,
        participations,
      };
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new CheckinError('Conflito de dados: número do atleta ou categoria já utilizada neste campeonato', 409);
      }
    }

    throw error;
  }
}