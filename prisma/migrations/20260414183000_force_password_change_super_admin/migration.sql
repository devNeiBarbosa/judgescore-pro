-- Add force-password-change support without breaking existing users
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Enforce first-login password rotation for canonical SUPER_ADMIN account
UPDATE "User"
SET "mustChangePassword" = true
WHERE LOWER("email") = 'dev.neibarbosa@gmail.com'
  AND "role" = 'SUPER_ADMIN';
