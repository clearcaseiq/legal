-- AlterTable
ALTER TABLE `assessments` ADD COLUMN `manualReviewStatus` VARCHAR(191) NULL,
    ADD COLUMN `manualReviewReason` VARCHAR(191) NULL,
    ADD COLUMN `manualReviewHeldAt` DATETIME(3) NULL,
    ADD COLUMN `manualReviewNote` TEXT NULL;
