/**
 * Ensures seeded @caseiq-seed.local attorneys have User rows and a known password.
 *
 * By default this targets the latest 100 seeded attorneys. Set SEED_LOGIN_LIMIT or
 * SEED_BATCH_ID to control the scope.
 *
 * Usage: pnpm --filter caseiq-api seed:attorney-logins
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

config({ path: resolve(__dirname, '../.env'), override: true })

const prisma = new PrismaClient()
const DEFAULT_PASSWORD = 'CaseIQDemo2026!'

function splitName(display: string): { firstName: string; lastName: string } {
  const cleaned = display.replace(/,?\s*Esq\.?$/i, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Attorney', lastName: 'Demo' }
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Attorney' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

async function main() {
  const password = process.env.SEED_LOGIN_PASSWORD || DEFAULT_PASSWORD
  if (password.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  const limit = Number(process.env.SEED_LOGIN_LIMIT ?? 100)
  const batchId = process.env.SEED_BATCH_ID?.trim()
  const emailFilter = batchId
    ? { contains: `.${batchId}.` }
    : { endsWith: '@caseiq-seed.local' }

  const attorneys = await prisma.attorney.findMany({
    where: {
      email: emailFilter,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  if (attorneys.length === 0) {
    console.error('No seeded attorneys found. Run: pnpm --filter caseiq-api seed:ca-attorneys')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  let created = 0
  let updated = 0

  for (const attorney of attorneys) {
    if (!attorney.email) continue
    const email = attorney.email.toLowerCase()
    const { firstName, lastName } = splitName(attorney.name)
    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: 'attorney',
          isActive: true,
          firstName: existing.firstName || firstName,
          lastName: existing.lastName || lastName,
        },
      })
      updated++
    } else {
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone: attorney.phone,
          role: 'attorney',
          isActive: true,
          emailVerified: true,
        },
      })
      created++
    }
  }

  console.log(
    JSON.stringify(
      {
        targetedAttorneys: attorneys.length,
        createdUsers: created,
        updatedUsers: updated,
        password,
        firstEmail: attorneys[0]?.email,
        lastEmail: attorneys[attorneys.length - 1]?.email,
      },
      null,
      2
    )
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
