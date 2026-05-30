/**
 * Repair invalid specialties/venues JSON on Attorney rows (fixes attorney-login 500s).
 * Usage: DATABASE_URL=... pnpm run fix:attorney-json
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: false })

const prisma = new PrismaClient()
const DEFAULT_SPECIALTIES = JSON.stringify(['auto', 'premises'])
const DEFAULT_VENUES = JSON.stringify(['CA'])

function isValidJsonArray(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
  } catch {
    return false
  }
}

async function main() {
  const attorneys = await prisma.attorney.findMany({
    select: { id: true, email: true, specialties: true, venues: true },
  })
  let fixed = 0
  for (const a of attorneys) {
    const patch: { specialties?: string; venues?: string } = {}
    if (!isValidJsonArray(a.specialties)) patch.specialties = DEFAULT_SPECIALTIES
    if (!isValidJsonArray(a.venues)) patch.venues = DEFAULT_VENUES
    if (Object.keys(patch).length === 0) continue
    await prisma.attorney.update({ where: { id: a.id }, data: patch })
    fixed++
    console.log('fixed', a.email || a.id, patch)
  }
  console.log(JSON.stringify({ scanned: attorneys.length, fixed }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
