-- CreateTable
CREATE TABLE `courts` (
    `courtId` BIGINT NOT NULL AUTO_INCREMENT,
    `state` VARCHAR(100) NOT NULL,
    `county` VARCHAR(255) NOT NULL,
    `courtName` VARCHAR(500) NOT NULL,
    `courthouse` TEXT NULL,

    UNIQUE INDEX `courts_state_county_courtName_key`(`state`(100), `county`(255), `courtName`(300)),
    PRIMARY KEY (`courtId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `judges` (
    `judgeId` BIGINT NOT NULL AUTO_INCREMENT,
    `judgeName` VARCHAR(500) NOT NULL,
    `courtId` BIGINT NULL,
    `appointedBy` TEXT NULL,
    `barNumber` TEXT NULL,
    `barAdmissionDate` DATE NULL,
    `sourceJson` JSON NULL,

    UNIQUE INDEX `judges_judgeName_courtId_key`(`judgeName`, `courtId`),
    PRIMARY KEY (`judgeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `judges` ADD CONSTRAINT `judges_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `courts`(`courtId`) ON DELETE SET NULL ON UPDATE CASCADE;
