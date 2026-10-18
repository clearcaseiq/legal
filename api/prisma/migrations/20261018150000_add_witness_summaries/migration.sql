-- AlterTable
ALTER TABLE `liability_evidence_items`
  ADD COLUMN `witnessName` VARCHAR(191) NULL,
  ADD COLUMN `summary` TEXT NULL,
  ADD COLUMN `demandExcerpt` TEXT NULL;
