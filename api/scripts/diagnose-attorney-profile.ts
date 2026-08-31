/**
 * Show which profile row an attorney's dashboard actually reads.
 *
 * `GET /v1/attorney-profile/profile` resolves the attorney by an exact email
 * match against the signed-in user's email, then loads the profile by that
 * attorney's id. When either step misses, the endpoint does not fail loudly: it
 * either synthesizes a fallback that hardcodes one empty California
 * jurisdiction and `licenseVerified: false`, or it creates a blank profile row
 * and returns that. Both render as an attorney whose counties, case types and
 * licence "did not carry over from registration", while the real row sits
 * intact on a different id — or the real row is the blank one that got created.
 *
 * This reports every User, Attorney and AttorneyProfile that shares the address
 * case-insensitively, so a case-variant email that splits one person across two
 * rows is visible, and prints the stored jurisdictions verbatim.
 *
 * Read-only.
 *
 * Run:  node ../node_modules/tsx/dist/cli.mjs scripts/diagnose-attorney-profile.ts <email>
 */
import { prisma } from '../src/lib/prisma'

const email = process.argv[2]?.trim()

function show(label: string, value: unknown) {
  console.log(`    ${label.padEnd(20)} ${value === null || value === undefined ? '—' : String(value)}`)
}

/** Print a stored JSON column as-is alongside what it parses to. */
function showJson(label: string, raw: string | null | undefined) {
  if (!raw) {
    show(label, '(null)')
    return
  }
  try {
    console.log(`    ${label.padEnd(20)} ${JSON.stringify(JSON.parse(raw))}`)
  } catch {
    console.log(`    ${label.padEnd(20)} (unparseable) ${raw}`)
  }
}

async function main() {
  if (!email) {
    console.error('Usage: diagnose-attorney-profile.ts <email>')
    process.exitCode = 1
    return
  }

  const match = { equals: email, mode: 'insensitive' as const }

  const users = await prisma.user.findMany({
    where: { email: match },
    select: { id: true, email: true, role: true, emailVerified: true, createdAt: true },
  })
  const attorneys = await prisma.attorney.findMany({
    where: { email: match },
    select: {
      id: true,
      email: true,
      name: true,
      venues: true,
      specialties: true,
      isVerified: true,
      createdAt: true,
    },
  })

  console.log(`\nLooking up ${email}\n`)

  console.log(`User rows: ${users.length}`)
  for (const user of users) {
    console.log(`  ${user.id}`)
    show('email', `${user.email}${user.email !== email ? '   <- differs in case' : ''}`)
    show('role', user.role)
    show('emailVerified', user.emailVerified)
    show('createdAt', user.createdAt.toISOString())
  }

  console.log(`\nAttorney rows: ${attorneys.length}`)
  for (const attorney of attorneys) {
    console.log(`  ${attorney.id}`)
    show('email', `${attorney.email}${attorney.email !== email ? '   <- differs in case' : ''}`)
    show('name', attorney.name)
    show('isVerified', attorney.isVerified)
    show('createdAt', attorney.createdAt.toISOString())
    showJson('venues', attorney.venues)
    showJson('specialties', attorney.specialties)

    const profile = await prisma.attorneyProfile.findUnique({
      where: { attorneyId: attorney.id },
      select: {
        id: true,
        jurisdictions: true,
        specialties: true,
        excludedCaseTypes: true,
        licenseNumber: true,
        licenseState: true,
        licenseVerified: true,
        bio: true,
        updatedAt: true,
      },
    })

    if (!profile) {
      console.log('    profile             MISSING — the endpoint will create a blank one on next load')
      continue
    }

    console.log(`    profile             ${profile.id}`)
    showJson('  jurisdictions', profile.jurisdictions)
    showJson('  specialties', profile.specialties)
    showJson('  excludedCaseTypes', profile.excludedCaseTypes)
    show('  licenseNumber', profile.licenseNumber)
    show('  licenseState', profile.licenseState)
    show('  licenseVerified', profile.licenseVerified)
    show('  bio', profile.bio ? `${profile.bio.slice(0, 40)}…` : '(empty)')
    show('  updatedAt', profile.updatedAt.toISOString())
  }

  // The endpoint's own lookup, reproduced exactly, so the report says whether it
  // resolves to the same row this script found case-insensitively.
  const exact = await prisma.attorney.findFirst({ where: { email }, select: { id: true } })
  console.log(`\nThe endpoint's exact-match lookup resolves to: ${exact?.id ?? 'NO ROW (the route 404s)'}`)
  if (attorneys.length > 1) {
    console.log('More than one attorney row shares this address; the profile hangs off only one of them.')
  }
  console.log()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
