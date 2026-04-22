-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `role` VARCHAR(191) NOT NULL DEFAULT 'client',
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `googleId` VARCHAR(191) NULL,
    `appleId` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_googleId_key`(`googleId`),
    UNIQUE INDEX `users_appleId_key`(`appleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consents` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `consentType` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `granted` BOOLEAN NOT NULL,
    `grantedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `signatureData` VARCHAR(191) NULL,
    `signatureMethod` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `consentText` LONGTEXT NOT NULL,
    `consentHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessments` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `claimType` VARCHAR(191) NOT NULL,
    `venueState` VARCHAR(191) NOT NULL,
    `venueCounty` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `facts` LONGTEXT NOT NULL,
    `chatgptAnalysis` LONGTEXT NULL,
    `chatgptAnalysisDate` DATETIME(3) NULL,
    `similarCases` VARCHAR(191) NULL,
    `similarCasesUpdatedAt` DATETIME(3) NULL,
    `caseTierId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `insurance_details` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `carrierName` VARCHAR(191) NOT NULL,
    `policyNumber` VARCHAR(191) NULL,
    `policyLimit` DOUBLE NULL,
    `adjusterName` VARCHAR(191) NULL,
    `adjusterEmail` VARCHAR(191) NULL,
    `adjusterPhone` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lien_holders` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,
    `amount` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `taskType` VARCHAR(191) NOT NULL DEFAULT 'general',
    `milestoneType` VARCHAR(191) NULL,
    `checkpointType` VARCHAR(191) NULL,
    `deadlineType` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `reminderAt` DATETIME(3) NULL,
    `escalationLevel` VARCHAR(191) NOT NULL DEFAULT 'none',
    `assignedRole` VARCHAR(191) NULL,
    `assignedTo` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `notes` VARCHAR(191) NULL,
    `sourceTemplateId` VARCHAR(191) NULL,
    `sourceTemplateStepId` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_workflow_templates` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `caseType` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_workflow_steps` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `offsetDays` INTEGER NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `taskType` VARCHAR(191) NOT NULL DEFAULT 'general',
    `milestoneType` VARCHAR(191) NULL,
    `checkpointType` VARCHAR(191) NULL,
    `deadlineType` VARCHAR(191) NULL,
    `assignedRole` VARCHAR(191) NULL,
    `reminderOffsetDays` INTEGER NOT NULL DEFAULT 1,
    `escalationLevel` VARCHAR(191) NOT NULL DEFAULT 'none',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `negotiation_events` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NULL,
    `eventDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `notes` VARCHAR(191) NULL,
    `counterpartyType` VARCHAR(191) NULL,
    `insurerName` VARCHAR(191) NULL,
    `adjusterName` VARCHAR(191) NULL,
    `adjusterEmail` VARCHAR(191) NULL,
    `adjusterPhone` VARCHAR(191) NULL,
    `concessionValue` DOUBLE NULL,
    `concessionNotes` VARCHAR(191) NULL,
    `acceptanceRationale` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `negotiation_insights` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `data` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `negotiation_insights_assessmentId_key`(`assessmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_notes` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NULL,
    `authorEmail` VARCHAR(191) NULL,
    `noteType` VARCHAR(191) NOT NULL DEFAULT 'general',
    `message` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_comment_threads` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `threadType` VARCHAR(191) NOT NULL DEFAULT 'general',
    `allowedRoles` VARCHAR(191) NULL,
    `summary` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdByName` VARCHAR(191) NULL,
    `createdByEmail` VARCHAR(191) NULL,
    `lastCommentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `case_comment_threads_assessmentId_idx`(`assessmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_comments` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NULL,
    `authorEmail` VARCHAR(191) NULL,
    `message` VARCHAR(191) NOT NULL,
    `mentions` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `case_comments_threadId_idx`(`threadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_invoices` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `dueDate` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_payments` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `method` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_health_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `score` DOUBLE NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `factors` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_templates` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'email',
    `offsetDays` INTEGER NOT NULL DEFAULT 3,
    `message` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_reminders` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `channel` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'scheduled',
    `deliveryStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `sentAt` DATETIME(3) NULL,
    `lastAttemptAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `health_escalation_rules` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `threshold` DOUBLE NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `negotiation_cadence_templates` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `triggerEventType` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `negotiation_cadence_steps` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `offsetDays` INTEGER NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_sla_templates` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `triggerStatus` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_sla_steps` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `offsetDays` INTEGER NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_invoices` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `intervalDays` INTEGER NOT NULL DEFAULT 30,
    `nextRunAt` DATETIME(3) NOT NULL,
    `lastRunAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `predictions` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `modelVersion` VARCHAR(191) NOT NULL,
    `viability` VARCHAR(191) NOT NULL,
    `bands` VARCHAR(191) NOT NULL,
    `explain` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attorneys` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `specialties` VARCHAR(191) NOT NULL,
    `venues` VARCHAR(191) NOT NULL,
    `meta` LONGTEXT NULL,
    `profile` LONGTEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `responseTimeHours` INTEGER NOT NULL DEFAULT 24,
    `averageRating` DOUBLE NOT NULL DEFAULT 0.0,
    `totalReviews` INTEGER NOT NULL DEFAULT 0,
    `lawFirmId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attorneys_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `law_firms` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `primaryEmail` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `law_firms_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `firm_settings` (
    `id` VARCHAR(191) NOT NULL,
    `lawFirmId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `firm_settings_lawFirmId_idx`(`lawFirmId`),
    UNIQUE INDEX `firm_settings_lawFirmId_key_key`(`lawFirmId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feature_toggles` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `scope` VARCHAR(191) NOT NULL DEFAULT 'global',
    `lawFirmId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `feature_toggles_key_idx`(`key`),
    INDEX `feature_toggles_lawFirmId_idx`(`lawFirmId`),
    INDEX `feature_toggles_userId_idx`(`userId`),
    UNIQUE INDEX `feature_toggles_key_scope_lawFirmId_userId_key`(`key`, `scope`, `lawFirmId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attorney_decision_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `lawFirmId` VARCHAR(191) NULL,
    `negotiationStyle` VARCHAR(191) NULL,
    `riskTolerance` VARCHAR(191) NULL,
    `preferences` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attorney_decision_profiles_attorneyId_key`(`attorneyId`),
    INDEX `attorney_decision_profiles_lawFirmId_idx`(`lawFirmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimetype` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'UPLOADED',
    `extractedText` VARCHAR(191) NULL,
    `summary` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `introductions` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `message` VARCHAR(191) NOT NULL DEFAULT '',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `demand_letters` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `targetAmount` DOUBLE NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorite_attorneys` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `favorite_attorneys_userId_attorneyId_key`(`userId`, `attorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL DEFAULT '',
    `message` VARCHAR(191) NOT NULL,
    `metadata` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deliveredAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SCHEDULED',
    `scheduledAt` DATETIME(3) NOT NULL,
    `duration` INTEGER NOT NULL DEFAULT 30,
    `notes` VARCHAR(191) NULL,
    `meetingUrl` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attorney_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `review` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attorney_reviews_attorneyId_userId_key`(`attorneyId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attorney_availability` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attorney_availability_attorneyId_dayOfWeek_key`(`attorneyId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_rooms` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `lastMessageAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `chat_rooms_userId_attorneyId_key`(`userId`, `attorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` VARCHAR(191) NOT NULL,
    `chatRoomId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `senderType` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `messageType` VARCHAR(191) NOT NULL DEFAULT 'text',
    `metadata` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chatbot_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `context` VARCHAR(191) NOT NULL,
    `lastInteraction` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `chatbot_sessions_sessionId_key`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attorney_dashboard` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `leadFilters` VARCHAR(191) NULL,
    `exclusivitySettings` VARCHAR(191) NULL,
    `totalLeadsReceived` INTEGER NOT NULL DEFAULT 0,
    `totalLeadsAccepted` INTEGER NOT NULL DEFAULT 0,
    `totalFeesCollected` DOUBLE NOT NULL DEFAULT 0,
    `totalPlatformSpend` DOUBLE NOT NULL DEFAULT 0,
    `pricingModel` VARCHAR(191) NOT NULL DEFAULT 'per_lead',
    `volumeDiscounts` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attorney_dashboard_attorneyId_key`(`attorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_intake_requests` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NULL,
    `leadId` VARCHAR(191) NULL,
    `kind` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NULL,
    `payload` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attorney_intake_configs` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `config` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attorney_intake_configs_attorneyId_key`(`attorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `viabilityScore` DOUBLE NOT NULL DEFAULT 0,
    `liabilityScore` DOUBLE NOT NULL DEFAULT 0,
    `causationScore` DOUBLE NOT NULL DEFAULT 0,
    `damagesScore` DOUBLE NOT NULL DEFAULT 0,
    `evidenceChecklist` LONGTEXT NULL,
    `isExclusive` BOOLEAN NOT NULL DEFAULT false,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourceDetails` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastContactAt` DATETIME(3) NULL,
    `hotnessLevel` VARCHAR(191) NOT NULL DEFAULT 'warm',
    `assignedAttorneyId` VARCHAR(191) NULL,
    `assignmentType` VARCHAR(191) NOT NULL DEFAULT 'shared',
    `status` VARCHAR(191) NOT NULL DEFAULT 'submitted',
    `convertedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lead_submissions_assessmentId_key`(`assessmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `decision_memories` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `lawFirmId` VARCHAR(191) NULL,
    `recommendedDecision` VARCHAR(191) NOT NULL,
    `recommendedConfidence` DOUBLE NOT NULL,
    `recommendedRationale` VARCHAR(191) NULL,
    `recommendedData` VARCHAR(191) NULL,
    `attorneyDecision` VARCHAR(191) NULL,
    `attorneyRationale` VARCHAR(191) NULL,
    `override` BOOLEAN NOT NULL DEFAULT false,
    `decisionAt` DATETIME(3) NULL,
    `outcomeStatus` VARCHAR(191) NULL,
    `outcomeNotes` VARCHAR(191) NULL,
    `outcomeAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `decision_memories_leadId_key`(`leadId`),
    INDEX `decision_memories_lawFirmId_idx`(`lawFirmId`),
    INDEX `decision_memories_attorneyId_idx`(`attorneyId`),
    INDEX `decision_memories_assessmentId_idx`(`assessmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_contacts` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `contactType` VARCHAR(191) NOT NULL,
    `contactMethod` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `scheduledAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attorney_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `bio` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `specialties` VARCHAR(191) NULL,
    `languages` VARCHAR(191) NULL,
    `yearsExperience` INTEGER NOT NULL DEFAULT 0,
    `totalCases` INTEGER NOT NULL DEFAULT 0,
    `totalSettlements` DOUBLE NOT NULL DEFAULT 0,
    `averageSettlement` DOUBLE NOT NULL DEFAULT 0,
    `successRate` DOUBLE NOT NULL DEFAULT 0,
    `verifiedVerdicts` VARCHAR(191) NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `featuredUntil` DATETIME(3) NULL,
    `boostLevel` INTEGER NOT NULL DEFAULT 0,
    `totalReviews` INTEGER NOT NULL DEFAULT 0,
    `averageRating` DOUBLE NOT NULL DEFAULT 0,
    `firmName` VARCHAR(191) NULL,
    `firmLocations` VARCHAR(191) NULL,
    `jurisdictions` VARCHAR(191) NULL,
    `minInjurySeverity` INTEGER NULL,
    `excludedCaseTypes` VARCHAR(191) NULL,
    `minDamagesRange` DOUBLE NULL,
    `maxDamagesRange` DOUBLE NULL,
    `maxCasesPerWeek` INTEGER NULL,
    `maxCasesPerMonth` INTEGER NULL,
    `intakeHours` VARCHAR(191) NULL,
    `pricingModel` VARCHAR(191) NULL,
    `paymentModel` VARCHAR(191) NULL,
    `subscriptionTier` VARCHAR(191) NULL,
    `subscriptionActive` BOOLEAN NOT NULL DEFAULT false,
    `subscriptionRemainingCases` INTEGER NULL,
    `accountBalance` DOUBLE NOT NULL DEFAULT 0,
    `tier1Enabled` BOOLEAN NOT NULL DEFAULT false,
    `tier2Enabled` BOOLEAN NOT NULL DEFAULT false,
    `historicalAcceptanceRate` DOUBLE NULL,
    `responseSpeedScore` DOUBLE NULL,
    `recentConversionScore` DOUBLE NULL,
    `recentTier1ConversionRate` DOUBLE NULL,
    `recentTier2ConversionRate` DOUBLE NULL,
    `accountBalanceWeight` DOUBLE NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `licenseState` VARCHAR(191) NULL,
    `licenseFileUrl` VARCHAR(191) NULL,
    `licenseFileName` VARCHAR(191) NULL,
    `licenseVerified` BOOLEAN NOT NULL DEFAULT false,
    `licenseVerifiedAt` DATETIME(3) NULL,
    `licenseVerificationMethod` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attorney_profiles_attorneyId_key`(`attorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_tiers` (
    `id` VARCHAR(191) NOT NULL,
    `tierNumber` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `minSettlementRange` DOUBLE NULL,
    `maxSettlementRange` DOUBLE NULL,
    `buyingModel` VARCHAR(191) NOT NULL,
    `lawyerProfile` VARCHAR(191) NOT NULL,
    `goal` VARCHAR(191) NOT NULL,
    `caseTypes` VARCHAR(191) NOT NULL,
    `characteristics` VARCHAR(191) NOT NULL,
    `promotionRules` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `case_tiers_tierNumber_key`(`tierNumber`),
    UNIQUE INDEX `case_tiers_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `attorneyId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `statusCode` INTEGER NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `metadata` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_attorneyId_idx`(`attorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ethical_walls` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `blockedAttorneyId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ethical_walls_assessmentId_idx`(`assessmentId`),
    INDEX `ethical_walls_blockedAttorneyId_idx`(`blockedAttorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_retention_policies` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `retentionDays` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL DEFAULT 'archive',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `data_retention_policies_entityType_idx`(`entityType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compliance_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `hipaaAligned` BOOLEAN NOT NULL DEFAULT false,
    `soc2Ready` BOOLEAN NOT NULL DEFAULT false,
    `secureApis` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `compliance_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `case_shares` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `sharedByAttorneyId` VARCHAR(191) NOT NULL,
    `sharedWithAttorneyId` VARCHAR(191) NULL,
    `sharedWithFirmName` VARCHAR(191) NULL,
    `sharedWithEmail` VARCHAR(191) NULL,
    `accessLevel` VARCHAR(191) NOT NULL DEFAULT 'view',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `message` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `case_shares_assessmentId_idx`(`assessmentId`),
    INDEX `case_shares_sharedByAttorneyId_idx`(`sharedByAttorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referral_agreements` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `referringAttorneyId` VARCHAR(191) NOT NULL,
    `receivingAttorneyId` VARCHAR(191) NULL,
    `receivingFirmName` VARCHAR(191) NULL,
    `receivingEmail` VARCHAR(191) NULL,
    `feeSplitPercent` DOUBLE NULL,
    `projectedRecovery` DOUBLE NULL,
    `referringFeeAmount` DOUBLE NULL,
    `receivingFeeAmount` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'proposed',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `referral_agreements_assessmentId_idx`(`assessmentId`),
    INDEX `referral_agreements_referringAttorneyId_idx`(`referringAttorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `co_counsel_workflows` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `leadAttorneyId` VARCHAR(191) NOT NULL,
    `coCounselAttorneyId` VARCHAR(191) NULL,
    `coCounselFirmName` VARCHAR(191) NULL,
    `coCounselEmail` VARCHAR(191) NULL,
    `feeSplitPercent` DOUBLE NULL,
    `projectedRecovery` DOUBLE NULL,
    `leadFeeAmount` DOUBLE NULL,
    `coCounselFeeAmount` DOUBLE NULL,
    `workflowStatus` VARCHAR(191) NOT NULL DEFAULT 'initiated',
    `nextStep` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `co_counsel_workflows_assessmentId_idx`(`assessmentId`),
    INDEX `co_counsel_workflows_leadAttorneyId_idx`(`leadAttorneyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `periodType` VARCHAR(191) NOT NULL,
    `totalLeads` INTEGER NOT NULL DEFAULT 0,
    `leadsAccepted` INTEGER NOT NULL DEFAULT 0,
    `leadsRejected` INTEGER NOT NULL DEFAULT 0,
    `leadsConverted` INTEGER NOT NULL DEFAULT 0,
    `totalFees` DOUBLE NOT NULL DEFAULT 0,
    `averageFee` DOUBLE NOT NULL DEFAULT 0,
    `platformSpend` DOUBLE NOT NULL DEFAULT 0,
    `roi` DOUBLE NOT NULL DEFAULT 0,
    `funnelMetrics` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conflict_checks` (
    `id` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `conflictType` VARCHAR(191) NOT NULL,
    `conflictDetails` VARCHAR(191) NULL,
    `riskLevel` VARCHAR(191) NOT NULL DEFAULT 'low',
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `resolutionNotes` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_reports` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `overallQuality` VARCHAR(191) NOT NULL DEFAULT 'good',
    `qualityScore` DOUBLE NOT NULL DEFAULT 0,
    `issues` VARCHAR(191) NULL,
    `isSpam` BOOLEAN NOT NULL DEFAULT false,
    `isDuplicate` BOOLEAN NOT NULL DEFAULT false,
    `reportedBy` VARCHAR(191) NULL,
    `reportReason` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `resolution` VARCHAR(191) NULL,
    `creditIssued` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quality_reports_leadId_key`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medical_providers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `specialty` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `zipCode` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `acceptsLien` BOOLEAN NOT NULL DEFAULT false,
    `lienTerms` VARCHAR(191) NULL,
    `averageLienRate` DOUBLE NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `totalReviews` INTEGER NOT NULL DEFAULT 0,
    `serviceRadius` INTEGER NOT NULL DEFAULT 25,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provider_referrals` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `attorneyId` VARCHAR(191) NOT NULL,
    `referralType` VARCHAR(191) NOT NULL DEFAULT 'treatment',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `referralDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responseDate` DATETIME(3) NULL,
    `treatmentStartDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evidence_files` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimetype` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `subcategory` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `dataType` VARCHAR(191) NOT NULL DEFAULT 'unstructured',
    `tags` VARCHAR(191) NULL,
    `relevanceScore` DOUBLE NOT NULL DEFAULT 0,
    `uploadMethod` VARCHAR(191) NOT NULL DEFAULT 'drag_drop',
    `captureDate` DATETIME(3) NULL,
    `location` VARCHAR(191) NULL,
    `exifData` VARCHAR(191) NULL,
    `processingStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `ocrText` VARCHAR(191) NULL,
    `aiSummary` VARCHAR(191) NULL,
    `aiClassification` VARCHAR(191) NULL,
    `aiHighlights` VARCHAR(191) NULL,
    `isHIPAA` BOOLEAN NOT NULL DEFAULT false,
    `accessLevel` VARCHAR(191) NOT NULL DEFAULT 'private',
    `retentionPolicy` VARCHAR(191) NULL,
    `provenanceSource` VARCHAR(191) NULL,
    `provenanceNotes` VARCHAR(191) NULL,
    `provenanceActor` VARCHAR(191) NULL,
    `provenanceDate` DATETIME(3) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verifiedBy` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evidence_annotations` (
    `id` VARCHAR(191) NOT NULL,
    `evidenceFileId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `anchor` VARCHAR(191) NULL,
    `pageNumber` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `extracted_data` (
    `id` VARCHAR(191) NOT NULL,
    `evidenceFileId` VARCHAR(191) NOT NULL,
    `icdCodes` VARCHAR(191) NULL,
    `cptCodes` VARCHAR(191) NULL,
    `dollarAmounts` VARCHAR(191) NULL,
    `totalAmount` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `dates` VARCHAR(191) NULL,
    `timeline` VARCHAR(191) NULL,
    `entities` VARCHAR(191) NULL,
    `keywords` VARCHAR(191) NULL,
    `confidence` DOUBLE NOT NULL DEFAULT 0.0,
    `isManualReview` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evidence_processing_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `evidenceFileId` VARCHAR(191) NOT NULL,
    `jobType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `priority` INTEGER NOT NULL DEFAULT 5,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `results` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evidence_access_logs` (
    `id` VARCHAR(191) NOT NULL,
    `evidenceFileId` VARCHAR(191) NOT NULL,
    `accessedBy` VARCHAR(191) NOT NULL,
    `accessType` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `purpose` VARCHAR(191) NULL,
    `duration` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `consents` ADD CONSTRAINT `consents_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_caseTierId_fkey` FOREIGN KEY (`caseTierId`) REFERENCES `case_tiers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `insurance_details` ADD CONSTRAINT `insurance_details_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lien_holders` ADD CONSTRAINT `lien_holders_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_tasks` ADD CONSTRAINT `case_tasks_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_workflow_templates` ADD CONSTRAINT `case_workflow_templates_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_workflow_steps` ADD CONSTRAINT `case_workflow_steps_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `case_workflow_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `negotiation_events` ADD CONSTRAINT `negotiation_events_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `negotiation_insights` ADD CONSTRAINT `negotiation_insights_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_notes` ADD CONSTRAINT `case_notes_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_comment_threads` ADD CONSTRAINT `case_comment_threads_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_comments` ADD CONSTRAINT `case_comments_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `case_comment_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_invoices` ADD CONSTRAINT `billing_invoices_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_payments` ADD CONSTRAINT `billing_payments_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_health_snapshots` ADD CONSTRAINT `case_health_snapshots_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_templates` ADD CONSTRAINT `reminder_templates_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_reminders` ADD CONSTRAINT `case_reminders_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_reminders` ADD CONSTRAINT `case_reminders_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `reminder_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `health_escalation_rules` ADD CONSTRAINT `health_escalation_rules_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `negotiation_cadence_templates` ADD CONSTRAINT `negotiation_cadence_templates_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `negotiation_cadence_steps` ADD CONSTRAINT `negotiation_cadence_steps_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `negotiation_cadence_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_sla_templates` ADD CONSTRAINT `task_sla_templates_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_sla_steps` ADD CONSTRAINT `task_sla_steps_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `task_sla_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_invoices` ADD CONSTRAINT `recurring_invoices_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attorneys` ADD CONSTRAINT `attorneys_lawFirmId_fkey` FOREIGN KEY (`lawFirmId`) REFERENCES `law_firms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `firm_settings` ADD CONSTRAINT `firm_settings_lawFirmId_fkey` FOREIGN KEY (`lawFirmId`) REFERENCES `law_firms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feature_toggles` ADD CONSTRAINT `feature_toggles_lawFirmId_fkey` FOREIGN KEY (`lawFirmId`) REFERENCES `law_firms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feature_toggles` ADD CONSTRAINT `feature_toggles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attorney_decision_profiles` ADD CONSTRAINT `attorney_decision_profiles_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attorney_decision_profiles` ADD CONSTRAINT `attorney_decision_profiles_lawFirmId_fkey` FOREIGN KEY (`lawFirmId`) REFERENCES `law_firms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `introductions` ADD CONSTRAINT `introductions_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `introductions` ADD CONSTRAINT `introductions_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demand_letters` ADD CONSTRAINT `demand_letters_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite_attorneys` ADD CONSTRAINT `favorite_attorneys_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite_attorneys` ADD CONSTRAINT `favorite_attorneys_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attorney_reviews` ADD CONSTRAINT `attorney_reviews_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attorney_reviews` ADD CONSTRAINT `attorney_reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attorney_availability` ADD CONSTRAINT `attorney_availability_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_rooms` ADD CONSTRAINT `chat_rooms_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_rooms` ADD CONSTRAINT `chat_rooms_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_rooms` ADD CONSTRAINT `chat_rooms_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_chatRoomId_fkey` FOREIGN KEY (`chatRoomId`) REFERENCES `chat_rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chatbot_sessions` ADD CONSTRAINT `chatbot_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attorney_dashboard` ADD CONSTRAINT `attorney_dashboard_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_intake_requests` ADD CONSTRAINT `case_intake_requests_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_intake_requests` ADD CONSTRAINT `case_intake_requests_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attorney_intake_configs` ADD CONSTRAINT `attorney_intake_configs_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_submissions` ADD CONSTRAINT `lead_submissions_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_submissions` ADD CONSTRAINT `lead_submissions_assignedAttorneyId_fkey` FOREIGN KEY (`assignedAttorneyId`) REFERENCES `attorneys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `decision_memories` ADD CONSTRAINT `decision_memories_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `decision_memories` ADD CONSTRAINT `decision_memories_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `decision_memories` ADD CONSTRAINT `decision_memories_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `decision_memories` ADD CONSTRAINT `decision_memories_lawFirmId_fkey` FOREIGN KEY (`lawFirmId`) REFERENCES `law_firms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_contacts` ADD CONSTRAINT `lead_contacts_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_contacts` ADD CONSTRAINT `lead_contacts_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attorney_profiles` ADD CONSTRAINT `attorney_profiles_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ethical_walls` ADD CONSTRAINT `ethical_walls_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ethical_walls` ADD CONSTRAINT `ethical_walls_blockedAttorneyId_fkey` FOREIGN KEY (`blockedAttorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_shares` ADD CONSTRAINT `case_shares_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_shares` ADD CONSTRAINT `case_shares_sharedByAttorneyId_fkey` FOREIGN KEY (`sharedByAttorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `case_shares` ADD CONSTRAINT `case_shares_sharedWithAttorneyId_fkey` FOREIGN KEY (`sharedWithAttorneyId`) REFERENCES `attorneys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_agreements` ADD CONSTRAINT `referral_agreements_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_agreements` ADD CONSTRAINT `referral_agreements_referringAttorneyId_fkey` FOREIGN KEY (`referringAttorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_agreements` ADD CONSTRAINT `referral_agreements_receivingAttorneyId_fkey` FOREIGN KEY (`receivingAttorneyId`) REFERENCES `attorneys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `co_counsel_workflows` ADD CONSTRAINT `co_counsel_workflows_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `co_counsel_workflows` ADD CONSTRAINT `co_counsel_workflows_leadAttorneyId_fkey` FOREIGN KEY (`leadAttorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `co_counsel_workflows` ADD CONSTRAINT `co_counsel_workflows_coCounselAttorneyId_fkey` FOREIGN KEY (`coCounselAttorneyId`) REFERENCES `attorneys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_analytics` ADD CONSTRAINT `lead_analytics_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conflict_checks` ADD CONSTRAINT `conflict_checks_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conflict_checks` ADD CONSTRAINT `conflict_checks_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_reports` ADD CONSTRAINT `quality_reports_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `provider_referrals` ADD CONSTRAINT `provider_referrals_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `provider_referrals` ADD CONSTRAINT `provider_referrals_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `medical_providers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `provider_referrals` ADD CONSTRAINT `provider_referrals_attorneyId_fkey` FOREIGN KEY (`attorneyId`) REFERENCES `attorneys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence_files` ADD CONSTRAINT `evidence_files_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence_files` ADD CONSTRAINT `evidence_files_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence_annotations` ADD CONSTRAINT `evidence_annotations_evidenceFileId_fkey` FOREIGN KEY (`evidenceFileId`) REFERENCES `evidence_files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence_annotations` ADD CONSTRAINT `evidence_annotations_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extracted_data` ADD CONSTRAINT `extracted_data_evidenceFileId_fkey` FOREIGN KEY (`evidenceFileId`) REFERENCES `evidence_files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence_processing_jobs` ADD CONSTRAINT `evidence_processing_jobs_evidenceFileId_fkey` FOREIGN KEY (`evidenceFileId`) REFERENCES `evidence_files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence_access_logs` ADD CONSTRAINT `evidence_access_logs_evidenceFileId_fkey` FOREIGN KEY (`evidenceFileId`) REFERENCES `evidence_files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

