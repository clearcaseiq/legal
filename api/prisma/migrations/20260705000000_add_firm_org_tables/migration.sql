-- Firm organizational tables (offices, teams, members, team memberships).
-- These models exist in schema.prisma and are used by the Firm Dashboard
-- ("Add Legal Staff" writes to `firm_members`), but no migration ever created
-- the tables — so the member upsert threw and the UI reported "unable to create
-- Member" (#226). Created idempotently (IF NOT EXISTS with inline indexes/FKs)
-- so this is safe whether or not the tables already exist in a given database.

CREATE TABLE IF NOT EXISTS `firm_offices` (
    `id` VARCHAR(191) NOT NULL,
    `lawFirmId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `countiesServed` TEXT NULL,
    `languages` TEXT NULL,
    `practiceAreas` TEXT NULL,
    `capacity` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `firm_offices_lawFirmId_idx`(`lawFirmId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `firm_offices_lawFirmId_fkey` FOREIGN KEY (`lawFirmId`) REFERENCES `law_firms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `firm_teams` (
    `id` VARCHAR(191) NOT NULL,
    `lawFirmId` VARCHAR(191) NOT NULL,
    `officeId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `teamType` VARCHAR(191) NOT NULL DEFAULT 'case_team',
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `firm_teams_lawFirmId_idx`(`lawFirmId`),
    INDEX `firm_teams_officeId_idx`(`officeId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `firm_teams_lawFirmId_fkey` FOREIGN KEY (`lawFirmId`) REFERENCES `law_firms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `firm_teams_officeId_fkey` FOREIGN KEY (`officeId`) REFERENCES `firm_offices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `firm_members` (
    `id` VARCHAR(191) NOT NULL,
    `lawFirmId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NULL,
    `officeId` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'intake_specialist',
    `title` VARCHAR(191) NULL,
    `permissions` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `invitedAt` DATETIME(3) NULL,
    `joinedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `firm_members_lawFirmId_userId_key`(`lawFirmId`, `userId`),
    INDEX `firm_members_lawFirmId_role_idx`(`lawFirmId`, `role`),
    INDEX `firm_members_attorneyId_idx`(`attorneyId`),
    INDEX `firm_members_officeId_idx`(`officeId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `firm_members_lawFirmId_fkey` FOREIGN KEY (`lawFirmId`) REFERENCES `law_firms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `firm_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `firm_members_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `firm_members_officeId_fkey` FOREIGN KEY (`officeId`) REFERENCES `firm_offices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `firm_team_members` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `firmMemberId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `firm_team_members_teamId_firmMemberId_key`(`teamId`, `firmMemberId`),
    INDEX `firm_team_members_userId_idx`(`userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `firm_team_members_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `firm_teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `firm_team_members_firmMemberId_fkey` FOREIGN KEY (`firmMemberId`) REFERENCES `firm_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `firm_team_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
