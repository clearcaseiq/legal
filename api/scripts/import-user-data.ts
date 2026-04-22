/**
 * Import user data into MySQL: creates User accounts for all attorneys
 * that don't have login credentials yet.
 *
 * Usage: pnpm run import:users [defaultPassword]
 * Example: pnpm run import:users password1234
 *
 * Default password: password1234 (if not specified)
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'password1234'

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] }
  }
  const lastName = parts[parts.length - 1]
  const firstName = parts.slice(0, -1).join(' ')
  return { firstName, lastName }
}

async function main() {
  const defaultPassword = process.argv[2] || DEFAULT_PASSWORD

  if (defaultPassword.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  console.log('Importing user data into MySQL...\n')

  const attorneys = await prisma.attorney.findMany({
    select: { id: true, name: true, email: true, phone: true, meta: true }
  })

  const passwordHash = await bcrypt.hash(defaultPassword, 12)
  let created = 0
  let skipped = 0
  let noEmail = 0

  for (const attorney of attorneys) {
    let email = attorney.email
    if (!email && attorney.meta) {
      try {
        const meta = JSON.parse(attorney.meta) as { contact?: { email?: string } }
        email = meta?.contact?.email
      } catch {
        // ignore parse errors
      }
    }
    if (!email) {
      noEmail++
      continue
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      skipped++
      continue
    }

    const { firstName, lastName } = parseName(attorney.name)
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: attorney.phone,
        role: 'attorney',
        isActive: true,
        emailVerified: false
      }
    })
    created++
    console.log(`  ✓ Created User for ${attorney.name} (${email})`)
  }

  console.log(`\nDone. Created ${created} user accounts, skipped ${skipped} (already exist), ${noEmail} (no email).`)
  console.log(`Default password for new accounts: ${defaultPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
