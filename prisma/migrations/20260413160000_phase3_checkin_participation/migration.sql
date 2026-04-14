-- Phase 3: Check-in + Pesagem + Participações reais

-- Inscription check-in fields
ALTER TABLE "Inscription"
  ADD COLUMN IF NOT EXISTS "weight" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "height" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "athleteNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);

-- Participation evolution for real categories at check-in
ALTER TABLE "Participation"
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "inscriptionId" TEXT;

ALTER TABLE "Participation"
  ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- Remove old uniqueness (one participation per championship) to allow one per category
DROP INDEX IF EXISTS "Participation_athleteId_championshipId_key";

-- New constraints and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Participation_athleteId_championshipId_categoryId_key"
  ON "Participation"("athleteId", "championshipId", "categoryId");

CREATE INDEX IF NOT EXISTS "Participation_categoryId_idx" ON "Participation"("categoryId");
CREATE INDEX IF NOT EXISTS "Participation_inscriptionId_idx" ON "Participation"("inscriptionId");
CREATE INDEX IF NOT EXISTS "Participation_organizationId_championshipId_idx" ON "Participation"("organizationId", "championshipId");
CREATE INDEX IF NOT EXISTS "Participation_organizationId_championshipId_status_idx" ON "Participation"("organizationId", "championshipId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "Inscription_championshipId_athleteNumber_key"
  ON "Inscription"("championshipId", "athleteNumber");

CREATE INDEX IF NOT EXISTS "Inscription_organizationId_championshipId_status_idx"
  ON "Inscription"("organizationId", "championshipId", "status");

-- Foreign keys for new participation references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Participation_categoryId_fkey'
  ) THEN
    ALTER TABLE "Participation"
      ADD CONSTRAINT "Participation_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Participation_inscriptionId_fkey'
  ) THEN
    ALTER TABLE "Participation"
      ADD CONSTRAINT "Participation_inscriptionId_fkey"
      FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
