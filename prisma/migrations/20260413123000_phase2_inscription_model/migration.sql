-- CreateEnum
CREATE TYPE "InscriptionStatus" AS ENUM ('REGISTERED', 'CONFIRMED', 'CHECKIN_PENDING', 'CHECKIN_DONE', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "Championship" DROP CONSTRAINT "Championship_organizationId_fkey";

-- DropIndex
DROP INDEX "Championship_slug_key";

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "baseRegistration" BOOLEAN NOT NULL DEFAULT true,
    "extraCategories" INTEGER NOT NULL DEFAULT 0,
    "totalCategoriesAllowed" INTEGER NOT NULL DEFAULT 1,
    "status" "InscriptionStatus" NOT NULL DEFAULT 'REGISTERED',
    "painting" BOOLEAN NOT NULL DEFAULT false,
    "photos" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inscription_athleteId_idx" ON "Inscription"("athleteId");

-- CreateIndex
CREATE INDEX "Inscription_championshipId_idx" ON "Inscription"("championshipId");

-- CreateIndex
CREATE INDEX "Inscription_organizationId_idx" ON "Inscription"("organizationId");

-- CreateIndex
CREATE INDEX "Inscription_status_idx" ON "Inscription"("status");

-- CreateIndex
CREATE INDEX "Inscription_organizationId_championshipId_idx" ON "Inscription"("organizationId", "championshipId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_athleteId_championshipId_key" ON "Inscription"("athleteId", "championshipId");

-- CreateIndex
CREATE INDEX "CategoryRegistration_organizationId_idx" ON "CategoryRegistration"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Championship_organizationId_slug_key" ON "Championship"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "ChampionshipReferee_organizationId_idx" ON "ChampionshipReferee"("organizationId");

-- CreateIndex
CREATE INDEX "Combo_organizationId_idx" ON "Combo"("organizationId");

-- CreateIndex
CREATE INDEX "ComboProduct_organizationId_idx" ON "ComboProduct"("organizationId");

-- CreateIndex
CREATE INDEX "OrderItem_organizationId_idx" ON "OrderItem"("organizationId");

-- CreateIndex
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");

-- AddForeignKey
ALTER TABLE "Championship" ADD CONSTRAINT "Championship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipReferee" ADD CONSTRAINT "ChampionshipReferee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRegistration" ADD CONSTRAINT "CategoryRegistration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combo" ADD CONSTRAINT "Combo_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboProduct" ADD CONSTRAINT "ComboProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

