/**
 * Test attorney for the money-path test (e2e/money-path.e2e.spec.ts).
 *
 * Creates (or resets) one dedicated, routable California attorney, withdraws
 * any earlier acceptance of the participation agreement so the test exercises
 * the acceptance gate every run, and signs an MFA-verified session for it the
 * way login does. The claimant side needs no fixture: the spec goes through
 * anonymous intake like a real visitor.
 *
 * Local and QA only: the output is a live credential, and the attorney is a
 * real routing target in whatever database this API is configured for.
 *
 *   pnpm --filter caseiq-api exec tsx scripts/e2e-money-path-fixture.ts ../e2e/.sessions.money-path.json
 *   E2E_MONEY_PATH=e2e/.sessions.money-path.json pnpm test:e2e e2e/money-path.e2e.spec.ts
 */
import { config } from 'dotenv'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../src/lib/prisma'
import { issueSessionToken } from '../src/lib/auth'
import { ATTORNEY_AGREEMENT_CONSENT_TYPE } from '../src/lib/attorney-agreement'

config({ path: resolve(__dirname, '../.env'), override: false })

const EMAIL = 'e2e-money-path@clearcaseiq.test'
const NAME = 'E2E Money Path'
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'db', 'postgres', 'host.docker.internal'])

// Judged by the database host as well as NODE_ENV: a shell with DEPLOY_ENV or
// NODE_ENV left over from a deploy says little about where DATABASE_URL points.
function assertSafeTarget() {
  const isQa = (process.env.DEPLOY_ENV || '').toLowerCase() === 'qa'
  let host = ''
  try {
    host = new URL(process.env.DATABASE_URL || '').hostname
  } catch {
    throw new Error('DATABASE_URL is missing or unparseable; refusing to guess the target database')
  }
  if (!isQa && (process.env.NODE_ENV === 'production' || !LOCAL_DB_HOSTS.has(host))) {
    throw new Error(`Refusing to create a routable test attorney in ${host}: local databases only, or set DEPLOY_ENV=qa`)
  }
}

async function main() {
  assertSafeTarget()
  const out = resolve(process.argv[2] || '../e2e/.sessions.money-path.json')

  const userData = {
    firstName: 'E2E',
    lastName: 'Money Path',
    role: 'attorney',
    isActive: true,
    emailVerified: true,
  }
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: userData,
    create: { email: EMAIL, ...userData },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, sessionVersion: true },
  })

  const attorneyData = {
    name: NAME,
    isActive: true,
    isVerified: true,
    specialties: JSON.stringify(['auto', 'premises']),
    venues: JSON.stringify(['CA']),
  }
  const existing = await prisma.attorney.findFirst({ where: { email: EMAIL }, select: { id: true } })
  const attorney = existing
    ? await prisma.attorney.update({ where: { id: existing.id }, data: attorneyData })
    : await prisma.attorney.create({ data: { email: EMAIL, ...attorneyData } })

  // Statewide, no capacity caps: routing must never skip this attorney for
  // having taken the previous runs' cases.
  const profileData = {
    jurisdictions: JSON.stringify([{ state: 'CA' }]),
    excludedCaseTypes: null,
    minInjurySeverity: null,
    minDamagesRange: null,
    maxDamagesRange: null,
    maxCasesPerWeek: null,
    maxCasesPerMonth: null,
    intakeHours: null,
  }
  await prisma.attorneyProfile.upsert({
    where: { attorneyId: attorney.id },
    update: profileData,
    create: { attorneyId: attorney.id, ...profileData },
  })

  const withdrawn = await prisma.consent.updateMany({
    where: { userId: user.id, consentType: ATTORNEY_AGREEMENT_CONSENT_TYPE, revokedAt: null },
    data: { revokedAt: new Date(), granted: false },
  })

  const fixture = {
    attorney: {
      token: issueSessionToken(user, { mfaVerified: true }),
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      attorneyId: attorney.id,
    },
  }
  writeFileSync(out, JSON.stringify(fixture, null, 2))
  console.log(`Wrote ${out}: attorney ${attorney.id} (${EMAIL}); withdrew ${withdrawn.count} earlier agreement acceptance(s)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
