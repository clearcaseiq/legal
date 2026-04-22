-- CreateTable
CREATE TABLE `event_type_map` (
    `eventTypeCode` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,

    PRIMARY KEY (`eventTypeCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `docket_event_tags` (
    `docketEventTagId` BIGINT NOT NULL AUTO_INCREMENT,
    `docketEventId` BIGINT NOT NULL,
    `eventTypeCode` VARCHAR(100) NOT NULL,
    `confidence` DECIMAL(4, 3) NOT NULL DEFAULT 1.000,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `docket_event_tags_docketEventId_eventTypeCode_key`(`docketEventId`, `eventTypeCode`),
    INDEX `idx_event_tags_event`(`docketEventId`),
    INDEX `idx_event_tags_type`(`eventTypeCode`),
    PRIMARY KEY (`docketEventTagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `docket_event_tags` ADD CONSTRAINT `docket_event_tags_docketEventId_fkey` FOREIGN KEY (`docketEventId`) REFERENCES `docket_events`(`docketEventId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `docket_event_tags` ADD CONSTRAINT `docket_event_tags_eventTypeCode_fkey` FOREIGN KEY (`eventTypeCode`) REFERENCES `event_type_map`(`eventTypeCode`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed event_type_map
INSERT INTO `event_type_map` (`eventTypeCode`, `description`) VALUES
('COMPLAINT_FILED', 'Complaint filed'),
('ANSWER_FILED', 'Answer filed'),
('JURY_DEMAND', 'Demand for jury trial'),
('JURY_FEES_POSTED', 'Jury fees posted'),
('TRIAL_SET', 'Trial date set'),
('MSC_SET', 'Mandatory settlement conference set'),
('MSC_HELD', 'Mandatory settlement conference held'),
('MSJ_FILED', 'Motion for summary judgment filed'),
('MSJ_HEARING_SET', 'MSJ hearing set'),
('MSJ_GRANTED', 'MSJ granted'),
('MSJ_DENIED', 'MSJ denied'),
('MSJ_TAKEN_OFF_CALENDAR', 'MSJ taken off calendar'),
('GOOD_FAITH_SETTLEMENT_8776', 'CCP 877.6 good faith settlement'),
('DISMISSAL', 'Dismissal filed/entered'),
('JUDGMENT', 'Judgment entered'),
('VERDICT', 'Verdict entered'),
('SETTLEMENT', 'Settlement indicated');
