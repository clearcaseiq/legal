-- CreateTable
CREATE TABLE `complaint_extractions` (
    `casePk` BIGINT NOT NULL,
    `juryDemandFlag` BOOLEAN NULL,
    `wrongfulDeathFlag` BOOLEAN NULL,
    `survivalActionFlag` BOOLEAN NULL,
    `medmalFlag` BOOLEAN NULL,
    `grossNegligenceFlag` BOOLEAN NULL,
    `injurySeverityLevel` INT NULL,
    `procedureComplexityLevel` INT NULL,
    `allegationThemes` JSON NULL,
    `extractedPartiesCount` INT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`casePk`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `complaint_extractions` ADD CONSTRAINT `complaint_extractions_casePk_fkey` FOREIGN KEY (`casePk`) REFERENCES `cases`(`casePk`) ON DELETE CASCADE ON UPDATE CASCADE;
