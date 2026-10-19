-- AlterTable
ALTER TABLE "law_firms" ADD COLUMN "sendingDomain" TEXT,
ADD COLUMN "sendingDomainStatus" TEXT,
ADD COLUMN "sendingDomainDkimTokens" TEXT,
ADD COLUMN "sendingDomainVerifiedAt" TIMESTAMP(3),
ADD COLUMN "sendingDomainCheckedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "law_firms_sendingDomain_key" ON "law_firms"("sendingDomain");
