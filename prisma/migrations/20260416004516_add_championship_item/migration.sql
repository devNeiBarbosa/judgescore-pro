-- CreateTable
CREATE TABLE "ChampionshipItem" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceInCents" INTEGER NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionshipItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChampionshipItem_championshipId_idx" ON "ChampionshipItem"("championshipId");

-- CreateIndex
CREATE INDEX "ChampionshipItem_organizationId_idx" ON "ChampionshipItem"("organizationId");

-- AddForeignKey
ALTER TABLE "ChampionshipItem" ADD CONSTRAINT "ChampionshipItem_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipItem" ADD CONSTRAINT "ChampionshipItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
