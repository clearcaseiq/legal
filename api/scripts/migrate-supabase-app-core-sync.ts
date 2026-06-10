/**
 * Additive Supabase schema sync for app_core (and optional public schema).
 *
 * Brings Supabase in line with api/prisma/schema.prisma for known gaps:
 * - assessments.lawFirmId / officeId / teamId
 * - firm_* tables, attorney_case_reviews, platform_payments, Stripe columns
 *
 * Usage (from api/):
 *   Set DATABASE_URL or SUPABASE_DATABASE_URL to Supabase direct URI with ?schema=app_core
 *   pnpm exec tsx scripts/migrate-supabase-app-core-sync.ts
 *   pnpm exec tsx scripts/migrate-supabase-app-core-sync.ts --dry-run
 *
 * Or paste api/prisma/migrate-supabase-app-core-sync.sql into Supabase SQL Editor.
 */
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

const dryRun = process.argv.includes('--dry-run')

const foreignKeys: Array<{ name: string; sql: string }> = [
  {
    name: 'assessments_lawFirmId_fkey',
    sql: `ALTER TABLE "assessments" ADD CONSTRAINT "assessments_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    name: 'assessments_officeId_fkey',
    sql: `ALTER TABLE "assessments" ADD CONSTRAINT "assessments_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "firm_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    name: 'assessments_teamId_fkey',
    sql: `ALTER TABLE "assessments" ADD CONSTRAINT "assessments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "firm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    name: 'case_tasks_assignedUserId_fkey',
    sql: `ALTER TABLE "case_tasks" ADD CONSTRAINT "case_tasks_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    name: 'firm_offices_lawFirmId_fkey',
    sql: `ALTER TABLE "firm_offices" ADD CONSTRAINT "firm_offices_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'firm_teams_lawFirmId_fkey',
    sql: `ALTER TABLE "firm_teams" ADD CONSTRAINT "firm_teams_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'firm_teams_officeId_fkey',
    sql: `ALTER TABLE "firm_teams" ADD CONSTRAINT "firm_teams_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "firm_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    name: 'firm_members_lawFirmId_fkey',
    sql: `ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'firm_members_userId_fkey',
    sql: `ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'firm_members_attorneyId_fkey',
    sql: `ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    name: 'firm_members_officeId_fkey',
    sql: `ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "firm_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    name: 'firm_team_members_teamId_fkey',
    sql: `ALTER TABLE "firm_team_members" ADD CONSTRAINT "firm_team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "firm_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'firm_team_members_firmMemberId_fkey',
    sql: `ALTER TABLE "firm_team_members" ADD CONSTRAINT "firm_team_members_firmMemberId_fkey" FOREIGN KEY ("firmMemberId") REFERENCES "firm_members"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'firm_team_members_userId_fkey',
    sql: `ALTER TABLE "firm_team_members" ADD CONSTRAINT "firm_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'firm_case_assignments_lawFirmId_fkey',
    sql: `ALTER TABLE "firm_case_assignments" ADD CONSTRAINT "firm_case_assignments_lawFirmId_fkey" FOREIGN KEY ("lawFirmId") REFERENCES "law_firms"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'firm_case_assignments_assessmentId_fkey',
    sql: `ALTER TABLE "firm_case_assignments" ADD CONSTRAINT "firm_case_assignments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'firm_case_assignments_assignedUserId_fkey',
    sql: `ALTER TABLE "firm_case_assignments" ADD CONSTRAINT "firm_case_assignments_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    name: 'firm_case_assignments_assignedAttorneyId_fkey',
    sql: `ALTER TABLE "firm_case_assignments" ADD CONSTRAINT "firm_case_assignments_assignedAttorneyId_fkey" FOREIGN KEY ("assignedAttorneyId") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    name: 'attorney_case_reviews_attorneyId_fkey',
    sql: `ALTER TABLE "attorney_case_reviews" ADD CONSTRAINT "attorney_case_reviews_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'attorney_case_reviews_caseId_fkey',
    sql: `ALTER TABLE "attorney_case_reviews" ADD CONSTRAINT "attorney_case_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'platform_payments_attorneyId_fkey',
    sql: `ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_attorneyId_fkey" FOREIGN KEY ("attorneyId") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
]

function getTargetDatabaseUrl() {
  const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  if (!url) {
    throw new Error('Set SUPABASE_DATABASE_URL or DATABASE_URL in api/.env to your Supabase Postgres URI.')
  }
  if (!url.includes('supabase') && !process.argv.includes('--allow-non-supabase')) {
    throw new Error(
      'Refusing to run: target does not look like Supabase. Set SUPABASE_DATABASE_URL, or pass --allow-non-supabase to run on local Postgres.'
    )
  }
  return url
}

function splitSqlStatements(sql: string) {
  return sql
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter((s) => s.length > 0)
}

function foreignKeyBlock(fk: { name: string; sql: string }) {
  return `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${fk.name}') THEN
    ${fk.sql};
  END IF;
END $$`
}

async function main() {
  const databaseUrl = getTargetDatabaseUrl()
  const schema = new URL(databaseUrl).searchParams.get('schema') || 'public'
  const sqlPath = resolve(__dirname, '../prisma/migrate-supabase-app-core-sync.sql')
  const baseSql = readFileSync(sqlPath, 'utf8')
  const statements = splitSqlStatements(baseSql)

  console.log(`Target schema: ${schema}`)
  console.log(`DDL statements: ${statements.length}, foreign keys: ${foreignKeys.length}`)
  if (dryRun) {
    console.log('Dry run — no changes applied.')
    statements.forEach((statement, index) => {
      console.log(`\n-- DDL [${index + 1}]\n${statement};`)
    })
    foreignKeys.forEach((fk, index) => {
      console.log(`\n-- FK [${index + 1}] ${fk.name}\n${foreignKeyBlock(fk)};`)
    })
    return
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`)
    for (const [index, statement] of statements.entries()) {
      await prisma.$executeRawUnsafe(statement)
      console.log(`OK DDL [${index + 1}/${statements.length}]`)
    }
    for (const [index, fk] of foreignKeys.entries()) {
      await prisma.$executeRawUnsafe(foreignKeyBlock(fk))
      console.log(`OK FK [${index + 1}/${foreignKeys.length}] ${fk.name}`)
    }
    console.log(`Applied schema sync to "${schema}".`)
    console.log('Next: cd api && pnpm prisma generate')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
