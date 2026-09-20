/**
 * Check that the settlement figure stored on a case is the one the engine
 * produces from the facts on file today.
 *
 * There are two numbers and they can disagree. The `Prediction` row is a
 * snapshot, written when the case was last predicted or recalculated; the
 * claimant's screens render it. `underwriteCase` is the live engine. A gap
 * between them means either the facts moved without a recalculation, or a
 * surface is doing arithmetic of its own — both have happened here, and the
 * second is what `docs/valuation-gap-analysis.md` is largely about.
 *
 * So this recomputes through exactly the path `routes/predict.ts` takes,
 * including the same evidence-file selection, and prints the inputs that drive
 * the number rather than only the number. A figure that looks wrong is usually
 * a right answer to inputs nobody checked.
 *
 * Read-only.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/validate-case-valuation.ts \
 *     clearcaseiq-prod-api:/app/scripts/validate-case-valuation.ts
 *   docker exec -e CLAIMANT="Patrick David" clearcaseiq-prod-api \
 *     node /node_modules/tsx/dist/cli.mjs scripts/validate-case-valuation.ts
 *
 * ASSESSMENT_ID targets one case directly instead of searching by name.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CLAIMANT = (process.env.CLAIMANT || '').trim()
const ASSESSMENT_ID = (process.env.ASSESSMENT_ID || '').trim()

const usd = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n)
    ? '(none)'
    : `$${Math.round(n).toLocaleString('en-US')}`

function parseJson<T>(raw: unknown, fallback: T): T {
  if (!raw) return fallback
  if (typeof raw === 'object') return raw as T
  try {
    return JSON.parse(String(raw)) as T
  } catch {
    return fallback
  }
}

/** Percentage difference, guarding the divide-by-zero on an unvalued case. */
function drift(stored: number | null | undefined, live: number | null | undefined): string {
  if (!stored || !live) return ''
  const pct = ((live - stored) / stored) * 100
  if (Math.abs(pct) < 0.5) return '  (matches)'
  return `  (${pct > 0 ? '+' : ''}${pct.toFixed(1)}% vs stored)`
}

async function findAssessments() {
  if (ASSESSMENT_ID) {
    const one = await prisma.assessment.findUnique({ where: { id: ASSESSMENT_ID }, select: { id: true } })
    return one ? [one.id] : []
  }
  if (!CLAIMANT) return []

  // The claimant's name lives on the user record, which is where
  // `plaintiffNameOf` reads it. Guest intakes have no user, so the facts blob
  // is searched too — it is a JSON string column, so a substring match is the
  // only search available and is good enough to find one person by hand.
  const parts = CLAIMANT.split(/\s+/).filter(Boolean)
  const users = await prisma.user.findMany({
    where: {
      AND: parts.map((part) => ({
        OR: [
          { firstName: { contains: part, mode: 'insensitive' as const } },
          { lastName: { contains: part, mode: 'insensitive' as const } },
          { name: { contains: part, mode: 'insensitive' as const } },
        ],
      })),
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  })

  const byUser = users.length
    ? await prisma.assessment.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
        select: { id: true },
      })
    : []

  const byFacts = await prisma.assessment.findMany({
    where: { AND: parts.map((part) => ({ facts: { contains: part, mode: 'insensitive' as const } })) },
    select: { id: true },
    take: 25,
  })

  if (users.length) {
    console.log('Matched accounts:')
    for (const u of users) {
      console.log(`  ${[u.firstName, u.lastName].filter(Boolean).join(' ')} <${u.email}>`)
    }
    console.log('')
  }

  return [...new Set([...byUser, ...byFacts].map((a) => a.id))]
}

async function report(assessmentId: string) {
  // The same include `routes/predict.ts` uses. The evidence selection is part
  // of the valuation input, so narrowing it here would change the answer.
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      evidenceFiles: {
        select: { category: true, originalName: true, aiClassification: true, aiSummary: true },
      },
      predictions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  if (!assessment) {
    console.log(`No case ${assessmentId}.`)
    return
  }

  const facts = parseJson<Record<string, any>>(assessment.facts, {})
  const name = [assessment.user?.firstName, assessment.user?.lastName].filter(Boolean).join(' ')

  console.log('='.repeat(78))
  console.log(`${name || '(no account name)'}   ${assessment.referenceCode || assessment.id}`)
  console.log('='.repeat(78))
  console.log(`  id:         ${assessment.id}`)
  console.log(`  claim:      ${assessment.claimType}`)
  console.log(`  venue:      ${[assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ') || '(none)'}`)
  console.log(`  created:    ${assessment.createdAt.toISOString()}`)
  console.log(`  updated:    ${assessment.updatedAt.toISOString()}`)
  console.log(`  evidence:   ${assessment.evidenceFiles.length} file(s)`)

  const prediction = assessment.predictions[0]
  const storedBands = parseJson<any>(prediction?.bands, {})
  const storedSettlement = storedBands.settlement || {}

  console.log('\n-- STORED (what the claimant sees) -----------------------------------------')
  if (!prediction) {
    console.log('  No prediction row. Nothing has valued this case.')
  } else {
    console.log(`  written:    ${prediction.createdAt.toISOString()}  (${prediction.modelVersion})`)
    console.log(
      `  settlement: ${usd(storedSettlement.p25 ?? storedBands.p25)} - ${usd(
        storedSettlement.p75 ?? storedBands.p75
      )}   expected ${usd(storedSettlement.median ?? storedBands.median)}`
    )
    if (storedBands.trial) {
      console.log(`  trial:      ${usd(storedBands.trial.p25)} - ${usd(storedBands.trial.p75)}`)
    }
    if (storedSettlement.policyLimitConstrained) {
      console.log(`  capped at policy limit ${usd(storedSettlement.policyLimit)}`)
    }
    // A snapshot older than the facts is the ordinary cause of a mismatch, and
    // is not itself a bug — it means nobody has re-predicted since.
    if (prediction.createdAt < assessment.updatedAt) {
      const days = (assessment.updatedAt.getTime() - prediction.createdAt.getTime()) / 86_400_000
      console.log(
        `  NOTE: the case was edited ${days.toFixed(1)} day(s) after this was written, so it is stale.`
      )
    }
  }

  const { underwriteCase } = await import('../src/lib/underwriting-engine')
  let live: ReturnType<typeof underwriteCase> | null = null
  try {
    live = underwriteCase({
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty,
      facts,
      evidenceFiles: assessment.evidenceFiles,
    })
  } catch (err) {
    console.log(`\n  Underwriting threw: ${(err as Error).message}`)
    console.log('  In production this is caught and the heuristic estimate is shown instead.')
    return
  }

  const s = live.settlement
  console.log('\n-- LIVE (the engine, on the facts as they stand now) ------------------------')
  console.log(`  model:      ${live.modelVersion}`)
  console.log(
    `  settlement: ${usd(s.low)} - ${usd(s.high)}   expected ${usd(s.expected)}${drift(
      storedSettlement.median ?? storedBands.median,
      s.expected
    )}`
  )
  console.log(`  low  ${usd(s.low)}${drift(storedSettlement.p25 ?? storedBands.p25, s.low)}`)
  console.log(`  high ${usd(s.high)}${drift(storedSettlement.p75 ?? storedBands.p75, s.high)}`)

  console.log('\n-- HOW IT GOT THERE ---------------------------------------------------------')
  const e = s.economicDamages
  console.log(`  medical bills:     ${usd(e.medicalBills)}`)
  console.log(`  lost wages:        ${usd(e.lostWages)}`)
  console.log(`  out of pocket:     ${usd(e.outOfPocket)}`)
  console.log(`  future medical:    ${usd(e.futureMedicalAdjusted)}`)
  console.log(`  economic total:    ${usd(e.total)}`)
  console.log(`  severity:          ${live.severity.primaryInjury} / ${live.severity.tier} (${live.severity.score}/100, from ${live.severity.injurySource})`)
  console.log(`  liability:         ${live.liability.grade} (${live.liability.score}/100)`)
  console.log(`  treatment:         ${live.treatment.score}/100`)
  console.log(`  documentation:     ${live.documentation.score}/100`)
  console.log(`  formula:           ${s.formula}`)

  // Coverage is the most common reason a number is lower than the facts
  // suggest, and the rules are counterintuitive enough to be worth printing in
  // full. See the coverage section of docs/valuation-gap-analysis.md.
  console.log('\n-- COVERAGE -----------------------------------------------------------------')
  console.log(`  basis:             ${s.coverage.basis}`)
  console.log(`  defendant limit:   ${usd(s.coverage.defendantLimit)}`)
  console.log(`  ceiling applied:   ${s.policyLimitConstrained ? usd(s.coverage.ceiling) : 'no cap'}`)
  if (s.policyLimitConstrained) {
    console.log(`  uncapped expected: ${usd(s.uncappedExpected)}`)
  }

  if (live.severity.factors?.length) {
    console.log('\n  severity factors:  ' + live.severity.factors.join('; '))
  }
  if (live.liability.negatives?.length) {
    console.log('  liability against: ' + live.liability.negatives.join('; '))
  }
  if (live.documentation.gaps?.length) {
    console.log('  documentation gaps: ' + live.documentation.gaps.map((g: any) => g.label ?? g).join('; '))
  }

  const outcome = await prisma.caseOutcome.findFirst({
    where: { assessmentId },
    orderBy: { createdAt: 'desc' },
  })
  if (outcome) {
    console.log('\n-- ACTUAL OUTCOME -----------------------------------------------------------')
    console.log(`  ${outcome.outcomeType}  gross ${usd(outcome.grossAmount)}  net ${usd(outcome.netToClient)}`)
  }
}

async function main() {
  const ids = await findAssessments()
  if (ids.length === 0) {
    console.log(
      ASSESSMENT_ID || CLAIMANT
        ? 'No case found. Set CLAIMANT to a name on the account, or ASSESSMENT_ID directly.'
        : 'Set CLAIMANT or ASSESSMENT_ID.'
    )
    return
  }
  console.log(`${ids.length} case(s) found.\n`)
  for (const id of ids) {
    await report(id)
    console.log('')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
