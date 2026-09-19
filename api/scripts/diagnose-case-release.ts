/**
 * Ground-truth why a submitted case was never offered to an attorney.
 *
 * Written for the report that a claimant submitted, ordered their attorneys,
 * an admin pressed "Release to routing", and nothing reached anyone. There are
 * several places that chain can stop without surfacing anything to either the
 * claimant or the admin, and most of them only leave a log line:
 *
 *  - `submit-for-review` returns `{ ok: true }` and does nothing at all when a
 *    LeadSubmission row already exists, which happens whenever the case has
 *    been held for manual review. The ranked attorneys, the share
 *    authorization, the HIPAA answer and the contact details are all dropped,
 *    and the UI shows the success screen.
 *  - The admin release rejects anything whose `manualReviewStatus` is not
 *    `pending`, so a second press after a first release 400s.
 *  - Release routing is fire-and-forget: if it places nobody, the response has
 *    already been sent.
 *  - The ranked attorneys can each be blocked by `isVerified`, which defaults
 *    to false and which no registration path sets.
 *
 * This prints the state each of those reads, then names the one that stopped
 * the case.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/diagnose-case-release.ts clearcaseiq-api:/app/diagnose-case-release.ts
 *   docker compose -f docker-compose.deploy.yml --env-file .env.prod exec \
 *     -e CLAIMANT_NAME="Jose Canseco" api node ../node_modules/tsx/dist/cli.mjs diagnose-case-release.ts
 *
 * Or by id / reference:  -e ASSESSMENT_ID=...   -e REFERENCE_CODE=...
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CLAIMANT_NAME = (process.env.CLAIMANT_NAME || '').trim()
const ASSESSMENT_ID = (process.env.ASSESSMENT_ID || '').trim()
const REFERENCE_CODE = (process.env.REFERENCE_CODE || '').trim()

function parseJson(raw: unknown): any {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw))
  } catch {
    return null
  }
}

function preferencesOf(source: any): { ranked: string[]; dismissed: string[]; rankedAt?: string } | null {
  const prefs = source?.plaintiffAttorneyPreferences
  if (!prefs || typeof prefs !== 'object') return null
  const ranked = Array.isArray(prefs.rankedAttorneyIds) ? prefs.rankedAttorneyIds.map(String) : []
  const dismissed = Array.isArray(prefs.dismissedAttorneyIds)
    ? prefs.dismissedAttorneyIds.map(String)
    : []
  if (ranked.length === 0 && dismissed.length === 0) return null
  return { ranked, dismissed, rankedAt: prefs.rankedAt }
}

/** Finds the case by whichever identifier was supplied. */
async function locateAssessment() {
  if (ASSESSMENT_ID) {
    return prisma.assessment.findUnique({ where: { id: ASSESSMENT_ID } })
  }
  if (REFERENCE_CODE) {
    return prisma.assessment.findFirst({ where: { referenceCode: REFERENCE_CODE } })
  }
  if (!CLAIMANT_NAME) return null

  // The claimant's name lives in the facts JSON, not a column, so this scans
  // recent cases rather than indexing. Narrow and newest-first on purpose.
  const candidates = await prisma.assessment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3000,
    select: { id: true, facts: true, createdAt: true },
  })
  const needle = CLAIMANT_NAME.toLowerCase()
  const parts = needle.split(/\s+/).filter(Boolean)

  const hit = candidates.find((row) => {
    const facts = parseJson(row.facts) || {}
    const ctx = facts.plaintiffContext || {}
    const names = [
      ctx.firstName,
      ctx.lastName,
      ctx.fullName,
      ctx.name,
      facts.claimant?.name,
      facts.claimant?.firstName,
      facts.claimant?.lastName,
    ]
      .filter(Boolean)
      .map((v: unknown) => String(v).toLowerCase())
      .join(' ')
    if (!names) return false
    return names.includes(needle) || parts.every((p) => names.includes(p))
  })

  return hit ? prisma.assessment.findUnique({ where: { id: hit.id } }) : null
}

async function main() {
  if (!CLAIMANT_NAME && !ASSESSMENT_ID && !REFERENCE_CODE) {
    console.log('Set CLAIMANT_NAME, ASSESSMENT_ID or REFERENCE_CODE.')
    return
  }

  const assessment = await locateAssessment()
  if (!assessment) {
    console.log(
      `No case found for ${ASSESSMENT_ID || REFERENCE_CODE || CLAIMANT_NAME}.\n` +
        'If searching by name, the claimant name is only stored once contact details are\n' +
        'captured at submission, so an abandoned intake will not match.',
    )
    return
  }

  const facts = parseJson(assessment.facts) || {}
  const ctx = facts.plaintiffContext || {}

  console.log('='.repeat(78))
  console.log(`CASE  ${assessment.id}`)
  console.log('='.repeat(78))
  console.log(`  claimant:   ${ctx.firstName || ctx.name || '(none recorded)'}  ${ctx.email || ''} ${ctx.phone || ''}`.trimEnd())
  console.log(`  reference:  ${assessment.referenceCode || '(none)'}`)
  console.log(`  claimType:  ${assessment.claimType || '(none)'}`)
  console.log(`  status:     ${assessment.status}`)
  console.log(`  created:    ${assessment.createdAt.toISOString()}`)

  // ---- 1. Manual review -----------------------------------------------------
  console.log('\n-- MANUAL REVIEW ---------------------------------------------------------')
  console.log(`  manualReviewStatus: ${assessment.manualReviewStatus || '(null — never held)'}`)
  console.log(`  reason:             ${assessment.manualReviewReason || '(none)'}`)
  console.log(`  heldAt:             ${assessment.manualReviewHeldAt?.toISOString() || '(none)'}`)
  console.log(`  reviewedAt:         ${assessment.reviewedAt?.toISOString() || '(none)'}  by ${assessment.reviewedBy || '(nobody)'}`)
  console.log(`  note:               ${assessment.manualReviewNote || '(none)'}`)

  const releasable = assessment.manualReviewStatus === 'pending'
  console.log(
    releasable
      ? '  -> The admin Release button will work on this case.'
      : `  -> The admin Release button REJECTS this case with 400 "Case is not in manual\n` +
          `     review queue", because the action requires manualReviewStatus === 'pending'\n` +
          `     and this is '${assessment.manualReviewStatus || 'null'}'. If the admin pressed Release and\n` +
          '     saw nothing happen, this is very likely what they hit.',
  )

  // ---- 2. The claimant's attorney order -------------------------------------
  const lead = await prisma.leadSubmission.findUnique({ where: { assessmentId: assessment.id } })
  const sourceDetails = parseJson(lead?.sourceDetails)
  const prefsInFacts = preferencesOf(facts)
  const prefsInLead = preferencesOf(sourceDetails)

  console.log('\n-- THE CLAIMANT\'S ATTORNEY ORDER -----------------------------------------')
  console.log(`  recorded on the assessment facts: ${prefsInFacts ? `ranked ${prefsInFacts.ranked.length}, removed ${prefsInFacts.dismissed.length} (at ${prefsInFacts.rankedAt || 'unknown'})` : 'NOTHING'}`)
  console.log(`  recorded on the lead (what routing reads): ${prefsInLead ? `ranked ${prefsInLead.ranked.length}, removed ${prefsInLead.dismissed.length}` : 'NOTHING'}`)

  if (!prefsInLead) {
    console.log(
      '  -> Release routing reads ONLY the lead copy. With nothing there it takes the\n' +
        "     'no_consumer_slate' branch and routes by its own ranking, ignoring the\n" +
        '     order the claimant set.',
    )
  }

  // ---- 3. The lead row ------------------------------------------------------
  console.log('\n-- LEAD SUBMISSION -------------------------------------------------------')
  if (!lead) {
    console.log('  No LeadSubmission row: the case was never submitted to the network.')
  } else {
    console.log(`  created:        ${lead.createdAt.toISOString()}`)
    console.log(`  submittedAt:    ${lead.submittedAt.toISOString()}`)
    console.log(`  sourceType:     ${lead.sourceType}   (who created the row)`)
    console.log(`  status:         ${lead.status}`)
    console.log(`  lifecycleState: ${lead.lifecycleState}`)
    console.log(`  routingLocked:  ${lead.routingLocked}`)
    console.log(`  assignedTo:     ${lead.assignedAttorneyId || '(nobody)'}`)

    if (lead.sourceType === 'routing_engine') {
      console.log(
        '  -> This row was created by manual-review placement, not by the claimant\n' +
          '     pressing submit. That matters: once ANY lead row exists,\n' +
          '     POST /assessments/:id/submit-for-review returns { ok: true } immediately\n' +
          '     and writes nothing. So if the claimant ordered their attorneys AFTER the\n' +
          '     case was held, their order, share authorization and HIPAA answer were all\n' +
          '     discarded while the UI showed the success screen.',
      )
    }
  }

  // ---- 4. Share authorization ----------------------------------------------
  const consents = await prisma.consent.findMany({
    where: { assessmentId: assessment.id, consentType: 'attorney_share' },
    orderBy: { createdAt: 'desc' },
  })
  console.log('\n-- SHARE AUTHORIZATION ---------------------------------------------------')
  if (consents.length === 0) {
    console.log('  None. Routing that checks live authorization will skip every attorney,')
    console.log('  because the claimant has no recorded permission to disclose this case.')
  } else {
    for (const c of consents) {
      const meta = parseJson(c.metadata) || {}
      const covered = Array.isArray(meta.attorneyIds) ? meta.attorneyIds : []
      console.log(
        `  ${c.createdAt.toISOString()}  granted=${c.granted} revoked=${c.revokedAt?.toISOString() || 'no'}  covers ${covered.length} attorney(s)`,
      )
    }
  }

  // ---- 5. Did anything actually go out? ------------------------------------
  const [introductions, waves, events] = await Promise.all([
    prisma.introduction.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, attorneyId: true, status: true, createdAt: true },
    }),
    prisma.routingWave.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { waveNumber: 'asc' },
    }),
    prisma.routingAnalytics.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { createdAt: 'asc' },
      select: { eventType: true, attorneyId: true, eventData: true, createdAt: true },
    }),
  ])

  console.log('\n-- WHAT ACTUALLY WENT OUT ------------------------------------------------')
  console.log(`  introductions: ${introductions.length}`)
  for (const i of introductions) {
    console.log(`    ${i.createdAt.toISOString()}  attorney=${i.attorneyId}  status=${i.status}`)
  }
  console.log(`  routing waves: ${waves.length}`)
  for (const w of waves as any[]) {
    console.log(`    wave ${w.waveNumber}  ${w.createdAt?.toISOString?.() || ''}  ${w.status || ''}`)
  }
  console.log(`  routing events: ${events.length}`)
  for (const e of events) {
    const data = e.eventData ? String(e.eventData).slice(0, 160) : ''
    console.log(`    ${e.createdAt.toISOString()}  ${e.eventType}  ${e.attorneyId || ''}  ${data}`)
  }

  // ---- 6. The gates on each attorney the claimant chose --------------------
  const candidateIds = [...new Set([...(prefsInLead?.ranked || []), ...(prefsInFacts?.ranked || [])])]
  if (candidateIds.length > 0) {
    console.log('\n-- THE ATTORNEYS THE CLAIMANT CHOSE --------------------------------------')
    const attorneys = await prisma.attorney.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isVerified: true,
        venues: true,
        specialties: true,
        attorneyProfile: { select: { jurisdictions: true, licenseVerified: true } },
      },
    })
    for (const id of candidateIds) {
      const a = attorneys.find((x) => x.id === id)
      if (!a) {
        console.log(`  ${id}  -- NO SUCH ATTORNEY (deleted?)`)
        continue
      }
      const blockers: string[] = []
      if (!a.isActive) blockers.push('isActive=false')
      if (!a.isVerified) blockers.push('isVerified=false (hard routing gate)')
      const states = (parseJson(a.attorneyProfile?.jurisdictions) || [])
        .map((j: any) => String(j?.state || '').toUpperCase())
        .filter(Boolean)
      if (states.length === 0) blockers.push('profile.jurisdictions empty (no service area)')
      console.log(`  ${a.name} <${a.email}>  ${blockers.length === 0 ? 'ROUTABLE' : 'BLOCKED: ' + blockers.join(', ')}`)
      console.log(`      venues=${a.venues || '(none)'}  specialties=${a.specialties || '(none)'}`)
      console.log(`      profile jurisdictions=${states.join(',') || '(none)'}  licenseVerified=${a.attorneyProfile?.licenseVerified ?? 'n/a'}`)
    }
  }

  // ---- Verdict -------------------------------------------------------------
  console.log('\n' + '='.repeat(78))
  console.log('VERDICT')
  console.log('='.repeat(78))

  if (introductions.length > 0) {
    console.log('  The case DID reach attorneys. Look at the introduction statuses above;')
    console.log('  the failure is in notification delivery or the attorney UI, not routing.')
  } else if (!lead) {
    console.log('  Never submitted. No lead row exists, so nothing could route.')
  } else if (!releasable && prefsInLead === null) {
    console.log(`  Two things are wrong, and together they explain "nothing happened":`)
    console.log(`  1. manualReviewStatus is '${assessment.manualReviewStatus}', not 'pending', so the admin`)
    console.log('     Release button returned 400 and no routing was ever kicked off.')
    console.log("  2. The claimant's attorney order was never stored on the lead, so even a")
    console.log('     successful release would have ignored the order they set.')
  } else if (prefsInLead === null && prefsInFacts === null) {
    console.log('  No attorney order was ever recorded, in either place. The claimant went')
    console.log('  through the ordering screen but submit-for-review discarded it — the')
    console.log('  early return on an existing lead row. Their choices never reached routing.')
  } else if (consents.length === 0) {
    console.log('  No share authorization exists, so per-attorney authorization checks skip')
    console.log('  every attorney in the queue and routing places nobody.')
  } else if (candidateIds.length > 0) {
    console.log('  A queue exists. Check the BLOCKED reasons listed above — an attorney with')
    console.log('  isVerified=false is invisible to routing even though the claimant picked them.')
  } else {
    console.log('  Submitted, released, nothing sent, and no single gate stands out.')
    console.log('  Check the routing events above for the last thing that ran.')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
