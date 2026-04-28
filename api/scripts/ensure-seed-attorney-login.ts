/**
 * Ensures the first @caseiq-seed.local attorney has a User row and a known password (attorney login).
 * Usage: pnpm --filter caseiq-api exec tsx scripts/ensure-seed-attorney-login.ts
 *
 * Optional: SEED_LOGIN_EMAIL=... SEED_LOGIN_PASSWORD=... (password min 8 chars)
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
  const email =
    process.env.SEED_LOGIN_EMAIL?.trim().toLowerCase() ||
    (
      await prisma.attorney.findFirst({
        where: { email: { endsWith: '@caseiq-seed.local' } },
        orderBy: { createdAt: 'desc' },
      })
    )?.email

  if (!email) {
    console.error('No attorney with @caseiq-seed.local found. Run: pnpm --filter caseiq-api seed:ca-attorneys')
    process.exit(1)
  }

  const password = process.env.SEED_LOGIN_PASSWORD || DEFAULT_PASSWORD
  if (password.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  const attorney = await prisma.attorney.findUnique({ where: { email } })
  if (!attorney) {
    console.error(`No attorney row for ${email}`)
    process.exit(1)
  }

  const { firstName, lastName } = splitName(attorney.name)
  const passwordHash = await bcrypt.hash(password, 12)

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
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  console.log(JSON.stringify({ email, password, userId: user?.id, attorneyId: attorney.id }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
