-- CreateTable
CREATE TABLE `ml_feature_snapshots` (
    `snapshotId` BIGINT NOT NULL AUTO_INCREMENT,
    `casePk` BIGINT NOT NULL,
    `cutoffType` VARCHAR(50) NOT NULL,
    `cutoffDate` DATE NULL,
    `state` TEXT NULL,
    `county` TEXT NULL,
    `caseType` TEXT NULL,
    `matterType` TEXT NULL,
    `numDefendants` INT NULL,
    `numPlaintiffs` INT NULL,
    `corporateDefendantFlag` BOOLEAN NULL,
    `medicalProfessionalDefendantFlag` BOOLEAN NULL,
    `juryDemandFlag` BOOLEAN NULL,
    `wrongfulDeathFlag` BOOLEAN NULL,
    `injurySeverityLevel` INT NULL,
    `procedureComplexityLevel` INT NULL,
    `motionCountTotal` INT NULL,
    `msjFiledFlag` BOOLEAN NULL,
    `juryFeesPostedFlag` BOOLEAN NULL,
    `goodFaithSettlementFlag` BOOLEAN NULL,
    `continuancesCount` INT NULL,
    `daysSinceFiling` INT NULL,
    `engineeredFeatures` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ml_feature_snapshots_casePk_cutoffType_key`(`casePk`, `cutoffType`),
    INDEX `idx_ml_snapshots_cutoff`(`cutoffType`),
    INDEX `idx_ml_snapshots_case`(`casePk`),
    PRIMARY KEY (`snapshotId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ml_feature_snapshots` ADD CONSTRAINT `ml_feature_snapshots_casePk_fkey` FOREIGN KEY (`casePk`) REFERENCES `cases`(`casePk`) ON DELETE CASCADE ON UPDATE CASCADE;
