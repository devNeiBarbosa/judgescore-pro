-- Add Invitation model for secure multi-tenant signup

CREATE TABLE IF NOT EXISTS "Invitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'ATLETA',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX IF NOT EXISTS "Invitation_organizationId_idx" ON "Invitation"("organizationId");
CREATE INDEX IF NOT EXISTS "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");
CREATE INDEX IF NOT EXISTS "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");
CREATE INDEX IF NOT EXISTS "Invitation_usedAt_idx" ON "Invitation"("usedAt");

DO $$ BEGIN
  BEGIN
    ALTER TABLE "Invitation"
      ADD CONSTRAINT "Invitation_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
