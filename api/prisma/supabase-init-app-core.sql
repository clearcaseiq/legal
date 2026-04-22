CREATE SCHEMA IF NOT EXISTS app_core;
SET search_path TO app_core, public;
-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'client',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "googleId" TEXT,
    "appleId" TEXT,
    "avatar" TEXT,
    "provider" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_push_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expoPushToken" VARCHAR(512) NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "signatureData" TEXT,
    "signatureMethod" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentText" TEXT NOT NULL,
    "consentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "claimType" TEXT NOT NULL,
    "venueState" TEXT NOT NULL,
    "venueCounty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "facts" TEXT NOT NULL,
    "chatgptAnalysis" TEXT,
    "chatgptAnalysisDate" TIMESTAMP(3),
    "similarCases" TEXT,
    "similarCasesUpdatedAt" TIMESTAMP(3),
    "caseTierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "manualReviewStatus" TEXT,
    "manualReviewReason" TEXT,
    "manualReviewHeldAt" TIMESTAMP(3),
    "manualReviewNote" TEXT,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_details" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "carrierName" TEXT NOT NULL,
    "policyNumber" TEXT,
    "policyLimit" DOUBLE PRECISION,
    "adjusterName" TEXT,
    "adjusterEmail" TEXT,
    "adjusterPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lien_holders" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "amount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lien_holders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_tasks" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taskType" TEXT NOT NULL DEFAULT 'general',
    "milestoneType" TEXT,
    "checkpointType" TEXT,
    "deadlineType" TEXT,
    "dueDate" TIMESTAMP(3),
    "reminderAt" TIMESTAMP(3),
    "escalationLevel" TEXT NOT NULL DEFAULT 'none',
    "assignedRole" TEXT,
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "notes" TEXT,
    "sourceTemplateId" TEXT,
    "sourceTemplateStepId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_workflow_templates" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_workflow_steps" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "taskType" TEXT NOT NULL DEFAULT 'general',
    "milestoneType" TEXT,
    "checkpointType" TEXT,
    "deadlineType" TEXT,
    "assignedRole" TEXT,
    "reminderOffsetDays" INTEGER NOT NULL DEFAULT 1,
    "escalationLevel" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiation_events" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "counterpartyType" TEXT,
    "insurerName" TEXT,
    "adjusterName" TEXT,
    "adjusterEmail" TEXT,
    "adjusterPhone" TEXT,
    "concessionValue" DOUBLE PRECISION,
    "concessionNotes" TEXT,
    "acceptanceRationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negotiation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiation_insights" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negotiation_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_notes" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "noteType" TEXT NOT NULL DEFAULT 'general',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_comment_threads" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "threadType" TEXT NOT NULL DEFAULT 'general',
    "allowedRoles" TEXT,
    "summary" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdByEmail" TEXT,
    "lastCommentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_comment_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_comments" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "message" TEXT NOT NULL,
    "mentions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payments" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_health_snapshots" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" TEXT NOT NULL,
    "factors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_health_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_templates" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "offsetDays" INTEGER NOT NULL DEFAULT 3,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_reminders" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "templateId" TEXT,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_escalation_rules" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiation_cadence_templates" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerEventType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negotiation_cadence_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiation_cadence_steps" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "negotiation_cadence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_sla_templates" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerStatus" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_sla_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_sla_steps" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',

    CONSTRAINT "task_sla_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoices" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "intervalDays" INTEGER NOT NULL DEFAULT 30,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "viability" TEXT NOT NULL,
    "bands" TEXT NOT NULL,
    "explain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorneys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialties" TEXT NOT NULL,
    "venues" TEXT NOT NULL,
    "meta" TEXT,
    "profile" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "responseTimeHours" INTEGER NOT NULL DEFAULT 24,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "lawFirmId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorneys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "law_firms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primaryEmail" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "law_firms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firm_settings" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firm_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_toggles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "lawFirmId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_toggles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_decision_profiles" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "lawFirmId" TEXT,
    "negotiationStyle" TEXT,
    "riskTolerance" TEXT,
    "preferences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_decision_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT,
    "originalName" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "extractedText" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "introductions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "requestedInfoNotes" TEXT,
    "waveNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "introductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_webhook_receipts" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'twilio',
    "messageSid" TEXT,
    "requestId" TEXT,
    "fromPhone" TEXT,
    "normalizedFrom" TEXT,
    "messageBody" TEXT,
    "decision" TEXT,
    "attorneyId" TEXT,
    "responseCode" INTEGER,
    "responseMessage" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'received',
    "introductionId" TEXT,
    "leadSubmissionId" TEXT,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_webhook_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_waves" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "waveNumber" INTEGER NOT NULL,
    "attorneyIds" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextEscalationAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_waves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_analytics" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "introductionId" TEXT,
    "attorneyId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_reputation_scores" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "responseSpeedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plaintiffSatisfaction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "caseFollowThrough" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidenceRequestQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_reputation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_letters" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "recipient" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demand_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_attorneys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_attorneys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_notification_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "attorneyId" TEXT,
    "assessmentId" TEXT,
    "role" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "templateKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subject" TEXT,
    "body" TEXT,
    "payloadJson" TEXT,
    "recipient" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "lastResendAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_notification_attempts" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "providerStatusCode" INTEGER,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,

    CONSTRAINT "platform_notification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "userId" TEXT,
    "attorneyId" TEXT,
    "role" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedAdminId" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_threads" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "threadType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastMessageAt" TIMESTAMP(3),
    "unreadCountPlaintiff" INTEGER NOT NULL DEFAULT 0,
    "unreadCountAttorney" INTEGER NOT NULL DEFAULT 0,
    "unreadCountAdmin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "attachmentUrl" TEXT,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'sent',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "meetingUrl" TEXT,
    "location" TEXT,
    "phoneNumber" TEXT,
    "externalCalendarProvider" TEXT,
    "externalCalendarEventId" TEXT,
    "externalCalendarSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_calendar_connections" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "externalAccountEmail" TEXT,
    "calendarId" TEXT,
    "calendarName" TEXT,
    "timezone" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'disconnected',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "webhookChannelId" TEXT,
    "webhookResourceId" TEXT,
    "webhookSubscriptionId" TEXT,
    "webhookClientState" TEXT,
    "webhookToken" TEXT,
    "webhookExpiresAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_calendar_busy_blocks" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "sourceKey" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_calendar_busy_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_reviews" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "review" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_availability" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "metadata" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "lastInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_dashboard" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "leadFilters" TEXT,
    "exclusivitySettings" TEXT,
    "totalLeadsReceived" INTEGER NOT NULL DEFAULT 0,
    "totalLeadsAccepted" INTEGER NOT NULL DEFAULT 0,
    "totalFeesCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPlatformSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricingModel" TEXT NOT NULL DEFAULT 'per_lead',
    "volumeDiscounts" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_intake_requests" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "leadId" TEXT,
    "kind" TEXT NOT NULL,
    "source" TEXT,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_intake_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_intake_configs" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_intake_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_submissions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "viabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "causationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damagesScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidenceChecklist" TEXT,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" TEXT NOT NULL,
    "sourceDetails" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastContactAt" TIMESTAMP(3),
    "hotnessLevel" TEXT NOT NULL DEFAULT 'warm',
    "assignedAttorneyId" TEXT,
    "assignmentType" TEXT NOT NULL DEFAULT 'shared',
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "convertedAt" TIMESTAMP(3),
    "lifecycleState" TEXT NOT NULL DEFAULT 'routing_active',
    "routingLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_memories" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "lawFirmId" TEXT,
    "recommendedDecision" TEXT NOT NULL,
    "recommendedConfidence" DOUBLE PRECISION NOT NULL,
    "recommendedRationale" TEXT,
    "recommendedData" TEXT,
    "attorneyDecision" TEXT,
    "attorneyRationale" TEXT,
    "override" BOOLEAN NOT NULL DEFAULT false,
    "decisionAt" TIMESTAMP(3),
    "outcomeStatus" TEXT,
    "outcomeNotes" TEXT,
    "outcomeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_contacts" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "contactType" TEXT NOT NULL,
    "contactMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_contacts" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "companyUrl" TEXT,
    "title" TEXT,
    "contactType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requests" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "requestedDocs" TEXT NOT NULL,
    "customMessage" TEXT,
    "secureToken" TEXT NOT NULL,
    "uploadLink" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attorneyViewedAt" TIMESTAMP(3),
    "lastNudgeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_profiles" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "specialties" TEXT,
    "languages" TEXT,
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "totalCases" INTEGER NOT NULL DEFAULT 0,
    "totalSettlements" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageSettlement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verifiedVerdicts" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredUntil" TIMESTAMP(3),
    "boostLevel" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firmName" TEXT,
    "firmWebsite" TEXT,
    "firmLocations" TEXT,
    "jurisdictions" TEXT,
    "secondaryCaseTypes" TEXT,
    "minInjurySeverity" INTEGER,
    "excludedCaseTypes" TEXT,
    "minDamagesRange" DOUBLE PRECISION,
    "maxDamagesRange" DOUBLE PRECISION,
    "insuranceRequired" BOOLEAN,
    "mustHaveMedicalTreatment" BOOLEAN,
    "requirePoliceReport" BOOLEAN,
    "requireMedicalRecords" BOOLEAN,
    "maxCasesPerWeek" INTEGER,
    "maxCasesPerMonth" INTEGER,
    "intakeHours" TEXT,
    "pricingModel" TEXT,
    "paymentModel" TEXT,
    "subscriptionTier" TEXT,
    "subscriptionActive" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionRemainingCases" INTEGER,
    "accountBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier1Enabled" BOOLEAN NOT NULL DEFAULT false,
    "tier2Enabled" BOOLEAN NOT NULL DEFAULT false,
    "historicalAcceptanceRate" DOUBLE PRECISION,
    "responseSpeedScore" DOUBLE PRECISION,
    "recentConversionScore" DOUBLE PRECISION,
    "recentTier1ConversionRate" DOUBLE PRECISION,
    "recentTier2ConversionRate" DOUBLE PRECISION,
    "accountBalanceWeight" DOUBLE PRECISION,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "licenseFileUrl" TEXT,
    "licenseFileName" TEXT,
    "licenseVerified" BOOLEAN NOT NULL DEFAULT false,
    "licenseVerifiedAt" TIMESTAMP(3),
    "licenseVerificationMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_import_runs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "notes" TEXT,
    "errorMessage" TEXT,
    "pagesDiscovered" INTEGER NOT NULL DEFAULT 0,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "pagesParsed" INTEGER NOT NULL DEFAULT 0,
    "attorneysCreated" INTEGER NOT NULL DEFAULT 0,
    "attorneysUpdated" INTEGER NOT NULL DEFAULT 0,
    "attorneysSkipped" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorney_import_sources" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "sourceUrl" VARCHAR(1024) NOT NULL,
    "sourceUrlHash" VARCHAR(64) NOT NULL,
    "rawContentHash" VARCHAR(64),
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "parseWarnings" TEXT,
    "sourcePayload" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "lastParsedAt" TIMESTAMP(3),
    "attorneyId" TEXT,
    "importRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attorney_import_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_tiers" (
    "id" TEXT NOT NULL,
    "tierNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minSettlementRange" DOUBLE PRECISION,
    "maxSettlementRange" DOUBLE PRECISION,
    "buyingModel" TEXT NOT NULL,
    "lawyerProfile" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "caseTypes" TEXT NOT NULL,
    "characteristics" TEXT NOT NULL,
    "promotionRules" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "attorneyId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "statusCode" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ethical_walls" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "blockedAttorneyId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ethical_walls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'archive',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hipaaAligned" BOOLEAN NOT NULL DEFAULT false,
    "soc2Ready" BOOLEAN NOT NULL DEFAULT false,
    "secureApis" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_shares" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sharedByAttorneyId" TEXT NOT NULL,
    "sharedWithAttorneyId" TEXT,
    "sharedWithFirmName" TEXT,
    "sharedWithEmail" TEXT,
    "accessLevel" TEXT NOT NULL DEFAULT 'view',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_agreements" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "referringAttorneyId" TEXT NOT NULL,
    "receivingAttorneyId" TEXT,
    "receivingFirmName" TEXT,
    "receivingEmail" TEXT,
    "feeSplitPercent" DOUBLE PRECISION,
    "projectedRecovery" DOUBLE PRECISION,
    "referringFeeAmount" DOUBLE PRECISION,
    "receivingFeeAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "co_counsel_workflows" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "leadAttorneyId" TEXT NOT NULL,
    "coCounselAttorneyId" TEXT,
    "coCounselFirmName" TEXT,
    "coCounselEmail" TEXT,
    "feeSplitPercent" DOUBLE PRECISION,
    "projectedRecovery" DOUBLE PRECISION,
    "leadFeeAmount" DOUBLE PRECISION,
    "coCounselFeeAmount" DOUBLE PRECISION,
    "workflowStatus" TEXT NOT NULL DEFAULT 'initiated',
    "nextStep" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "co_counsel_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_analytics" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" TEXT NOT NULL,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "leadsAccepted" INTEGER NOT NULL DEFAULT 0,
    "leadsRejected" INTEGER NOT NULL DEFAULT 0,
    "leadsConverted" INTEGER NOT NULL DEFAULT 0,
    "totalFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "funnelMetrics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conflict_checks" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "conflictDetails" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conflict_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_reports" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "overallQuality" TEXT NOT NULL DEFAULT 'good',
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issues" TEXT,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "reportedBy" TEXT,
    "reportReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "creditIssued" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "acceptsLien" BOOLEAN NOT NULL DEFAULT false,
    "lienTerms" TEXT,
    "averageLienRate" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "serviceRadius" INTEGER NOT NULL DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_referrals" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "referralType" TEXT NOT NULL DEFAULT 'treatment',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseDate" TIMESTAMP(3),
    "treatmentStartDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_files" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "originalName" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "description" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'unstructured',
    "tags" TEXT,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uploadMethod" TEXT NOT NULL DEFAULT 'drag_drop',
    "captureDate" TIMESTAMP(3),
    "location" TEXT,
    "exifData" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "ocrText" TEXT,
    "aiSummary" TEXT,
    "aiClassification" TEXT,
    "aiHighlights" TEXT,
    "isHIPAA" BOOLEAN NOT NULL DEFAULT false,
    "accessLevel" TEXT NOT NULL DEFAULT 'private',
    "retentionPolicy" TEXT,
    "provenanceSource" TEXT,
    "provenanceNotes" TEXT,
    "provenanceActor" TEXT,
    "provenanceDate" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_annotations" (
    "id" TEXT NOT NULL,
    "evidenceFileId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "anchor" TEXT,
    "pageNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_data" (
    "id" TEXT NOT NULL,
    "evidenceFileId" TEXT NOT NULL,
    "icdCodes" TEXT,
    "cptCodes" TEXT,
    "dollarAmounts" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dates" TEXT,
    "timeline" TEXT,
    "entities" TEXT,
    "keywords" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isManualReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extracted_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_processing_jobs" (
    "id" TEXT NOT NULL,
    "evidenceFileId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "results" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_access_logs" (
    "id" TEXT NOT NULL,
    "evidenceFileId" TEXT NOT NULL,
    "accessedBy" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "purpose" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "courtId" BIGSERIAL NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "county" VARCHAR(255) NOT NULL,
    "courtName" VARCHAR(500) NOT NULL,
    "courthouse" TEXT,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("courtId")
);

-- CreateTable
CREATE TABLE "cases" (
    "casePk" BIGSERIAL NOT NULL,
    "trellisCaseNumber" VARCHAR(100) NOT NULL,
    "trellisUrl" TEXT,
    "trellisCaseId" TEXT,
    "courtId" BIGINT,
    "caseCaption" TEXT,
    "practiceArea" TEXT,
    "caseCategory" TEXT,
    "caseType" TEXT,
    "matterType" TEXT,
    "filingDate" DATE,
    "status" VARCHAR(100),
    "isFederal" BOOLEAN NOT NULL DEFAULT false,
    "dispositionDate" DATE,
    "dispositionType" TEXT,
    "verdictAmount" DECIMAL(14,2),
    "sourceCaseJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("casePk")
);

-- CreateTable
CREATE TABLE "docket_events" (
    "docketEventId" BIGSERIAL NOT NULL,
    "casePk" BIGINT NOT NULL,
    "eventDate" DATE NOT NULL,
    "entryType" TEXT,
    "motionType" TEXT,
    "description" TEXT NOT NULL,
    "fullDescription" TEXT,
    "filingPerson" TEXT,
    "judgeName" TEXT,
    "documentRequestToken" TEXT,
    "sourceEventJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "docket_events_pkey" PRIMARY KEY ("docketEventId")
);

-- CreateTable
CREATE TABLE "event_type_map" (
    "eventTypeCode" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "event_type_map_pkey" PRIMARY KEY ("eventTypeCode")
);

-- CreateTable
CREATE TABLE "docket_event_tags" (
    "docketEventTagId" BIGSERIAL NOT NULL,
    "docketEventId" BIGINT NOT NULL,
    "eventTypeCode" VARCHAR(100) NOT NULL,
    "confidence" DECIMAL(4,3) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "docket_event_tags_pkey" PRIMARY KEY ("docketEventTagId")
);

-- CreateTable
CREATE TABLE "judges" (
    "judgeId" BIGSERIAL NOT NULL,
    "judgeName" VARCHAR(500) NOT NULL,
    "courtId" BIGINT,
    "appointedBy" TEXT,
    "barNumber" TEXT,
    "barAdmissionDate" DATE,
    "sourceJson" JSONB,

    CONSTRAINT "judges_pkey" PRIMARY KEY ("judgeId")
);

-- CreateTable
CREATE TABLE "documents" (
    "documentId" BIGSERIAL NOT NULL,
    "casePk" BIGINT NOT NULL,
    "docketEventId" BIGINT,
    "documentTitle" TEXT,
    "documentType" TEXT,
    "filedDate" DATE,
    "pageCount" INTEGER,
    "fileUrl" TEXT,
    "trellisToken" TEXT,
    "availability" TEXT,
    "textContent" TEXT,
    "textHash" TEXT,
    "sourceDocJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("documentId")
);

-- CreateTable
CREATE TABLE "complaint_extractions" (
    "casePk" BIGINT NOT NULL,
    "juryDemandFlag" BOOLEAN,
    "wrongfulDeathFlag" BOOLEAN,
    "survivalActionFlag" BOOLEAN,
    "medmalFlag" BOOLEAN,
    "grossNegligenceFlag" BOOLEAN,
    "injurySeverityLevel" INTEGER,
    "procedureComplexityLevel" INTEGER,
    "allegationThemes" JSONB,
    "extractedPartiesCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaint_extractions_pkey" PRIMARY KEY ("casePk")
);

-- CreateTable
CREATE TABLE "ml_feature_snapshots" (
    "snapshotId" BIGSERIAL NOT NULL,
    "casePk" BIGINT NOT NULL,
    "cutoffType" VARCHAR(50) NOT NULL,
    "cutoffDate" DATE,
    "state" TEXT,
    "county" TEXT,
    "caseType" TEXT,
    "matterType" TEXT,
    "numDefendants" INTEGER,
    "numPlaintiffs" INTEGER,
    "corporateDefendantFlag" BOOLEAN,
    "medicalProfessionalDefendantFlag" BOOLEAN,
    "juryDemandFlag" BOOLEAN,
    "wrongfulDeathFlag" BOOLEAN,
    "injurySeverityLevel" INTEGER,
    "procedureComplexityLevel" INTEGER,
    "motionCountTotal" INTEGER,
    "msjFiledFlag" BOOLEAN,
    "juryFeesPostedFlag" BOOLEAN,
    "goodFaithSettlementFlag" BOOLEAN,
    "continuancesCount" INTEGER,
    "daysSinceFiling" INTEGER,
    "engineeredFeatures" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_feature_snapshots_pkey" PRIMARY KEY ("snapshotId")
);

-- CreateTable
CREATE TABLE "trial_labels" (
    "casePk" BIGINT NOT NULL,
    "trialSetFlag" BOOLEAN,
    "reachedTrialFlag" BOOLEAN,

    CONSTRAINT "trial_labels_pkey" PRIMARY KEY ("casePk")
);

-- CreateTable
CREATE TABLE "settlement_records" (
    "id" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "venueState" TEXT NOT NULL,
    "venueCounty" TEXT,
    "injurySeverity" INTEGER,
    "settlementAmount" DOUBLE PRECISION NOT NULL,
    "medCharges" DOUBLE PRECISION,
    "wageLoss" DOUBLE PRECISION,
    "treatmentMonths" INTEGER,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_appleId_key" ON "users"("appleId");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_push_devices_expoPushToken_key" ON "attorney_push_devices"("expoPushToken");

-- CreateIndex
CREATE INDEX "attorney_push_devices_userId_idx" ON "attorney_push_devices"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "negotiation_insights_assessmentId_key" ON "negotiation_insights"("assessmentId");

-- CreateIndex
CREATE INDEX "case_comment_threads_assessmentId_idx" ON "case_comment_threads"("assessmentId");

-- CreateIndex
CREATE INDEX "case_comments_threadId_idx" ON "case_comments"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "attorneys_email_key" ON "attorneys"("email");

-- CreateIndex
CREATE INDEX "attorneys_phone_idx" ON "attorneys"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "law_firms_slug_key" ON "law_firms"("slug");

-- CreateIndex
CREATE INDEX "firm_settings_lawFirmId_idx" ON "firm_settings"("lawFirmId");

-- CreateIndex
CREATE UNIQUE INDEX "firm_settings_lawFirmId_key_key" ON "firm_settings"("lawFirmId", "key");

-- CreateIndex
CREATE INDEX "feature_toggles_key_idx" ON "feature_toggles"("key");

-- CreateIndex
CREATE INDEX "feature_toggles_lawFirmId_idx" ON "feature_toggles"("lawFirmId");

-- CreateIndex
CREATE INDEX "feature_toggles_userId_idx" ON "feature_toggles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_toggles_key_scope_lawFirmId_userId_key" ON "feature_toggles"("key", "scope", "lawFirmId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_decision_profiles_attorneyId_key" ON "attorney_decision_profiles"("attorneyId");

-- CreateIndex
CREATE INDEX "attorney_decision_profiles_lawFirmId_idx" ON "attorney_decision_profiles"("lawFirmId");

-- CreateIndex
CREATE INDEX "introductions_attorneyId_status_requestedAt_idx" ON "introductions"("attorneyId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "introductions_assessmentId_idx" ON "introductions"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "sms_webhook_receipts_messageSid_key" ON "sms_webhook_receipts"("messageSid");

-- CreateIndex
CREATE INDEX "sms_webhook_receipts_attorneyId_idx" ON "sms_webhook_receipts"("attorneyId");

-- CreateIndex
CREATE INDEX "sms_webhook_receipts_processingStatus_createdAt_idx" ON "sms_webhook_receipts"("processingStatus", "createdAt");

-- CreateIndex
CREATE INDEX "sms_webhook_receipts_introductionId_idx" ON "sms_webhook_receipts"("introductionId");

-- CreateIndex
CREATE INDEX "sms_webhook_receipts_leadSubmissionId_idx" ON "sms_webhook_receipts"("leadSubmissionId");

-- CreateIndex
CREATE INDEX "routing_waves_assessmentId_idx" ON "routing_waves"("assessmentId");

-- CreateIndex
CREATE INDEX "routing_waves_nextEscalationAt_idx" ON "routing_waves"("nextEscalationAt");

-- CreateIndex
CREATE UNIQUE INDEX "routing_waves_assessmentId_waveNumber_key" ON "routing_waves"("assessmentId", "waveNumber");

-- CreateIndex
CREATE INDEX "routing_analytics_assessmentId_idx" ON "routing_analytics"("assessmentId");

-- CreateIndex
CREATE INDEX "routing_analytics_attorneyId_idx" ON "routing_analytics"("attorneyId");

-- CreateIndex
CREATE INDEX "routing_analytics_eventType_idx" ON "routing_analytics"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_reputation_scores_attorneyId_key" ON "attorney_reputation_scores"("attorneyId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_attorneys_userId_attorneyId_key" ON "favorite_attorneys"("userId", "attorneyId");

-- CreateIndex
CREATE INDEX "platform_notification_events_userId_idx" ON "platform_notification_events"("userId");

-- CreateIndex
CREATE INDEX "platform_notification_events_attorneyId_idx" ON "platform_notification_events"("attorneyId");

-- CreateIndex
CREATE INDEX "platform_notification_events_assessmentId_idx" ON "platform_notification_events"("assessmentId");

-- CreateIndex
CREATE INDEX "platform_notification_events_eventType_idx" ON "platform_notification_events"("eventType");

-- CreateIndex
CREATE INDEX "platform_notification_events_status_idx" ON "platform_notification_events"("status");

-- CreateIndex
CREATE INDEX "platform_notification_events_createdAt_idx" ON "platform_notification_events"("createdAt");

-- CreateIndex
CREATE INDEX "platform_notification_attempts_notificationId_idx" ON "platform_notification_attempts"("notificationId");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_attorneyId_idx" ON "support_tickets"("attorneyId");

-- CreateIndex
CREATE INDEX "support_tickets_caseId_idx" ON "support_tickets"("caseId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_ticket_messages_ticketId_idx" ON "support_ticket_messages"("ticketId");

-- CreateIndex
CREATE INDEX "case_threads_assessmentId_idx" ON "case_threads"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "case_threads_assessmentId_threadType_key" ON "case_threads"("assessmentId", "threadType");

-- CreateIndex
CREATE UNIQUE INDEX "routing_config_key_key" ON "routing_config"("key");

-- CreateIndex
CREATE INDEX "case_messages_threadId_idx" ON "case_messages"("threadId");

-- CreateIndex
CREATE INDEX "attorney_calendar_connections_syncStatus_idx" ON "attorney_calendar_connections"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_calendar_connections_attorneyId_provider_key" ON "attorney_calendar_connections"("attorneyId", "provider");

-- CreateIndex
CREATE INDEX "attorney_calendar_busy_blocks_attorneyId_startTime_endTime_idx" ON "attorney_calendar_busy_blocks"("attorneyId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "attorney_calendar_busy_blocks_connectionId_idx" ON "attorney_calendar_busy_blocks"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_calendar_busy_blocks_connectionId_sourceKey_key" ON "attorney_calendar_busy_blocks"("connectionId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_reviews_attorneyId_userId_key" ON "attorney_reviews"("attorneyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_availability_attorneyId_dayOfWeek_key" ON "attorney_availability"("attorneyId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_userId_attorneyId_key" ON "chat_rooms"("userId", "attorneyId");

-- CreateIndex
CREATE UNIQUE INDEX "chatbot_sessions_sessionId_key" ON "chatbot_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_dashboard_attorneyId_key" ON "attorney_dashboard"("attorneyId");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_intake_configs_attorneyId_key" ON "attorney_intake_configs"("attorneyId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_submissions_assessmentId_key" ON "lead_submissions"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "decision_memories_leadId_key" ON "decision_memories"("leadId");

-- CreateIndex
CREATE INDEX "decision_memories_lawFirmId_idx" ON "decision_memories"("lawFirmId");

-- CreateIndex
CREATE INDEX "decision_memories_attorneyId_idx" ON "decision_memories"("attorneyId");

-- CreateIndex
CREATE INDEX "decision_memories_assessmentId_idx" ON "decision_memories"("assessmentId");

-- CreateIndex
CREATE INDEX "case_contacts_leadId_idx" ON "case_contacts"("leadId");

-- CreateIndex
CREATE INDEX "case_contacts_attorneyId_idx" ON "case_contacts"("attorneyId");

-- CreateIndex
CREATE UNIQUE INDEX "document_requests_secureToken_key" ON "document_requests"("secureToken");

-- CreateIndex
CREATE INDEX "document_requests_leadId_idx" ON "document_requests"("leadId");

-- CreateIndex
CREATE INDEX "document_requests_secureToken_idx" ON "document_requests"("secureToken");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_profiles_attorneyId_key" ON "attorney_profiles"("attorneyId");

-- CreateIndex
CREATE INDEX "attorney_import_runs_source_status_idx" ON "attorney_import_runs"("source", "status");

-- CreateIndex
CREATE INDEX "attorney_import_sources_attorneyId_idx" ON "attorney_import_sources"("attorneyId");

-- CreateIndex
CREATE INDEX "attorney_import_sources_importRunId_idx" ON "attorney_import_sources"("importRunId");

-- CreateIndex
CREATE INDEX "attorney_import_sources_source_status_idx" ON "attorney_import_sources"("source", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attorney_import_sources_source_sourceUrlHash_key" ON "attorney_import_sources"("source", "sourceUrlHash");

-- CreateIndex
CREATE UNIQUE INDEX "case_tiers_tierNumber_key" ON "case_tiers"("tierNumber");

-- CreateIndex
CREATE UNIQUE INDEX "case_tiers_name_key" ON "case_tiers"("name");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_attorneyId_idx" ON "audit_logs"("attorneyId");

-- CreateIndex
CREATE INDEX "ethical_walls_assessmentId_idx" ON "ethical_walls"("assessmentId");

-- CreateIndex
CREATE INDEX "ethical_walls_blockedAttorneyId_idx" ON "ethical_walls"("blockedAttorneyId");

-- CreateIndex
CREATE INDEX "data_retention_policies_entityType_idx" ON "data_retention_policies"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_settings_key_key" ON "compliance_settings"("key");

-- CreateIndex
CREATE INDEX "case_shares_assessmentId_idx" ON "case_shares"("assessmentId");

-- CreateIndex
CREATE INDEX "case_shares_sharedByAttorneyId_idx" ON "case_shares"("sharedByAttorneyId");

-- CreateIndex
CREATE INDEX "referral_agreements_assessmentId_idx" ON "referral_agreements"("assessmentId");

-- CreateIndex
CREATE INDEX "referral_agreements_referringAttorneyId_idx" ON "referral_agreements"("referringAttorneyId");

-- CreateIndex
CREATE INDEX "co_counsel_workflows_assessmentId_idx" ON "co_counsel_workflows"("assessmentId");

-- CreateIndex
CREATE INDEX "co_counsel_workflows_leadAttorneyId_idx" ON "co_counsel_workflows"("leadAttorneyId");

-- CreateIndex
CREATE UNIQUE INDEX "quality_reports_leadId_key" ON "quality_reports"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "courts_state_county_courtName_key" ON "courts"("state", "county", "courtName");

-- CreateIndex
CREATE INDEX "cases_filingDate_idx" ON "cases"("filingDate");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cases_trellisCaseNumber_courtId_key" ON "cases"("trellisCaseNumber", "courtId");

-- CreateIndex
CREATE INDEX "docket_events_casePk_eventDate_idx" ON "docket_events"("casePk", "eventDate");

-- CreateIndex
CREATE INDEX "docket_event_tags_docketEventId_idx" ON "docket_event_tags"("docketEventId");

-- CreateIndex
CREATE INDEX "docket_event_tags_eventTypeCode_idx" ON "docket_event_tags"("eventTypeCode");

-- CreateIndex
CREATE UNIQUE INDEX "docket_event_tags_docketEventId_eventTypeCode_key" ON "docket_event_tags"("docketEventId", "eventTypeCode");

-- CreateIndex
CREATE UNIQUE INDEX "judges_judgeName_courtId_key" ON "judges"("judgeName", "courtId");

-- CreateIndex
CREATE INDEX "documents_casePk_idx" ON "documents"("casePk");

-- CreateIndex
CREATE INDEX "ml_feature_snapshots_cutoffType_idx" ON "ml_feature_snapshots"("cutoffType");

-- CreateIndex
CREATE INDEX "ml_feature_snapshots_casePk_idx" ON "ml_feature_snapshots"("casePk");

-- CreateIndex
CREATE UNIQUE INDEX "ml_feature_snapshots_casePk_cutoffType_key" ON "ml_feature_snapshots"("casePk", "cutoffType");

-- CreateIndex
CREATE INDEX "settlement_records_claimType_idx" ON "settlement_records"("claimType");

-- CreateIndex
CREATE INDEX "settlement_records_venueState_idx" ON "settlement_records"("venueState");

-- CreateIndex
CREATE INDEX "settlement_records_injurySeverity_idx" ON "settlement_records"("injurySeverity");

-- AddForeignKey
ALTER TABLE "attorney_push_devices" ADD CONSTRAINT "attorney_push_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_caseTierId_fkey" FOREIGN KEY ("caseTierId") REFERENCES "case_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_details" ADD CONSTRAINT "insurance_details_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lien_holders" ADD CONSTRAINT "lien_holders_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_tasks" ADD CONSTRAINT "case_tasks_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_workflow_templates" ADD CONSTRAINT "case_workflow_templates_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_workflow_steps" ADD CONSTRAINT "case_workflow_steps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "case_workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_events" ADD CONSTRAINT "negotiation_events_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_insights" ADD CONSTRAINT "negotiation_insights_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_comment_threads" ADD CONSTRAINT "case_comment_threads_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_comments" ADD CONSTRAINT "case_comments_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "case_comment_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_health_snapshots" ADD CONSTRAINT "case_health_snapshots_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_templates" ADD CONSTRAINT "reminder_templates_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_reminders" ADD CONSTRAINT "case_reminders_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_reminders" ADD CONSTRAINT "case_reminders_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "reminder_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_escalation_rules" ADD CONSTRAINT "health_escalation_rules_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_cadence_templates" ADD CONSTRAINT "negotiation_cadence_templates_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_cadence_steps" ADD CONSTRAINT "negotiation_cadence_steps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "negotiation_cadence_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_sla_templates" ADD CONSTRAINT "task_sla_templates_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_sla_steps" ADD CONSTRAINT "task_sla_steps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "task_sla_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorneys" ADD CONSTRAINT "attorneys_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_settings" ADD CONSTRAINT "firm_settings_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_toggles" ADD CONSTRAINT "feature_toggles_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_toggles" ADD CONSTRAINT "feature_toggles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_decision_profiles" ADD CONSTRAINT "attorney_decision_profiles_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_decision_profiles" ADD CONSTRAINT "attorney_decision_profiles_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_webhook_receipts" ADD CONSTRAINT "sms_webhook_receipts_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_waves" ADD CONSTRAINT "routing_waves_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_reputation_scores" ADD CONSTRAINT "attorney_reputation_scores_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_letters" ADD CONSTRAINT "demand_letters_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_attorneys" ADD CONSTRAINT "favorite_attorneys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_attorneys" ADD CONSTRAINT "favorite_attorneys_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_notification_events" ADD CONSTRAINT "platform_notification_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_notification_events" ADD CONSTRAINT "platform_notification_events_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_notification_events" ADD CONSTRAINT "platform_notification_events_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_notification_attempts" ADD CONSTRAINT "platform_notification_attempts_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "platform_notification_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_threads" ADD CONSTRAINT "case_threads_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "case_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_calendar_connections" ADD CONSTRAINT "attorney_calendar_connections_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_calendar_busy_blocks" ADD CONSTRAINT "attorney_calendar_busy_blocks_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_calendar_busy_blocks" ADD CONSTRAINT "attorney_calendar_busy_blocks_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "attorney_calendar_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_reviews" ADD CONSTRAINT "attorney_reviews_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_reviews" ADD CONSTRAINT "attorney_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_availability" ADD CONSTRAINT "attorney_availability_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_sessions" ADD CONSTRAINT "chatbot_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_dashboard" ADD CONSTRAINT "attorney_dashboard_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_intake_requests" ADD CONSTRAINT "case_intake_requests_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_intake_requests" ADD CONSTRAINT "case_intake_requests_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_intake_configs" ADD CONSTRAINT "attorney_intake_configs_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_submissions" ADD CONSTRAINT "lead_submissions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_submissions" ADD CONSTRAINT "lead_submissions_assignedAttorneyId_fkey" FOREIGN KEY ("assignedAttorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_memories" ADD CONSTRAINT "decision_memories_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_memories" ADD CONSTRAINT "decision_memories_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_memories" ADD CONSTRAINT "decision_memories_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_memories" ADD CONSTRAINT "decision_memories_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_contacts" ADD CONSTRAINT "case_contacts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_contacts" ADD CONSTRAINT "case_contacts_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_profiles" ADD CONSTRAINT "attorney_profiles_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_import_sources" ADD CONSTRAINT "attorney_import_sources_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_import_sources" ADD CONSTRAINT "attorney_import_sources_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "attorney_import_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ethical_walls" ADD CONSTRAINT "ethical_walls_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ethical_walls" ADD CONSTRAINT "ethical_walls_blockedAttorneyId_fkey" FOREIGN KEY ("blockedAttorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_shares" ADD CONSTRAINT "case_shares_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_shares" ADD CONSTRAINT "case_shares_sharedByAttorneyId_fkey" FOREIGN KEY ("sharedByAttorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_shares" ADD CONSTRAINT "case_shares_sharedWithAttorneyId_fkey" FOREIGN KEY ("sharedWithAttorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_agreements" ADD CONSTRAINT "referral_agreements_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_agreements" ADD CONSTRAINT "referral_agreements_referringAttorneyId_fkey" FOREIGN KEY ("referringAttorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_agreements" ADD CONSTRAINT "referral_agreements_receivingAttorneyId_fkey" FOREIGN KEY ("receivingAttorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "co_counsel_workflows" ADD CONSTRAINT "co_counsel_workflows_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "co_counsel_workflows" ADD CONSTRAINT "co_counsel_workflows_leadAttorneyId_fkey" FOREIGN KEY ("leadAttorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "co_counsel_workflows" ADD CONSTRAINT "co_counsel_workflows_coCounselAttorneyId_fkey" FOREIGN KEY ("coCounselAttorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_analytics" ADD CONSTRAINT "lead_analytics_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_checks" ADD CONSTRAINT "conflict_checks_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflict_checks" ADD CONSTRAINT "conflict_checks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_reports" ADD CONSTRAINT "quality_reports_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_referrals" ADD CONSTRAINT "provider_referrals_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_referrals" ADD CONSTRAINT "provider_referrals_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "medical_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_referrals" ADD CONSTRAINT "provider_referrals_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_annotations" ADD CONSTRAINT "evidence_annotations_evidenceFileId_fkey" FOREIGN KEY ("evidenceFileId") REFERENCES "evidence_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_annotations" ADD CONSTRAINT "evidence_annotations_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_evidenceFileId_fkey" FOREIGN KEY ("evidenceFileId") REFERENCES "evidence_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_processing_jobs" ADD CONSTRAINT "evidence_processing_jobs_evidenceFileId_fkey" FOREIGN KEY ("evidenceFileId") REFERENCES "evidence_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_access_logs" ADD CONSTRAINT "evidence_access_logs_evidenceFileId_fkey" FOREIGN KEY ("evidenceFileId") REFERENCES "evidence_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("courtId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docket_events" ADD CONSTRAINT "docket_events_casePk_fkey" FOREIGN KEY ("casePk") REFERENCES "cases"("casePk") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docket_event_tags" ADD CONSTRAINT "docket_event_tags_docketEventId_fkey" FOREIGN KEY ("docketEventId") REFERENCES "docket_events"("docketEventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docket_event_tags" ADD CONSTRAINT "docket_event_tags_eventTypeCode_fkey" FOREIGN KEY ("eventTypeCode") REFERENCES "event_type_map"("eventTypeCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judges" ADD CONSTRAINT "judges_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("courtId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_casePk_fkey" FOREIGN KEY ("casePk") REFERENCES "cases"("casePk") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_docketEventId_fkey" FOREIGN KEY ("docketEventId") REFERENCES "docket_events"("docketEventId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_extractions" ADD CONSTRAINT "complaint_extractions_casePk_fkey" FOREIGN KEY ("casePk") REFERENCES "cases"("casePk") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_feature_snapshots" ADD CONSTRAINT "ml_feature_snapshots_casePk_fkey" FOREIGN KEY ("casePk") REFERENCES "cases"("casePk") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_labels" ADD CONSTRAINT "trial_labels_casePk_fkey" FOREIGN KEY ("casePk") REFERENCES "cases"("casePk") ON DELETE CASCADE ON UPDATE CASCADE;


