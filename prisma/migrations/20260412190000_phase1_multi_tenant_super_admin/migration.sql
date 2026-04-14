-- Phase 1: Multi-tenant real + SUPER_ADMIN

-- 1) UserRole enum: add SUPER_ADMIN
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'SUPER_ADMIN'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
  END IF;
END $$;

-- 2) Ensure a fallback organization for legacy orphan data
INSERT INTO "Organization" (
  "id", "name", "slug", "planType", "licenseType", "subscriptionStatus", "isBrandingAllowed",
  "maintenanceRequired", "maxChampionships", "isActive", "createdAt", "updatedAt"
)
SELECT
  'legacy_migration_org', 'Legacy Migration Org', 'legacy-migration-org', 'EVENTO', 'PER_EVENT', 'ACTIVE', false,
  false, 1, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Organization" WHERE "id" = 'legacy_migration_org' OR "slug" = 'legacy-migration-org'
);

-- 3) Add organizationId columns where missing
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Championship" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Participation" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Judgment" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Result" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ChampionshipReferee" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "CategoryRegistration" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Combo" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ComboProduct" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 4) Backfill organizationId using relationships
UPDATE "Championship"
SET "organizationId" = 'legacy_migration_org'
WHERE "organizationId" IS NULL;

UPDATE "Category" c
SET "organizationId" = ch."organizationId"
FROM "Championship" ch
WHERE c."championshipId" = ch."id" AND c."organizationId" IS NULL;

UPDATE "Participation" p
SET "organizationId" = ch."organizationId"
FROM "Championship" ch
WHERE p."championshipId" = ch."id" AND p."organizationId" IS NULL;

UPDATE "Judgment" j
SET "organizationId" = c."organizationId"
FROM "Category" c
WHERE j."categoryId" = c."id" AND j."organizationId" IS NULL;

UPDATE "Result" r
SET "organizationId" = c."organizationId"
FROM "Category" c
WHERE r."categoryId" = c."id" AND r."organizationId" IS NULL;

UPDATE "Order" o
SET "organizationId" = ch."organizationId"
FROM "Championship" ch
WHERE o."championshipId" = ch."id" AND o."organizationId" IS NULL;

UPDATE "ChampionshipReferee" cr
SET "organizationId" = ch."organizationId"
FROM "Championship" ch
WHERE cr."championshipId" = ch."id" AND cr."organizationId" IS NULL;

UPDATE "CategoryRegistration" cr
SET "organizationId" = p."organizationId"
FROM "Participation" p
WHERE cr."participationId" = p."id" AND cr."organizationId" IS NULL;

UPDATE "Product" p
SET "organizationId" = ch."organizationId"
FROM "Championship" ch
WHERE p."championshipId" = ch."id" AND p."organizationId" IS NULL;

UPDATE "Combo" c
SET "organizationId" = ch."organizationId"
FROM "Championship" ch
WHERE c."championshipId" = ch."id" AND c."organizationId" IS NULL;

UPDATE "ComboProduct" cp
SET "organizationId" = c."organizationId"
FROM "Combo" c
WHERE cp."comboId" = c."id" AND cp."organizationId" IS NULL;

UPDATE "OrderItem" oi
SET "organizationId" = o."organizationId"
FROM "Order" o
WHERE oi."orderId" = o."id" AND oi."organizationId" IS NULL;

-- 5) Enforce NOT NULL on tenant-critical entities
ALTER TABLE "Championship" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Participation" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Judgment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Result" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ChampionshipReferee" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "CategoryRegistration" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Combo" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ComboProduct" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "organizationId" SET NOT NULL;

-- 6) User rule: organizationId required except SUPER_ADMIN
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_non_superadmin_requires_org";
ALTER TABLE "User"
ADD CONSTRAINT "User_non_superadmin_requires_org"
CHECK ("role" = 'SUPER_ADMIN' OR "organizationId" IS NOT NULL) NOT VALID;

-- 7) Add foreign keys (if missing)
DO $$ BEGIN
  BEGIN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE "Category"
      ADD CONSTRAINT "Category_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE "Participation"
      ADD CONSTRAINT "Participation_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE "Judgment"
      ADD CONSTRAINT "Judgment_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER TABLE "Result"
      ADD CONSTRAINT "Result_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 8) Indexes for tenant isolation performance
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX IF NOT EXISTS "Championship_organizationId_idx" ON "Championship"("organizationId");
CREATE INDEX IF NOT EXISTS "Category_organizationId_idx" ON "Category"("organizationId");
CREATE INDEX IF NOT EXISTS "Participation_organizationId_idx" ON "Participation"("organizationId");
CREATE INDEX IF NOT EXISTS "Judgment_organizationId_idx" ON "Judgment"("organizationId");
CREATE INDEX IF NOT EXISTS "Result_organizationId_idx" ON "Result"("organizationId");
CREATE INDEX IF NOT EXISTS "Order_organizationId_idx" ON "Order"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
