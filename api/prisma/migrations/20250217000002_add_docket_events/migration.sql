-- CreateTable
CREATE TABLE `docket_events` (
    `docketEventId` BIGINT NOT NULL AUTO_INCREMENT,
    `casePk` BIGINT NOT NULL,
    `eventDate` DATE NOT NULL,
    `entryType` TEXT NULL,
    `motionType` TEXT NULL,
    `description` TEXT NOT NULL,
    `fullDescription` TEXT NULL,
    `filingPerson` TEXT NULL,
    `judgeName` TEXT NULL,
    `documentRequestToken` TEXT NULL,
    `sourceEventJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_docket_case_date`(`casePk`, `eventDate`),
    FULLTEXT INDEX `idx_docket_desc_ft`(`description`),
    PRIMARY KEY (`docketEventId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `docket_events` ADD CONSTRAINT `docket_events_casePk_fkey` FOREIGN KEY (`casePk`) REFERENCES `cases`(`casePk`) ON DELETE CASCADE ON UPDATE CASCADE;
