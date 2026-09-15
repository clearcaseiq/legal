/**
 * Ground-truth what exists for an attorney (by name or email) — used to debug
 * why a seeded book isn't showing in New Matches, or why an attorney who plainly
 * exists never appears for a plaintiff.
 *
 * It used to select only `isActive`, which made it report a healthy attorney
 * while they were invisible to every plaintiff: the gate is `isVerified`, which
 * defaults to false and which no registration path ever sets. Anything that can
 * hide an attorney is now printed, with the blockers named at the end.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/diagnose-attorney.ts clearcaseiq-api:/app/diagnose-attorney.ts
 *   docker compose -f docker-compose.deploy.yml --env-file .env.prod exec \
 *     -e ATTORNEY_NAME=Tucker api node ../node_modules/tsx/dist/cli.mjs diagnose-attorney.ts
 *
 * Or by email:  -e ATTORNEY_EMAIL=someone@example.com
 * Add -e VENUE=CA to check the geography gates against a specific state.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const NAME = (process.env.ATTORNEY_NAME || '').trim()
const EMAIL = (process.env.ATTORNEY_EMAIL || '').trim()
/** Optional: the plaintiff's venue state, e.g. VENUE=CA, to check the geography gates. */
const VENUE = (process.env.VENUE || '').trim().toUpperCase()

function parseArray(raw: string | null | undefined): any[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** The states an attorney's profile claims, as the routing engine reads them. */
function jurisdictionStates(raw: string | null | undefined): string[] {
  return parseArray(raw)
    .map((entry) => String(entry?.state || '').toUpperCase())
    .filter(Boolean)
}

/**
 * What, if anything, ever checked this attorney's licence.
 *
 * `licenseVerificationMethod` is the only field that records which path ran, and
 * a null means none of them did — a bar number typed at registration is stored
 * verbatim and checked against nothing. Registration also writes only
 * `AttorneyProfile.licenseNumber`, never `Attorney.barNumber`, so the column
 * carrying the `@unique` constraint is usually empty.
 */
function reportLicence(a: any) {
  const p = a.attorneyProfile
  const method = p?.licenseVerificationMethod || null

  console.log(
    `  licence: profile.number=${p?.licenseNumber || '(none)'} state=${p?.licenseState || '(none)'} ` +
      `verified=${p?.licenseVerified ?? false}${p?.licenseVerifiedAt ? ` at ${new Date(p.licenseVerifiedAt).toISOString()}` : ''}`,
  )
  console.log(`           attorney.barNumber=${a.barNumber || '(none)'} ${a.barState || ''}`.trimEnd())
  console.log(`           method=${method || 'NONE — nothing ever checked it'}  document=${p?.licenseFileUrl ? 'uploaded' : 'none'}`)

  if (!p) {
    console.log('           No AttorneyProfile row at all, so no licence was ever recorded.')
    return
  }

  switch (method) {
    case 'state_bar_lookup':
      console.log(
        p.licenseVerified
          ? '           Checked against the live CA State Bar and found active. Note the lookup does\n' +
              '           not compare the record\'s name to this attorney, so it proves the number is\n' +
              '           active, not that it belongs to them.'
          : '           A State Bar lookup ran and did NOT verify. Either the number has no record,\n' +
              '           the status is not Active, or the response could not be parsed.',
      )
      break
    case 'manual_upload':
      console.log(
        '           A document was uploaded. Nothing reads it: there is no OCR, no review queue\n' +
          '           and no admin route that can open it. It cannot verify anything on its own.',
      )
      break
    case 'admin_review':
      console.log('           An admin toggled verification by hand. No bar data was checked by the system.')
      break
    default:
      console.log(
        p.licenseNumber
          ? '           A bar number was typed in and stored verbatim. Registration applies no format\n' +
              '           rule and performs no lookup, so this number has never been checked.'
          : '           No bar number was ever supplied.',
      )
  }
}

/**
 * Everything that can hide this attorney, and from which surface.
 *
 * The two surfaces disagree on where geography lives, which is worth seeing
 * side by side: `/v1/attorneys/search` reads `Attorney.venues` (or the firm's
 * state), while the routing engine reads `AttorneyProfile.jurisdictions` and
 * treats a missing profile as an outright disqualification.
 */
function reportVisibility(a: any) {
  const venues = parseArray(a.venues).map((v) => String(v).toUpperCase())
  const specialties = parseArray(a.specialties)
  const profile = a.attorneyProfile
  const states = jurisdictionStates(profile?.jurisdictions)

  console.log(`Attorney: ${a.name} <${a.email || 'no-email'}> (${a.id})`)
  console.log(`  isActive=${a.isActive}  isVerified=${a.isVerified}  firm=${a.lawFirmId || 'none'}${a.lawFirm?.state ? ` (${a.lawFirm.state})` : ''}`)
  console.log(`  venues (search geography): ${venues.length ? venues.join(', ') : '(empty)'}`)
  console.log(`  specialties: ${specialties.length ? specialties.join(', ') : '(empty)'}`)
  console.log(`  profile.jurisdictions (routing geography): ${profile ? (states.length ? states.join(', ') : '(empty)') : 'NO PROFILE ROW'}`)

  reportLicence(a)

  const blockers: string[] = []
  if (!a.isActive) blockers.push('isActive=false — hidden from search and routing.')
  if (!a.isVerified) {
    blockers.push(
      'isVerified=false — hidden from every plaintiff surface. This is the default, and no ' +
        'registration path sets it; an admin must PATCH /v1/admin/attorneys/:id/verification.',
    )
  }
  if (venues.length === 0 && !a.lawFirm?.state) {
    blockers.push('venues is empty and the firm has no state — matches no venue in /v1/attorneys/search.')
  }
  if (specialties.length === 0) blockers.push('specialties is empty — matches no claim type.')
  if (!profile) {
    blockers.push('No AttorneyProfile row — the routing engine rejects with "No jurisdictions configured".')
  } else if (states.length === 0) {
    blockers.push('profile.jurisdictions is empty — the routing engine rejects on state match.')
  }
  if (VENUE) {
    if (venues.length > 0 && !venues.includes(VENUE) && a.lawFirm?.state !== VENUE) {
      blockers.push(`venues does not include ${VENUE} — invisible to ${VENUE} plaintiffs in search.`)
    }
    if (states.length > 0 && !states.includes(VENUE)) {
      blockers.push(`profile.jurisdictions does not include ${VENUE} — no ${VENUE} case can be routed to them.`)
    }
  }

  // Narrowing filters are not blockers on their own, but they exclude cases
  // silently and are the usual answer once verification is ruled out.
  const narrowing: string[] = []
  const excluded = parseArray(profile?.excludedCaseTypes)
  if (excluded.length) narrowing.push(`excludedCaseTypes: ${excluded.join(', ')}`)
  if (profile?.minInjurySeverity != null) narrowing.push(`minInjurySeverity: ${profile.minInjurySeverity}`)
  if (profile?.minDamagesRange != null) narrowing.push(`minDamagesRange: ${profile.minDamagesRange}`)
  if (profile?.maxDamagesRange != null) narrowing.push(`maxDamagesRange: ${profile.maxDamagesRange}`)
  if (profile?.maxCasesPerWeek != null) narrowing.push(`maxCasesPerWeek: ${profile.maxCasesPerWeek}`)
  if (profile?.maxCasesPerMonth != null) narrowing.push(`maxCasesPerMonth: ${profile.maxCasesPerMonth}`)
  if (narrowing.length) console.log(`  narrowing filters: ${narrowing.join(' | ')}`)

  if (blockers.length === 0) {
    console.log('  VISIBLE: nothing on the attorney record hides them.')
    console.log('           If a plaintiff still cannot see them, check the claim type against')
    console.log('           specialties, and the case-side gates in pre-routing-gate.ts.')
  } else {
    console.log(`  INVISIBLE — ${blockers.length} blocker${blockers.length === 1 ? '' : 's'}:`)
    blockers.forEach((reason) => console.log(`     ✗ ${reason}`))
  }
  console.log('')
}

async function main() {
  console.log(`\n=== diagnose-attorney (name="${NAME || '—'}" email="${EMAIL || '—'}") ===\n`)

  const where = EMAIL
    ? { email: { equals: EMAIL, mode: 'insensitive' as const } }
    : NAME
      ? { name: { contains: NAME, mode: 'insensitive' as const } }
      : {}

  const attorneys = await prisma.attorney.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      isVerified: true,
      barNumber: true,
      barState: true,
      specialties: true,
      venues: true,
      lawFirmId: true,
      lawFirm: { select: { state: true } },
      attorneyProfile: {
        select: {
          licenseNumber: true,
          licenseState: true,
          licenseVerified: true,
          licenseVerifiedAt: true,
          licenseVerificationMethod: true,
          licenseFileUrl: true,
          jurisdictions: true,
          excludedCaseTypes: true,
          minInjurySeverity: true,
          minDamagesRange: true,
          maxDamagesRange: true,
          maxCasesPerWeek: true,
          maxCasesPerMonth: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (attorneys.length === 0) {
    console.log('No Attorney rows matched. Listing a few attorneys so you can see the real names:')
    const sample = await prisma.attorney.findMany({ select: { id: true, name: true, email: true }, take: 25, orderBy: { createdAt: 'desc' } })
    sample.forEach((a) => console.log(`  - ${a.name} <${a.email || 'no-email'}> (${a.id})`))
    return
  }

  for (const a of attorneys) {
    reportVisibility(a)

    const leadsByStatus = await prisma.leadSubmission.groupBy({
      by: ['status'],
      where: { assignedAttorneyId: a.id },
      _count: { _all: true },
    })
    const leadTotal = leadsByStatus.reduce((s, r) => s + r._count._all, 0)
    console.log(`  leadSubmissions (assignedAttorneyId): ${leadTotal}`)
    leadsByStatus.forEach((r) => console.log(`     status="${r.status}": ${r._count._all}`))

    const introsByStatus = await prisma.introduction.groupBy({
      by: ['status'],
      where: { attorneyId: a.id },
      _count: { _all: true },
    })
    const introTotal = introsByStatus.reduce((s, r) => s + r._count._all, 0)
    console.log(`  introductions (attorneyId): ${introTotal}`)
    introsByStatus.forEach((r) => console.log(`     status="${r.status}": ${r._count._all}`))

    // Reproduce exactly what powers the Accepted / Declined tiles so we can see
    // why they might read 0 (old responses fall outside the 7/30/90-day window).
    const respondedIntros = await prisma.introduction.findMany({
      where: { attorneyId: a.id, respondedAt: { not: null } },
      select: { status: true, respondedAt: true },
    })
    const nowMs = Date.now()
    const DAY = 24 * 60 * 60 * 1000
    const acc = { last7: 0, last30: 0, last90: 0, total: 0 }
    const dec = { last7: 0, last30: 0, last90: 0, total: 0 }
    for (const i of respondedIntros) {
      const bucket = i.status === 'ACCEPTED' ? acc : i.status === 'DECLINED' ? dec : null
      if (!bucket || !i.respondedAt) continue
      bucket.total += 1
      const age = nowMs - new Date(i.respondedAt).getTime()
      if (age <= 7 * DAY) bucket.last7 += 1
      if (age <= 30 * DAY) bucket.last30 += 1
      if (age <= 90 * DAY) bucket.last90 += 1
    }
    console.log(`  Accepted tile would show → 7d:${acc.last7} 30d:${acc.last30} 90d:${acc.last90} (total ${acc.total})`)
    console.log(`  Declined tile would show → 7d:${dec.last7} 30d:${dec.last30} 90d:${dec.last90} (total ${dec.total})`)
    for (const i of respondedIntros) {
      if (i.status !== 'ACCEPTED' && i.status !== 'DECLINED') continue
      const days = i.respondedAt ? Math.round((nowMs - new Date(i.respondedAt).getTime()) / DAY) : null
      console.log(`     ${i.status} • responded ${days != null ? days + ' day(s) ago' : 'unknown'} (${i.respondedAt?.toISOString?.() || '—'})`)
    }

    // What the dashboard "New Matches" view actually sees: PENDING intros, newest first.
    const pending = await prisma.introduction.findMany({
      where: { attorneyId: a.id, status: 'PENDING' },
      select: { id: true, requestedAt: true, assessment: { select: { claimType: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { requestedAt: 'desc' },
      take: 25,
    })
    console.log(`  PENDING introductions (should equal New Matches): ${pending.length}`)
    for (const p of pending.slice(0, 25)) {
      const ageMin = p.requestedAt ? Math.round((Date.now() - new Date(p.requestedAt).getTime()) / 60000) : null
      const nm = `${p.assessment?.user?.firstName || ''} ${p.assessment?.user?.lastName || ''}`.trim() || '—'
      console.log(`     - ${p.assessment?.claimType || '?'} • ${nm} • requested ${ageMin != null ? ageMin + 'm ago' : 'unknown'}`)
    }
    console.log('')
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
