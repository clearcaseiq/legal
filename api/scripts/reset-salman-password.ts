/**
 * Reset the Salman Law Firm admin/attorney login password.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/reset-salman-password.ts clearcaseiq-api:/app/reset-salman-password.ts
 *   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs reset-salman-password.ts
 *
 * Config (env vars, optional):
 *   SALMAN_EMAIL     default salman@salmanlawfirm.com
 *   NEW_PASSWORD     default password1234
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const EMAIL = (process.env.SALMAN_EMAIL || 'salman@salmanlawfirm.com').trim().toLowerCase()
const NEW_PASSWORD = process.env.NEW_PASSWORD || 'password1234'

async function main() {
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12)
  const user = await prisma.user.update({
    where: { email: EMAIL },
    data: { passwordHash, isActive: true, emailVerified: true },
    select: { id: true, email: true, role: true },
  })

  // Sanity-check the new hash verifies.
  const ok = await bcrypt.compare(NEW_PASSWORD, passwordHash)
  console.log(`Password reset for ${user.email} (role=${user.role})`)
  console.log(`New password: ${NEW_PASSWORD}`)
  console.log(`Verification: ${ok ? 'OK' : 'FAILED'}`)
}

main()
  .catch((e) => {
    if (e?.code === 'P2025') {
      console.error(`No user found with email ${EMAIL}`)
    } else {
      console.error(e)
    }
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
