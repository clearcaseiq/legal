/**
 * Repoint the Salman Law Firm login to a REAL email address you control, so
 * password-reset / verification emails can actually be delivered.
 *
 * Updates the User.email AND Attorney.email together (the attorney dashboard
 * resolves the attorney by matching req.user.email == attorney.email, so both
 * must change in lockstep). Ids are unchanged, so all 50 routed cases stay
 * linked. The password is NOT changed.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/change-salman-email.ts clearcaseiq-api:/app/change-salman-email.ts
 *   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec \
 *     -e NEW_EMAIL='you@yourdomain.com' api \
 *     node ../node_modules/tsx/dist/cli.mjs change-salman-email.ts
 *
 * Config (env vars):
 *   NEW_EMAIL   (required) the real inbox to use for login + emails
 *   OLD_EMAIL   default salman@salmanlawfirm.com
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const OLD_EMAIL = (process.env.OLD_EMAIL || 'salman@salmanlawfirm.com').trim().toLowerCase()
const NEW_EMAIL = (process.env.NEW_EMAIL || '').trim().toLowerCase()

async function main() {
  if (!NEW_EMAIL || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(NEW_EMAIL)) {
    console.error('Set NEW_EMAIL to a valid email address, e.g. -e NEW_EMAIL="you@domain.com"')
    process.exit(1)
  }

  // Guard against colliding with an existing different account.
  const existingUser = await prisma.user.findUnique({ where: { email: NEW_EMAIL } })
  const currentUser = await prisma.user.findUnique({ where: { email: OLD_EMAIL } })
  if (existingUser && (!currentUser || existingUser.id !== currentUser.id)) {
    console.error(`A different user already uses ${NEW_EMAIL} (id=${existingUser.id}). Aborting.`)
    process.exit(1)
  }
  const existingAtty = await prisma.attorney.findFirst({ where: { email: NEW_EMAIL } })
  const currentAtty = await prisma.attorney.findFirst({ where: { email: OLD_EMAIL } })
  if (existingAtty && (!currentAtty || existingAtty.id !== currentAtty.id)) {
    console.error(`A different attorney already uses ${NEW_EMAIL} (id=${existingAtty.id}). Aborting.`)
    process.exit(1)
  }

  if (!currentUser && existingUser) {
    console.log(`Already repointed: user ${NEW_EMAIL} exists (id=${existingUser.id}).`)
  } else if (currentUser) {
    await prisma.user.update({ where: { id: currentUser.id }, data: { email: NEW_EMAIL, emailVerified: true, isActive: true } })
    console.log(`User email: ${OLD_EMAIL} -> ${NEW_EMAIL} (id=${currentUser.id})`)
  } else {
    console.error(`No user found with ${OLD_EMAIL} or ${NEW_EMAIL}.`)
    process.exit(1)
  }

  if (currentAtty) {
    await prisma.attorney.update({ where: { id: currentAtty.id }, data: { email: NEW_EMAIL } })
    console.log(`Attorney email: ${OLD_EMAIL} -> ${NEW_EMAIL} (id=${currentAtty.id})`)
  } else if (existingAtty) {
    console.log(`Attorney already on ${NEW_EMAIL} (id=${existingAtty.id}).`)
  }

  // Sanity: dashboard resolves attorney by email — confirm it still resolves.
  const check = await prisma.attorney.findFirst({ where: { email: NEW_EMAIL }, select: { id: true, lawFirmId: true } })
  console.log(`\nLogin email is now: ${NEW_EMAIL}`)
  console.log(`Attorney resolves by new email: ${check ? 'YES (' + check.id + ')' : 'NO'}`)
  console.log('Password is unchanged. Cases stay linked (ids unchanged).')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
