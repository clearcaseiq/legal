-- CreateTable
CREATE TABLE `documents` (
    `documentId` BIGINT NOT NULL AUTO_INCREMENT,
    `casePk` BIGINT NOT NULL,
    `docketEventId` BIGINT NULL,
    `documentTitle` TEXT NULL,
    `documentType` TEXT NULL,
    `filedDate` DATE NULL,
    `pageCount` INT NULL,
    `fileUrl` TEXT NULL,
    `trellisToken` TEXT NULL,
    `availability` TEXT NULL,
    `textContent` LONGTEXT NULL,
    `textHash` TEXT NULL,
    `sourceDocJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_docs_case`(`casePk`),
    INDEX `idx_docs_type`(`documentType`(255)),
    FULLTEXT INDEX `idx_docs_text_ft`(`textContent`),
    PRIMARY KEY (`documentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_casePk_fkey` FOREIGN KEY (`casePk`) REFERENCES `cases`(`casePk`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_docketEventId_fkey` FOREIGN KEY (`docketEventId`) REFERENCES `docket_events`(`docketEventId`) ON DELETE SET NULL ON UPDATE CASCADE;
