/**
 * Ensure User + Attorney rows exist for attorney login.
 * Usage: DATABASE_URL=... pnpm exec tsx scripts/ensure-attorney-for-email.ts <email> [displayName]
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

config({ path: resolve(__dirname, '../.env'), override: false })

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  const displayName = process.argv[3]?.trim() || 'Sarah Johnson'
  const password = process.argv[4] || 'password123'

  if (!email) {
    console.error('Usage: ensure-attorney-for-email.ts <email> [displayName] [password]')
    process.exit(1)
  }

  const parts = displayName.split(/\s+/).filter(Boolean)
  const firstName = parts[0] || 'Attorney'
  const lastName = parts.slice(1).join(' ') || 'User'
  const passwordHash = await bcrypt.hash(password, 12)

  let user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role: 'attorney',
        isActive: true,
        firstName: user.firstName || firstName,
        lastName: user.lastName || lastName,
      },
    })
  } else {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'attorney',
        isActive: true,
        emailVerified: true,
      },
    })
  }

  let attorney = await prisma.attorney.findFirst({ where: { email } })
  if (!attorney) {
    attorney = await prisma.attorney.create({
      data: {
        name: displayName,
        email,
        specialties: JSON.stringify(['auto', 'premises']),
        venues: JSON.stringify(['CA']),
        isVerified: true,
      },
    })
  } else if (!attorney.specialties || !attorney.venues) {
    attorney = await prisma.attorney.update({
      where: { id: attorney.id },
      data: {
        specialties: attorney.specialties || JSON.stringify(['auto', 'premises']),
        venues: attorney.venues || JSON.stringify(['CA']),
      },
    })
  }

  console.log(
    JSON.stringify(
      {
        email,
        appLoginPassword: password,
        userId: user.id,
        attorneyId: attorney.id,
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
