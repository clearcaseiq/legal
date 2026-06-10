-- Additive sync: bring Supabase app_core closer to api/prisma/schema.prisma
-- Safe to re-run (IF NOT EXISTS). Run in Supabase SQL Editor or via migrate-supabase-app-core-sync.ts
-- Before running: SET search_path or run in schema app_core

CREATE SCHEMA IF NOT EXISTS app_core;
SET search_path TO app_core, public;

-- ---------------------------------------------------------------------------
-- assessments: firm routing columns (fixes Rahul lawFirmId error)
-- ---------------------------------------------------------------------------
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "lawFirmId" TEXT;
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "officeId" TEXT;
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "teamId" TEXT;

CREATE INDEX IF NOT EXISTS "assessments_lawFirmId_idx" ON "assessments"("lawFirmId");
CREATE INDEX IF NOT EXISTS "assessments_officeId_idx" ON "assessments"("officeId");
CREATE INDEX IF NOT EXISTS "assessments_teamId_idx" ON "assessments"("teamId");

-- ---------------------------------------------------------------------------
-- case_tasks
-- ---------------------------------------------------------------------------
ALTER TABLE "case_tasks" ADD COLUMN IF NOT EXISTS "assignedUserId" TEXT;

-- ---------------------------------------------------------------------------
-- Firm routing tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "firm_offices" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "countiesServed" TEXT,
    "languages" TEXT,
    "practiceAreas" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "firm_offices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "firm_teams" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "officeId" TEXT,
    "name" TEXT NOT NULL,
    "teamType" TEXT NOT NULL DEFAULT 'case_team',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "firm_teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "firm_members" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attorneyId" TEXT,
    "officeId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'intake_specialist',
    "title" TEXT,
    "permissions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "firm_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "firm_team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "firmMemberId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "firm_team_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "firm_case_assignments" (
    "id" TEXT NOT NULL,
    "lawFirmId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "assignedAttorneyId" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedById" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "firm_case_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "firm_members_lawFirmId_userId_key" ON "firm_members"("lawFirmId", "userId");
CREATE INDEX IF NOT EXISTS "firm_members_lawFirmId_role_idx" ON "firm_members"("lawFirmId", "role");
CREATE INDEX IF NOT EXISTS "firm_members_attorneyId_idx" ON "firm_members"("attorneyId");
CREATE INDEX IF NOT EXISTS "firm_members_officeId_idx" ON "firm_members"("officeId");
CREATE INDEX IF NOT EXISTS "firm_offices_lawFirmId_idx" ON "firm_offices"("lawFirmId");
CREATE INDEX IF NOT EXISTS "firm_teams_lawFirmId_idx" ON "firm_teams"("lawFirmId");
CREATE INDEX IF NOT EXISTS "firm_teams_officeId_idx" ON "firm_teams"("officeId");
CREATE UNIQUE INDEX IF NOT EXISTS "firm_team_members_teamId_firmMemberId_key" ON "firm_team_members"("teamId", "firmMemberId");
CREATE INDEX IF NOT EXISTS "firm_team_members_userId_idx" ON "firm_team_members"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "firm_case_assignments_assessmentId_role_assignedUserId_assignedAttorneyId_key"
  ON "firm_case_assignments"("assessmentId", "role", "assignedUserId", "assignedAttorneyId");
CREATE INDEX IF NOT EXISTS "firm_case_assignments_lawFirmId_idx" ON "firm_case_assignments"("lawFirmId");
CREATE INDEX IF NOT EXISTS "firm_case_assignments_assessmentId_idx" ON "firm_case_assignments"("assessmentId");
CREATE INDEX IF NOT EXISTS "firm_case_assignments_assignedUserId_idx" ON "firm_case_assignments"("assignedUserId");
CREATE INDEX IF NOT EXISTS "firm_case_assignments_assignedAttorneyId_idx" ON "firm_case_assignments"("assignedAttorneyId");

-- ---------------------------------------------------------------------------
-- attorney_case_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "attorney_case_reviews" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "acceptCase" BOOLEAN NOT NULL,
    "settlementLow" DOUBLE PRECISION,
    "settlementExpected" DOUBLE PRECISION,
    "settlementHigh" DOUBLE PRECISION,
    "trialLow" DOUBLE PRECISION,
    "trialHigh" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "attorney_case_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attorney_case_reviews_attorneyId_idx" ON "attorney_case_reviews"("attorneyId");
CREATE INDEX IF NOT EXISTS "attorney_case_reviews_caseId_idx" ON "attorney_case_reviews"("caseId");

-- ---------------------------------------------------------------------------
-- Stripe / platform_payments (from migrate-supabase-missing-fields)
-- ---------------------------------------------------------------------------
ALTER TABLE "billing_invoices" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;
ALTER TABLE "billing_invoices" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "billing_invoices" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "billing_invoices" ADD COLUMN IF NOT EXISTS "stripePaymentStatus" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "billing_invoices_stripeCheckoutSessionId_key" ON "billing_invoices"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_invoices_stripePaymentIntentId_key" ON "billing_invoices"("stripePaymentIntentId");

ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "processor" TEXT;
ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;
ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "stripeChargeId" TEXT;
ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "billing_payments_stripeCheckoutSessionId_key" ON "billing_payments"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_payments_stripePaymentIntentId_key" ON "billing_payments"("stripePaymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_payments_stripeChargeId_key" ON "billing_payments"("stripeChargeId");

ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeSubscriptionStatus" TEXT;
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeSubscriptionPriceId" TEXT;
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeCurrentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT;
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "attorney_profiles_stripeCustomerId_key" ON "attorney_profiles"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "attorney_profiles_stripeSubscriptionId_key" ON "attorney_profiles"("stripeSubscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "attorney_profiles_stripeConnectAccountId_key" ON "attorney_profiles"("stripeConnectAccountId");

CREATE TABLE IF NOT EXISTS "platform_payments" (
    "id" TEXT NOT NULL,
    "attorneyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_payments_stripeCheckoutSessionId_key" ON "platform_payments"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "platform_payments_stripePaymentIntentId_key" ON "platform_payments"("stripePaymentIntentId");
CREATE INDEX IF NOT EXISTS "platform_payments_attorneyId_idx" ON "platform_payments"("attorneyId");
CREATE INDEX IF NOT EXISTS "platform_payments_stripeCustomerId_idx" ON "platform_payments"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "platform_payments_stripeSubscriptionId_idx" ON "platform_payments"("stripeSubscriptionId");

-- ---------------------------------------------------------------------------
-- Foreign keys (safe to re-run)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_lawFirmId_fkey') THEN
    ALTER TABLE "assessments" ADD CONSTRAINT "assessments_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_officeId_fkey') THEN
    ALTER TABLE "assessments" ADD CONSTRAINT "assessments_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "firm_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_teamId_fkey') THEN
    ALTER TABLE "assessments" ADD CONSTRAINT "assessments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "firm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'case_tasks_assignedUserId_fkey') THEN
    ALTER TABLE "case_tasks" ADD CONSTRAINT "case_tasks_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_offices_lawFirmId_fkey') THEN
    ALTER TABLE "firm_offices" ADD CONSTRAINT "firm_offices_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_teams_lawFirmId_fkey') THEN
    ALTER TABLE "firm_teams" ADD CONSTRAINT "firm_teams_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_teams_officeId_fkey') THEN
    ALTER TABLE "firm_teams" ADD CONSTRAINT "firm_teams_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "firm_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_members_lawFirmId_fkey') THEN
    ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_members_userId_fkey') THEN
    ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_members_attorneyId_fkey') THEN
    ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_members_officeId_fkey') THEN
    ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "firm_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_team_members_teamId_fkey') THEN
    ALTER TABLE "firm_team_members" ADD CONSTRAINT "firm_team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "firm_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_team_members_firmMemberId_fkey') THEN
    ALTER TABLE "firm_team_members" ADD CONSTRAINT "firm_team_members_firmMemberId_fkey" FOREIGN KEY ("firmMemberId") REFERENCES "firm_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_team_members_userId_fkey') THEN
    ALTER TABLE "firm_team_members" ADD CONSTRAINT "firm_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_case_assignments_lawFirmId_fkey') THEN
    ALTER TABLE "firm_case_assignments" ADD CONSTRAINT "firm_case_assignments_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_case_assignments_assessmentId_fkey') THEN
    ALTER TABLE "firm_case_assignments" ADD CONSTRAINT "firm_case_assignments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_case_assignments_assignedUserId_fkey') THEN
    ALTER TABLE "firm_case_assignments" ADD CONSTRAINT "firm_case_assignments_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'firm_case_assignments_assignedAttorneyId_fkey') THEN
    ALTER TABLE "firm_case_assignments" ADD CONSTRAINT "firm_case_assignments_assignedAttorneyId_fkey" FOREIGN KEY ("assignedAttorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attorney_case_reviews_attorneyId_fkey') THEN
    ALTER TABLE "attorney_case_reviews" ADD CONSTRAINT "attorney_case_reviews_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attorney_case_reviews_caseId_fkey') THEN
    ALTER TABLE "attorney_case_reviews" ADD CONSTRAINT "attorney_case_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_payments_attorneyId_fkey') THEN
    ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
