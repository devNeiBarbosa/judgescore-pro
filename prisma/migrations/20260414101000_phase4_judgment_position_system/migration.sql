-- Phase 4: Sistema de Julgamento por Posição

-- Evolução do model Judgment para avaliação por árbitro (User)
ALTER TABLE "Judgment"
  ADD COLUMN IF NOT EXISTS "judgeId" TEXT,
  ADD COLUMN IF NOT EXISTS "championshipId" TEXT;

ALTER TABLE "Judgment"
  ALTER COLUMN "position" DROP NOT NULL;

-- Backfill a partir da estrutura antiga (refereeId -> ChampionshipReferee.id)
UPDATE "Judgment" AS j
SET
  "judgeId" = cr."refereeId",
  "championshipId" = cr."championshipId"
FROM "ChampionshipReferee" AS cr
WHERE j."refereeId" = cr."id"
  AND (j."judgeId" IS NULL OR j."championshipId" IS NULL);

-- Fallback de championshipId usando Participation
UPDATE "Judgment" AS j
SET "championshipId" = p."championshipId"
FROM "Participation" AS p
WHERE j."participationId" = p."id"
  AND j."championshipId" IS NULL;

-- Segurança de consistência para permitir NOT NULL
DELETE FROM "Judgment"
WHERE "judgeId" IS NULL OR "championshipId" IS NULL;

ALTER TABLE "Judgment"
  ALTER COLUMN "judgeId" SET NOT NULL,
  ALTER COLUMN "championshipId" SET NOT NULL;

-- Remoção de constraints/índices antigos
ALTER TABLE "Judgment" DROP CONSTRAINT IF EXISTS "Judgment_refereeId_fkey";
DROP INDEX IF EXISTS "Judgment_categoryId_refereeId_participationId_key";
DROP INDEX IF EXISTS "Judgment_refereeId_idx";

-- Garantia de chaves estrangeiras novas
ALTER TABLE "Judgment" DROP CONSTRAINT IF EXISTS "Judgment_judgeId_fkey";
ALTER TABLE "Judgment" DROP CONSTRAINT IF EXISTS "Judgment_championshipId_fkey";

ALTER TABLE "Judgment"
  ADD CONSTRAINT "Judgment_judgeId_fkey"
  FOREIGN KEY ("judgeId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Judgment"
  ADD CONSTRAINT "Judgment_championshipId_fkey"
  FOREIGN KEY ("championshipId") REFERENCES "Championship"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove coluna legada após backfill
ALTER TABLE "Judgment" DROP COLUMN IF EXISTS "refereeId";

-- Constraints e índices da Fase 4
CREATE UNIQUE INDEX IF NOT EXISTS "Judgment_judgeId_participationId_key"
  ON "Judgment"("judgeId", "participationId");

CREATE UNIQUE INDEX IF NOT EXISTS "Judgment_organizationId_judgeId_championshipId_categoryId_position_key"
  ON "Judgment"("organizationId", "judgeId", "championshipId", "categoryId", "position");

CREATE INDEX IF NOT EXISTS "Judgment_organizationId_championshipId_categoryId_judgeId_idx"
  ON "Judgment"("organizationId", "championshipId", "categoryId", "judgeId");

CREATE INDEX IF NOT EXISTS "Judgment_participationId_idx"
  ON "Judgment"("participationId");

CREATE INDEX IF NOT EXISTS "Judgment_championshipId_idx"
  ON "Judgment"("championshipId");

CREATE INDEX IF NOT EXISTS "Judgment_categoryId_idx"
  ON "Judgment"("categoryId");

CREATE INDEX IF NOT EXISTS "Judgment_organizationId_idx"
  ON "Judgment"("organizationId");
