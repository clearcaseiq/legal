/**
 * Promote reviewed `production_attorneys` rows into live `Attorney` records.
 *
 * Scraped directory rows land in `production_attorneys` with status "scraped".
 * After a human marks them "reviewed", this script creates (or reuses) the
 * matching `LawFirm` and `Attorney`, then flips the staging row to "promoted"
 * and records `promotedAttorneyId` so it is never double-imported.
 *
 * Run:
 *   cd api
 *   PROMOTE_STATUS=reviewed PROMOTE_LIMIT=100 \
 *   node ../node_modules/tsx/dist/cli.mjs scripts/promote-production-attorneys.ts
 *
 * Env vars:
 *   PROMOTE_STATUS             Staging status to promote (default "reviewed").
 *   PROMOTE_SOURCE             Only promote rows from this source (optional).
 *   PROMOTE_LIMIT              Max rows to process (default 100).
 *   PROMOTE_DRY_RUN            "true" to log without writing.
 *   PROMOTE_REQUIRE_COUNTY     "true" to skip rows whose county is unresolved,
 *                              instead of promoting them as statewide.
 *
 * Promoted attorneys are intentionally left `isVerified: false`, which means
 * routing will not send them leads until a human vets them. Promotion builds the
 * record; it does not vouch for it.
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'
import { resolveOrCreateLawFirm, resolveExistingAttorney } from '../src/lib/attorney-resolve'
import { resolveCaCounty } from '../src/lib/ca-counties'
import { buildJurisdictions, serializeJurisdictions } from '../src/lib/jurisdictions'
import {
  normalizePracticeAreas,
  parsePracticeAreaText,
} from '../src/lib/practice-area-normalize'

function parseBoolean(value: string | undefined): boolean {
  return value === 'true'
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

type ProductionRow = Awaited<ReturnType<typeof prisma.productionAttorney.findFirst>>
/** The transaction-scoped client, so every write in a promotion is atomic. */
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

async function resolveLawFirm(
  tx: TxClient,
  row: NonNullable<ProductionRow>
): Promise<string | null> {
  const resolved = await resolveOrCreateLawFirm(tx, {
    name: row.firmName?.trim() || row.name?.trim(),
    website: row.website,
    email: row.email,
    phone: row.phone,
    address: row.street,
    city: row.city,
    state: row.state,
    zip: row.zip,
  })
  return resolved?.id ?? null
}

/**
 * The county the promoted attorney will be recorded as serving.
 *
 * Routing treats an empty `counties` list as statewide, so a row whose county we
 * cannot resolve becomes eligible for every case in the state. That is too
 * generous for a bulk import, hence `PROMOTE_REQUIRE_COUNTY`.
 */
function resolveRowCounty(row: NonNullable<ProductionRow>): string | null {
  const state = String(row.state ?? '').trim().toUpperCase()
  if (state !== 'CA') return row.county?.trim() || null
  return resolveCaCounty({ county: row.county, city: row.city }).county
}

async function main() {
  const status = process.env.PROMOTE_STATUS ?? 'reviewed'
  const sourceFilter = process.env.PROMOTE_SOURCE
  const limit = parseNumber(process.env.PROMOTE_LIMIT, 100)
  const dryRun = parseBoolean(process.env.PROMOTE_DRY_RUN)
  const requireCounty = parseBoolean(process.env.PROMOTE_REQUIRE_COUNTY)

  const rows = await prisma.productionAttorney.findMany({
    where: {
      status,
      promotedAttorneyId: null,
      ...(sourceFilter ? { source: sourceFilter } : {}),
    },
    take: limit,
    orderBy: { scrapedAt: 'asc' },
  })

  console.log(
    `Promoting ${rows.length} row(s) with status "${status}"` +
      (sourceFilter ? ` from source "${sourceFilter}"` : '') +
      (dryRun ? ' (DRY RUN)' : '') +
      '\n'
  )

  let created = 0
  let linked = 0
  let skipped = 0
  let statewide = 0
  let noSpecialty = 0

  for (const row of rows) {
    if (!row.name?.trim()) {
      console.warn(`  - skip ${row.id}: missing name`)
      skipped += 1
      continue
    }

    // Free-text practice areas have to become incident types or routing will
    // never match this attorney to a case.
    const labels = parsePracticeAreaText(row.practiceAreas)
    const normalized = normalizePracticeAreas(labels)
    const county = resolveRowCounty(row)

    if (normalized.incidentTypes.length === 0) {
      console.warn(
        `  - skip ${row.id} ("${row.name}"): no recognizable practice area from ${
          labels.length > 0 ? JSON.stringify(labels) : 'an empty practice-area field'
        }`
      )
      noSpecialty += 1
      skipped += 1
      continue
    }

    if (!county) {
      if (requireCounty) {
        console.warn(
          `  - skip ${row.id} ("${row.name}"): county unresolved from city "${row.city ?? ''}"`
        )
        skipped += 1
        continue
      }
      statewide += 1
    }

    if (dryRun) {
      console.log(
        `  • would promote "${row.name}"${row.firmName ? ` @ ${row.firmName}` : ''} ` +
          `(${row.city ?? '?'}, ${row.state ?? '?'}) ` +
          `county=${county ?? 'STATEWIDE'} ` +
          `specialties=${normalized.incidentTypes.join('|')}` +
          (normalized.genericOnly ? ' [generic PI]' : '')
      )
      continue
    }

    const result = await prisma.$transaction(async (tx) => {
      const lawFirmId = await resolveLawFirm(tx, row)
      const existing = await resolveExistingAttorney(tx, {
        barNumber: row.barNumber,
        email: row.email,
        phone: row.phone,
        name: row.name,
        lawFirmId,
      })

      const venues = row.state ? [row.state] : []
      const meta = {
        externalSources: {
          [row.source]: {
            profileUrl: row.profileUrl,
            promotedAt: new Date().toISOString(),
            productionAttorneyId: row.id,
            practiceAreaLabels: labels,
            unmatchedPracticeAreas: normalized.unmatchedLabels,
            practiceAreasGenericOnly: normalized.genericOnly,
            countyResolved: Boolean(county),
          },
        },
      }

      let attorneyId: string
      let wasCreated = false

      if (existing) {
        attorneyId = existing.id
      } else {
        const attorney = await tx.attorney.create({
          data: {
            name: row.name,
            email: row.email ?? null,
            phone: row.phone ?? null,
            barNumber: row.barNumber ?? null,
            barState: row.barState ?? null,
            specialties: JSON.stringify(normalized.incidentTypes),
            venues: JSON.stringify(venues),
            meta: JSON.stringify(meta),
            profile: JSON.stringify({ source: row.source, sourcePayload: row.rawPayload }),
            isActive: true,
            isVerified: false,
            averageRating: row.rating ?? 0,
            totalReviews: row.reviewCount ?? 0,
            lawFirmId,
          },
        })
        attorneyId = attorney.id
        wasCreated = true
      }

      // Routing reads jurisdictions from `AttorneyProfile`, not `Attorney`, so
      // promoting without one produced attorneys that could never be matched.
      const jurisdictions = serializeJurisdictions(
        buildJurisdictions({
          state: row.state,
          counties: county ? [county] : [],
          cities: row.city ? [row.city] : [],
        })
      )

      await tx.attorneyProfile.upsert({
        where: { attorneyId },
        create: {
          attorneyId,
          specialties: JSON.stringify(normalized.incidentTypes),
          firmName: row.firmName ?? null,
          firmWebsite: row.website ?? null,
          jurisdictions,
          totalReviews: row.reviewCount ?? 0,
          averageRating: row.rating ?? 0,
        },
        update: {
          // Only fill gaps on an existing profile; a human-maintained profile
          // must not be overwritten by directory data.
          ...(jurisdictions ? { jurisdictions } : {}),
        },
      })

      await tx.productionAttorney.update({
        where: { id: row.id },
        data: {
          status: 'promoted',
          promotedAttorneyId: attorneyId,
          county: county ?? row.county,
        },
      })

      return { attorneyId, wasCreated }
    })

    if (result.wasCreated) {
      created += 1
      console.log(
        `  + created attorney ${result.attorneyId} from "${row.name}" ` +
          `county=${county ?? 'STATEWIDE'} specialties=${normalized.incidentTypes.join('|')}`
      )
    } else {
      linked += 1
      console.log(`  ↳ linked "${row.name}" to existing attorney ${result.attorneyId}`)
    }
  }

  console.log(
    `\nDone.${dryRun ? ' (dry run)' : ''} created=${created} linked=${linked} skipped=${skipped}`
  )
  if (noSpecialty > 0) {
    console.log(`  ${noSpecialty} row(s) skipped for unmappable practice areas.`)
  }
  if (statewide > 0) {
    console.log(
      `  ${statewide} row(s) promoted without a county, so they read as statewide. ` +
        'Re-run with PROMOTE_REQUIRE_COUNTY=true to hold these back instead.'
    )
  }
  console.log('  Promoted attorneys are isVerified=false and will not receive leads until vetted.')

  await prisma.$disconnect().catch(() => undefined)
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect().catch(() => undefined)
  process.exit(1)
})
