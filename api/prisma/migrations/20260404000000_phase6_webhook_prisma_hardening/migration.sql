-- CreateTable
CREATE TABLE `sms_webhook_receipts` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'twilio',
    `messageSid` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NULL,
    `fromPhone` VARCHAR(191) NULL,
    `normalizedFrom` VARCHAR(191) NULL,
    `messageBody` TEXT NULL,
    `decision` VARCHAR(191) NULL,
    `attorneyId` VARCHAR(191) NULL,
    `responseCode` INTEGER NULL,
    `responseMessage` TEXT NULL,
    `processingStatus` VARCHAR(191) NOT NULL DEFAULT 'received',
    `introductionId` VARCHAR(191) NULL,
    `leadSubmissionId` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sms_webhook_receipts_messageSid_key`(`messageSid`),
    INDEX `sms_webhook_receipts_attorneyId_idx`(`attorneyId`),
    INDEX `sms_webhook_receipts_processingStatus_createdAt_idx`(`processingStatus`, `createdAt`),
    INDEX `sms_webhook_receipts_introductionId_idx`(`introductionId`),
    INDEX `sms_webhook_receipts_leadSubmissionId_idx`(`leadSubmissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `attorneys_phone_idx` ON `attorneys`(`phone`);

-- CreateIndex
CREATE INDEX `introductions_attorneyId_status_requestedAt_idx` ON `introductions`(`attorneyId`, `status`, `requestedAt`);

-- CreateIndex
CREATE INDEX `introductions_assessmentId_idx` ON `introductions`(`assessmentId`);

-- AddForeignKey
ALTER TABLE `sms_webhook_receipts` ADD CONSTRAINT `sms_webhook_receipts_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
