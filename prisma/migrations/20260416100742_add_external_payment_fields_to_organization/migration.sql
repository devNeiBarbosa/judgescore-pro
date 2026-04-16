-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "externalPaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "externalPaymentLabel" TEXT,
ADD COLUMN     "externalPaymentUrl" TEXT;

