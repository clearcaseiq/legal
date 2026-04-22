-- CreateTable
CREATE TABLE `cases` (
    `casePk` BIGINT NOT NULL AUTO_INCREMENT,
    `trellisCaseNumber` VARCHAR(100) NOT NULL,
    `trellisUrl` TEXT NULL,
    `trellisCaseId` TEXT NULL,
    `courtId` BIGINT NULL,
    `caseCaption` TEXT NULL,
    `practiceArea` TEXT NULL,
    `caseCategory` TEXT NULL,
    `caseType` TEXT NULL,
    `matterType` TEXT NULL,
    `filingDate` DATE NULL,
    `status` VARCHAR(100) NULL,
    `isFederal` BOOLEAN NOT NULL DEFAULT false,
    `dispositionDate` DATE NULL,
    `dispositionType` TEXT NULL,
    `verdictAmount` DECIMAL(14, 2) NULL,
    `sourceCaseJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cases_trellisCaseNumber_courtId_key`(`trellisCaseNumber`, `courtId`),
    INDEX `idx_cases_filing_date`(`filingDate`),
    INDEX `idx_cases_status`(`status`),
    PRIMARY KEY (`casePk`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cases` ADD CONSTRAINT `cases_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `courts`(`courtId`) ON DELETE SET NULL ON UPDATE CASCADE;
