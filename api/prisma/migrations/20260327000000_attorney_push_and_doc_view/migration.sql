-- CreateTable
CREATE TABLE `attorney_push_devices` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expoPushToken` VARCHAR(512) NOT NULL,
    `platform` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attorney_push_devices_expoPushToken_key`(`expoPushToken`),
    INDEX `attorney_push_devices_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attorney_push_devices` ADD CONSTRAINT `attorney_push_devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `document_requests` ADD COLUMN `attorneyViewedAt` DATETIME(3) NULL;
ALTER TABLE `document_requests` ADD COLUMN `lastNudgeAt` DATETIME(3) NULL;
