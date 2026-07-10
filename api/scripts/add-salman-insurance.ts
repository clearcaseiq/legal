/**
 * Add insurance coverage (policy limits) to the Salman Law Firm demo cases so the
 * Case Workspace "Policy limit" tile + coverage posture populate. The seed created
 * assessments + facts but no InsuranceDetail rows, so cc.coverageStory.policyLimit
 * was null and the Overview showed "—".
 *
 * Writes one defendant-liability InsuranceDetail per assessment with a realistic
 * carrier + policy limit scaled by claim type (higher severity => higher limits).
 * The command center reads the MAX policyLimit across a case's insurance rows.
 *
 * Idempotent: skips assessments that already have an InsuranceDetail (set FORCE=1
 * to add another row regardless).
 *
 * Usage (local):
 *   node ../node_modules/tsx/dist/cli.mjs scripts/add-salman-insurance.ts
 *
 * Usage (prod, inside the api container):
 *   docker cp api/scripts/add-salman-insurance.ts clearcaseiq-api:/app/add-salman-insurance.ts
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs add-salman-insurance.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRM_SLUG = process.env.FIRM_SLUG || 'salman-law-firm'
const FORCE = process.env.FORCE === '1'

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const CARRIERS = [
  'State Farm', 'GEICO', 'Progressive', 'Allstate', 'Liberty Mutual',
  'Nationwide', 'Travelers', 'Farmers', 'USAA', 'The Hartford',
] as const

const ADJUSTERS = [
  'Dana Whitfield', 'Marcus Reyes', 'Priya Nair', 'Kevin O\'Brien',
  'Sofia Almeida', 'Trevor Banks', 'Lena Kowalski', 'Andre Dupont',
] as const

// Realistic per-claim-type liability limits (USD). Higher-severity claim types
// carry higher available coverage. One is picked per case.
const LIMITS_BY_TYPE: Record<string, number[]> = {
  auto: [50_000, 100_000, 250_000, 300_000],
  slip_and_fall: [100_000, 250_000, 500_000],
  dog_bite: [100_000, 300_000, 500_000], // homeowner policies
  product: [500_000, 1_000_000, 2_000_000],
  medmal: [1_000_000, 2_000_000, 3_000_000],
  nursing_home_abuse: [500_000, 1_000_000, 2_000_000],
  wrongful_death: [1_000_000, 2_000_000, 5_000_000],
  high_severity_surgery: [1_000_000, 2_000_000],
}
const DEFAULT_LIMITS = [100_000, 250_000, 500_000]

function pickLimit(claimType: string | null): number {
  return rand(LIMITS_BY_TYPE[claimType || ''] || DEFAULT_LIMITS)
}

async function main() {
  console.log('DATABASE_URL:', (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':****@'))

  const firm = await prisma.lawFirm.findFirst({ where: { slug: FIRM_SLUG } })
  if (!firm) { console.error(`No firm with slug ${FIRM_SLUG}`); process.exit(1) }

  const assessments = await prisma.assessment.findMany({
    where: { lawFirmId: firm.id },
    select: { id: true, claimType: true },
  })
  console.log(`Firm: ${firm.name} — ${assessments.length} assessments`)

  let created = 0
  let skipped = 0
  let totalLimit = 0
  for (const a of assessments) {
    const existing = await prisma.insuranceDetail.findFirst({ where: { assessmentId: a.id } })
    if (existing && !FORCE) { skipped++; continue }

    const policyLimit = pickLimit(a.claimType)
    totalLimit += policyLimit
    await prisma.insuranceDetail.create({
      data: {
        assessmentId: a.id,
        carrierName: rand(CARRIERS),
        policyLimit,
        policyNumber: `POL-${Math.floor(100000 + Math.random() * 899999)}`,
        claimNumber: `CLM-${Math.floor(100000 + Math.random() * 899999)}`,
        adjusterName: rand(ADJUSTERS),
        insuredParty: 'defendant',
        coverageType: 'liability',
        claimStatus: 'open',
        claimOpenedAt: new Date(),
        coverageConfirmed: true,
        notes: 'Coverage confirmed via dec page (demo book).',
      },
    })
    created++
  }

  console.log(`\nCreated ${created} insurance records, skipped ${skipped} (already had one).`)
  if (created > 0) console.log(`Average policy limit: $${Math.round(totalLimit / created).toLocaleString('en-US')}`)
  console.log("Done. Refresh Salman's dashboard — the Policy limit tile + coverage posture will populate.")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
