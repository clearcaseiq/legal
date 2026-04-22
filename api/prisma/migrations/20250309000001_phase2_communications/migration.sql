-- Phase 2: Platform notification events, support tickets, case threads
CREATE TABLE `platform_notification_events` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `attorneyId` VARCHAR(191) NULL,
    `assessmentId` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `templateKey` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `subject` TEXT NULL,
    `body` LONGTEXT NULL,
    `payloadJson` LONGTEXT NULL,
    `recipient` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `nextRetryAt` DATETIME(3) NULL,
    `resendCount` INTEGER NOT NULL DEFAULT 0,
    `lastResendAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `platform_notification_events_userId_idx`(`userId`),
    INDEX `platform_notification_events_attorneyId_idx`(`attorneyId`),
    INDEX `platform_notification_events_assessmentId_idx`(`assessmentId`),
    INDEX `platform_notification_events_eventType_idx`(`eventType`),
    INDEX `platform_notification_events_status_idx`(`status`),
    INDEX `platform_notification_events_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `platform_notification_events` ADD CONSTRAINT `platform_notification_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `platform_notification_events` ADD CONSTRAINT `platform_notification_events_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `platform_notification_events` ADD CONSTRAINT `platform_notification_events_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `platform_notification_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `notificationId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `providerStatusCode` INTEGER NULL,
    `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `errorMessage` TEXT NULL,

    INDEX `platform_notification_attempts_notificationId_idx`(`notificationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `platform_notification_attempts` ADD CONSTRAINT `platform_notification_attempts_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `platform_notification_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `support_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `attorneyId` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `subject` TEXT NOT NULL,
    `description` LONGTEXT NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `assignedAdminId` VARCHAR(191) NULL,
    `resolutionNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,

    INDEX `support_tickets_userId_idx`(`userId`),
    INDEX `support_tickets_attorneyId_idx`(`attorneyId`),
    INDEX `support_tickets_caseId_idx`(`caseId`),
    INDEX `support_tickets_status_idx`(`status`),
    INDEX `support_tickets_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `assessments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_assignedAdminId_fkey` FOREIGN KEY (`assignedAdminId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `support_ticket_messages` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `senderRole` VARCHAR(191) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `attachmentUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `support_ticket_messages_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `support_ticket_messages` ADD CONSTRAINT `support_ticket_messages_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `case_threads` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `threadType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `lastMessageAt` DATETIME(3) NULL,
    `unreadCountPlaintiff` INTEGER NOT NULL DEFAULT 0,
    `unreadCountAttorney` INTEGER NOT NULL DEFAULT 0,
    `unreadCountAdmin` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `case_threads_assessmentId_threadType_key`(`assessmentId`, `threadType`),
    INDEX `case_threads_assessmentId_idx`(`assessmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `case_threads` ADD CONSTRAINT `case_threads_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `case_messages` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `senderRole` VARCHAR(191) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `messageType` VARCHAR(191) NOT NULL DEFAULT 'text',
    `attachmentUrl` VARCHAR(191) NULL,
    `deliveryStatus` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `case_messages_threadId_idx`(`threadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `case_messages` ADD CONSTRAINT `case_messages_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `case_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
