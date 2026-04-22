-- Routing lifecycle: Introduction extensions, RoutingWave, RoutingAnalytics, AttorneyReputationScore, LeadSubmission lifecycle
ALTER TABLE `introductions` ADD COLUMN `declineReason` VARCHAR(191) NULL;
ALTER TABLE `introductions` ADD COLUMN `requestedInfoNotes` TEXT NULL;
ALTER TABLE `introductions` ADD COLUMN `waveNumber` INTEGER NOT NULL DEFAULT 1;

CREATE TABLE `routing_waves` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `waveNumber` INTEGER NOT NULL,
    `attorneyIds` LONGTEXT NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nextEscalationAt` DATETIME(3) NULL,
    `escalatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `routing_waves_assessmentId_waveNumber_key`(`assessmentId`, `waveNumber`),
    INDEX `routing_waves_assessmentId_idx`(`assessmentId`),
    INDEX `routing_waves_nextEscalationAt_idx`(`nextEscalationAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `routing_waves` ADD CONSTRAINT `routing_waves_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `routing_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `introductionId` VARCHAR(191) NULL,
    `attorneyId` VARCHAR(191) NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `eventData` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `routing_analytics_assessmentId_idx`(`assessmentId`),
    INDEX `routing_analytics_attorneyId_idx`(`attorneyId`),
    INDEX `routing_analytics_eventType_idx`(`eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `attorney_reputation_scores` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `responseSpeedScore` DOUBLE NOT NULL DEFAULT 0,
    `acceptanceRate` DOUBLE NOT NULL DEFAULT 0,
    `plaintiffSatisfaction` DOUBLE NOT NULL DEFAULT 0,
    `caseFollowThrough` DOUBLE NOT NULL DEFAULT 0,
    `evidenceRequestQuality` DOUBLE NOT NULL DEFAULT 0,
    `overallScore` DOUBLE NOT NULL DEFAULT 0,
    `lastCalculatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attorney_reputation_scores_attorneyId_key`(`attorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `attorney_reputation_scores` ADD CONSTRAINT `attorney_reputation_scores_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `lead_submissions` ADD COLUMN `lifecycleState` VARCHAR(191) NOT NULL DEFAULT 'routing_active';
ALTER TABLE `lead_submissions` ADD COLUMN `routingLocked` BOOLEAN NOT NULL DEFAULT false;
