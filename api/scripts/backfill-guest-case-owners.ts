/**
 * Reunite pre-account cases with the accounts that own their email.
 *
 * A guest submission produced two rows for one person: a provisional
 * passwordless `User` keyed on their real email, and an assessment owned by
 * either nobody or the synthetic `guest+<id>@caseiq.local` shadow user. Only the
 * `pending_assessment_id` in `localStorage` and the emailed claim link ever
 * joined them, so anyone who got into their account another way — setting a
 * password through "forgot password" is the common one — signed in to an empty
 * dashboard while their case sat on the shadow user (CP-811).
 *
 * Submission and sign-in now attach these cases on their own. This is for the
 * ones already stranded when that shipped.
 *
 * Reports and changes nothing unless run with --apply, so the intended writes
 * can be read before any are made. Idempotent: an adopted case no longer matches.
 *
 * Run:  node ../node_modules/tsx/dist/cli.mjs scripts/backfill-guest-case-owners.ts
 *       node ../node_modules/tsx/dist/cli.mjs scripts/backfill-guest-case-owners.ts --apply
 */
import { prisma } from '../src/lib/prisma'
import { isGuestCaseUserEmail } from '../src/lib/client-consent-guard'

const APPLY = process.argv.includes('--apply')

function contactEmailFromFacts(rawFacts: string | null | undefined): string | null {
  if (!rawFacts) return null
  try {
    const facts = JSON.parse(rawFacts) as { plaintiffContext?: { email?: unknown } }
    const email = facts?.plaintiffContext?.email
    return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
  } catch {
    return null
  }
}

async function main() {
  const orphans = await prisma.assessment.findMany({
    where: { OR: [{ userId: null }, { user: { email: { startsWith: 'guest+' } } }] },
    select: {
      id: true,
      userId: true,
      facts: true,
      referenceCode: true,
      createdAt: true,
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Cases with no real owner: ${orphans.length}`)
  if (!APPLY) console.log('DRY RUN — pass --apply to write. Nothing will change.\n')

  let adopted = 0
  let noEmail = 0
  let noAccount = 0
  let skipped = 0

  for (const assessment of orphans) {
    // Re-check rather than trusting the SQL prefilter: only a case belonging to
    // nobody or to a synthetic shadow user may move.
    if (assessment.userId && !isGuestCaseUserEmail(assessment.user?.email || '')) {
      skipped++
      continue
    }

    // Only an account that already exists. The script never creates one: a case
    // whose submitter never came back has nowhere to go, and inventing an
    // account would email a stranger about a case they cannot see.
    const selectOwner = { id: true, email: true, emailVerified: true, passwordHash: true }

    const email = contactEmailFromFacts(assessment.facts)
    let owner = email
      ? await prisma.user.findUnique({ where: { email }, select: selectOwner })
      : null
    let via = 'facts email'

    // The wizard mirrors contact details to an intake lead and provisions the
    // passwordless account from there, recording both the account and the
    // assessment on that row. That link is what should have been copied onto the
    // case in the first place, and it survives the cases the facts blob misses:
    // an email captured mid-wizard is on the lead even when the person stopped
    // before submit enriched plaintiffContext.
    if (!owner) {
      const lead = await prisma.intakeLead.findUnique({
        where: { assessmentId: assessment.id },
        select: { user: { select: selectOwner } },
      })
      if (lead?.user) {
        owner = lead.user
        via = 'intake lead'
      }
    }

    if (!owner) {
      if (email) noAccount++
      else noEmail++
      continue
    }

    // A shadow user is what we are moving cases away from, so it can never be
    // the destination — the lead could point at one if the address it captured
    // was itself synthetic.
    if (isGuestCaseUserEmail(owner.email)) {
      noAccount++
      continue
    }

    const label = assessment.referenceCode || assessment.id
    const status = owner.passwordHash ? 'active' : 'passwordless'
    console.log(`  ${label} -> ${owner.email} (${status}, verified=${owner.emailVerified}, via ${via})`)

    if (APPLY) {
      await prisma.assessment.update({ where: { id: assessment.id }, data: { userId: owner.id } })
      await prisma.evidenceFile.updateMany({
        where: { assessmentId: assessment.id },
        data: { userId: owner.id },
      })
    }
    adopted++
  }

  console.log(
    `\n${APPLY ? 'Adopted' : 'Would adopt'} ${adopted}. ` +
      `No contact email: ${noEmail}. No account for that email: ${noAccount}. Already owned: ${skipped}.`
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
