-- Hardening final: evolve existing AuditLog without breaking compatibility
ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "role" "UserRole",
  ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3);

-- Keep historical continuity for existing records
UPDATE "AuditLog"
SET "timestamp" = COALESCE("timestamp", "createdAt")
WHERE "timestamp" IS NULL;

UPDATE "AuditLog" AS a
SET "role" = u."role"
FROM "User" AS u
WHERE a."userId" = u."id"
  AND a."role" IS NULL;

ALTER TABLE "AuditLog"
  ALTER COLUMN "timestamp" SET NOT NULL,
  ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "AuditLog_role_idx" ON "AuditLog"("role");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
