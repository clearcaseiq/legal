/**
 * Set isActive = true for every attorney row (fixes empty /search when imports left some inactive).
 *
 * Uses DATABASE_URL from api/.env (cwd should be the `api` package when run via pnpm).
 * If you keep data in local Postgres but api/.env points at Supabase, this script will
 * update the wrong database — align DATABASE_URL or run:
 *   $env:DATABASE_URL='postgresql://...localhost...'; pnpm activate:attorneys
 *
 * Usage: pnpm --filter caseiq-api activate:attorneys
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

/** Always api/.env — override: true so a stale DATABASE_URL in the shell does not win. */
config({ path: resolve(__dirname, '../.env'), override: true })

function summarizeDatabaseTarget(): string {
  const raw = process.env.DATABASE_URL
  if (!raw) return 'DATABASE_URL is not set'
  try {
    const u = new URL(raw)
    const schema = u.searchParams.get('schema') ?? '(default)'
    const db = u.pathname.replace(/^\//, '') || '(no database name in path)'
    return `${u.hostname}:${u.port || '5432'} / ${db} · schema query param=${schema}`
  } catch {
    return 'could not parse DATABASE_URL'
  }
}

const prisma = new PrismaClient()

async function main() {
  console.log(`Database target: ${summarizeDatabaseTarget()}`)
  const inactiveBefore = await prisma.attorney.count({ where: { isActive: false } })
  const total = await prisma.attorney.count()
  const result = await prisma.attorney.updateMany({
    where: { isActive: false },
    data: { isActive: true },
  })
  console.log(`Attorneys in DB: ${total}. Inactive before: ${inactiveBefore}. Updated to active: ${result.count}.`)
  if (total === 0) {
    console.log(
      'No attorney rows in this database. If you expected data from local Postgres, set DATABASE_URL to that instance (see api/.env.example) and run again.'
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
