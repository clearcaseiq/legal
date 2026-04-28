/**
 * Add Prisma fields that are missing from the current Supabase app_core schema.
 *
 * This is intentionally additive only: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS.
 * Usage: pnpm --filter caseiq-api exec tsx scripts/migrate-supabase-missing-fields.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

const prisma = new PrismaClient()

const statements = [
  `ALTER TABLE "billing_invoices" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT`,
  `ALTER TABLE "billing_invoices" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT`,
  `ALTER TABLE "billing_invoices" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`,
  `ALTER TABLE "billing_invoices" ADD COLUMN IF NOT EXISTS "stripePaymentStatus" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "billing_invoices_stripeCheckoutSessionId_key" ON "billing_invoices"("stripeCheckoutSessionId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "billing_invoices_stripePaymentIntentId_key" ON "billing_invoices"("stripePaymentIntentId")`,

  `ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "processor" TEXT`,
  `ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT`,
  `ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT`,
  `ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "stripeChargeId" TEXT`,
  `ALTER TABLE "billing_payments" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "billing_payments_stripeCheckoutSessionId_key" ON "billing_payments"("stripeCheckoutSessionId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "billing_payments_stripePaymentIntentId_key" ON "billing_payments"("stripePaymentIntentId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "billing_payments_stripeChargeId_key" ON "billing_payments"("stripeChargeId")`,

  `ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`,
  `ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT`,
  `ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeSubscriptionStatus" TEXT`,
  `ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeSubscriptionPriceId" TEXT`,
  `ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeCurrentPeriodEnd" TIMESTAMP(3)`,
  `ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT`,
  `ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "attorney_profiles" ADD COLUMN IF NOT EXISTS "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "attorney_profiles_stripeCustomerId_key" ON "attorney_profiles"("stripeCustomerId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "attorney_profiles_stripeSubscriptionId_key" ON "attorney_profiles"("stripeSubscriptionId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "attorney_profiles_stripeConnectAccountId_key" ON "attorney_profiles"("stripeConnectAccountId")`,

  `CREATE TABLE IF NOT EXISTS "platform_payments" (
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
    CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "platform_payments_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "platform_payments_stripeCheckoutSessionId_key" ON "platform_payments"("stripeCheckoutSessionId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "platform_payments_stripePaymentIntentId_key" ON "platform_payments"("stripePaymentIntentId")`,
  `CREATE INDEX IF NOT EXISTS "platform_payments_attorneyId_idx" ON "platform_payments"("attorneyId")`,
  `CREATE INDEX IF NOT EXISTS "platform_payments_stripeCustomerId_idx" ON "platform_payments"("stripeCustomerId")`,
  `CREATE INDEX IF NOT EXISTS "platform_payments_stripeSubscriptionId_idx" ON "platform_payments"("stripeSubscriptionId")`,
]

async function main() {
  const schema = new URL(process.env.DATABASE_URL || '').searchParams.get('schema') || 'public'
  await prisma.$executeRawUnsafe(`SET search_path TO "${schema}"`)

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  console.log(`Applied ${statements.length} additive schema statements to schema "${schema}".`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
