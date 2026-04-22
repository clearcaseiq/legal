-- CreateTable
CREATE TABLE `case_contacts` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `companyUrl` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `contactType` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `case_contacts_leadId_idx`(`leadId`),
    INDEX `case_contacts_attorneyId_idx`(`attorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `case_contacts` ADD CONSTRAINT `case_contacts_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_contacts` ADD CONSTRAINT `case_contacts_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
