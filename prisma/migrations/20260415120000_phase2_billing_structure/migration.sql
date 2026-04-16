-- CreateEnum
CREATE TYPE "BillingPlanType" AS ENUM ('MONTHLY', 'RECURRING', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingExpiresAt" TIMESTAMP(3),
ADD COLUMN     "billingPlanType" "BillingPlanType",
ADD COLUMN     "billingStartsAt" TIMESTAMP(3),
ADD COLUMN     "billingStatus" "BillingStatus",
ADD COLUMN     "brandingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "championshipsUsedInCycle" INTEGER NOT NULL DEFAULT 0;

