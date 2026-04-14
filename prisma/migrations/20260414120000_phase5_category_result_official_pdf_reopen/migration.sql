-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('OPEN_FOR_JUDGING', 'ALL_JUDGES_FINALIZED', 'RESULT_FINALIZED', 'REOPENED');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "status" "CategoryStatus" NOT NULL DEFAULT 'OPEN_FOR_JUDGING';

-- CreateTable
CREATE TABLE "CategoryResult" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isOfficial" BOOLEAN NOT NULL DEFAULT true,
    "invalidatedAt" TIMESTAMP(3),
    "invalidatedById" TEXT,
    "invalidationReason" TEXT,
    "resultData" JSONB NOT NULL,

    CONSTRAINT "CategoryResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryResult_organizationId_idx" ON "CategoryResult"("organizationId");

-- CreateIndex
CREATE INDEX "CategoryResult_championshipId_categoryId_idx" ON "CategoryResult"("championshipId", "categoryId");

-- CreateIndex
CREATE INDEX "CategoryResult_organizationId_championshipId_categoryId_isO_idx" ON "CategoryResult"("organizationId", "championshipId", "categoryId", "isOfficial");

-- CreateIndex
CREATE INDEX "CategoryResult_generatedById_idx" ON "CategoryResult"("generatedById");

-- CreateIndex
CREATE INDEX "CategoryResult_invalidatedById_idx" ON "CategoryResult"("invalidatedById");

-- CreateIndex
CREATE INDEX "CategoryResult_generatedAt_idx" ON "CategoryResult"("generatedAt");

-- CreateIndex
CREATE INDEX "Category_status_idx" ON "Category"("status");

-- AddForeignKey
ALTER TABLE "CategoryResult" ADD CONSTRAINT "CategoryResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryResult" ADD CONSTRAINT "CategoryResult_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryResult" ADD CONSTRAINT "CategoryResult_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryResult" ADD CONSTRAINT "CategoryResult_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryResult" ADD CONSTRAINT "CategoryResult_invalidatedById_fkey" FOREIGN KEY ("invalidatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Judgment_organizationId_judgeId_championshipId_categoryId_posit" RENAME TO "Judgment_organizationId_judgeId_championshipId_categoryId_p_key";

