/**
 * Create/repair a login for the seeded "Michael Chen" attorney and link it to
 * his existing Attorney roster row (which ships without a top-level email, so
 * the generic ensure-attorney-for-email script would otherwise create a
 * duplicate). Safe to re-run.
 *
 * Usage:
 *   node ../node_modules/tsx/dist/cli.mjs scripts/create-michael-chen-login.ts
 * Optional env overrides: MC_EMAIL, MC_PASSWORD
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

config({ path: resolve(__dirname, '../.env'), override: false })

const prisma = new PrismaClient()

const EMAIL = (process.env.MC_EMAIL || 'mchen@malpracticelaw.com').toLowerCase()
const PASSWORD = process.env.MC_PASSWORD || 'Password123!'

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL || '').host || '(unknown)'
  } catch {
    return '(unparseable DATABASE_URL)'
  }
}

async function main() {
  if (PASSWORD.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  // Prefer an existing row already carrying the email; otherwise the seeded row by name.
  const attorney =
    (await prisma.attorney.findFirst({ where: { email: EMAIL } })) ||
    (await prisma.attorney.findFirst({ where: { name: 'Michael Chen' } }))

  if (!attorney) {
    console.error('No "Michael Chen" attorney row found. Run the base seed first: pnpm --filter caseiq-api prisma:dev')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, role: 'attorney', isActive: true, firstName: 'Michael', lastName: 'Chen' },
    create: {
      email: EMAIL,
      passwordHash,
      firstName: 'Michael',
      lastName: 'Chen',
      phone: attorney.phone,
      role: 'attorney',
      isActive: true,
      emailVerified: true,
    },
  })

  // Link the login to the roster row: getAttorneyForUser resolves by matching
  // Attorney.email to the user's email; claimedByUserId is the explicit owner.
  await prisma.attorney.update({
    where: { id: attorney.id },
    data: {
      email: EMAIL,
      claimedByUserId: user.id,
      claimStatus: 'claimed',
      claimedAt: new Date(),
    },
  })

  console.log(
    JSON.stringify(
      {
        database: dbHost(),
        email: EMAIL,
        password: PASSWORD,
        userId: user.id,
        attorneyId: attorney.id,
        attorneyName: attorney.name,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
