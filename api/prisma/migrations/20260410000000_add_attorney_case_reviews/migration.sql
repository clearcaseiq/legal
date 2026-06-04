CREATE TABLE `attorney_case_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `acceptCase` BOOLEAN NOT NULL,
    `settlementLow` DOUBLE NULL,
    `settlementExpected` DOUBLE NULL,
    `settlementHigh` DOUBLE NULL,
    `trialLow` DOUBLE NULL,
    `trialHigh` DOUBLE NULL,
    `confidence` DOUBLE NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
);

CREATE INDEX `attorney_case_reviews_attorneyId_idx` ON `attorney_case_reviews`(`attorneyId`);
CREATE INDEX `attorney_case_reviews_caseId_idx` ON `attorney_case_reviews`(`caseId`);

ALTER TABLE `attorney_case_reviews` ADD CONSTRAINT `attorney_case_reviews_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `attorney_case_reviews` ADD CONSTRAINT `attorney_case_reviews_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
