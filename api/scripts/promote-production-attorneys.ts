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
 *   PROMOTE_DEFAULT_SPECIALTY  Specialty when none parsed (default "Personal Injury").
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'

function parseBoolean(value: string | undefined): boolean {
  return value === 'true'
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parsePracticeAreas(raw: string | null, fallback: string): string[] {
  if (!raw) return [fallback]
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const cleaned = parsed.map((v) => String(v).trim()).filter(Boolean)
      if (cleaned.length > 0) return cleaned
    }
  } catch {
    // Not JSON; treat as a comma-separated string.
    const cleaned = raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    if (cleaned.length > 0) return cleaned
  }
  return [fallback]
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const base = baseSlug || 'law-firm'
  let candidate = base
  let counter = 2
  while (await prisma.lawFirm.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  return candidate
}

type ProductionRow = Awaited<ReturnType<typeof prisma.productionAttorney.findFirst>>

async function resolveLawFirm(row: NonNullable<ProductionRow>): Promise<string | null> {
  const firmName = row.firmName?.trim() || row.name?.trim()
  if (!firmName) return null

  const existing = await prisma.lawFirm.findFirst({ where: { name: firmName } })
  if (existing) return existing.id

  const slug = await ensureUniqueSlug(
    slugify([firmName, row.city, row.state].filter(Boolean).join('-'))
  )

  const created = await prisma.lawFirm.create({
    data: {
      name: firmName,
      slug,
      phone: row.phone ?? null,
      website: row.website ?? null,
      address: row.street ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      zip: row.zip ?? null,
    },
  })
  return created.id
}

async function resolveExistingAttorney(row: NonNullable<ProductionRow>, lawFirmId: string | null) {
  if (row.email) {
    const byEmail = await prisma.attorney.findUnique({ where: { email: row.email } })
    if (byEmail) return byEmail
  }
  if (row.phone) {
    const byPhone = await prisma.attorney.findFirst({ where: { phone: row.phone } })
    if (byPhone) return byPhone
  }
  return prisma.attorney.findFirst({
    where: { name: row.name, lawFirmId: lawFirmId ?? undefined },
  })
}

async function main() {
  const status = process.env.PROMOTE_STATUS ?? 'reviewed'
  const sourceFilter = process.env.PROMOTE_SOURCE
  const limit = parseNumber(process.env.PROMOTE_LIMIT, 100)
  const dryRun = parseBoolean(process.env.PROMOTE_DRY_RUN)
  const defaultSpecialty = process.env.PROMOTE_DEFAULT_SPECIALTY ?? 'Personal Injury'

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

  for (const row of rows) {
    if (!row.name?.trim()) {
      console.warn(`  - skip ${row.id}: missing name`)
      skipped += 1
      continue
    }

    if (dryRun) {
      console.log(`  • would promote "${row.name}"${row.firmName ? ` @ ${row.firmName}` : ''} (${row.city ?? '?'}, ${row.state ?? '?'})`)
      continue
    }

    const result = await prisma.$transaction(async () => {
      const lawFirmId = await resolveLawFirm(row)
      const existing = await resolveExistingAttorney(row, lawFirmId)

      const specialties = parsePracticeAreas(row.practiceAreas, defaultSpecialty)
      const venues = row.state ? [row.state] : []
      const meta = {
        externalSources: {
          [row.source]: {
            profileUrl: row.profileUrl,
            promotedAt: new Date().toISOString(),
            productionAttorneyId: row.id,
          },
        },
      }

      let attorneyId: string
      let wasCreated = false

      if (existing) {
        attorneyId = existing.id
      } else {
        const attorney = await prisma.attorney.create({
          data: {
            name: row.name,
            email: row.email ?? null,
            phone: row.phone ?? null,
            specialties: JSON.stringify(specialties),
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

      await prisma.productionAttorney.update({
        where: { id: row.id },
        data: { status: 'promoted', promotedAttorneyId: attorneyId },
      })

      return { attorneyId, wasCreated }
    })

    if (result.wasCreated) {
      created += 1
      console.log(`  + created attorney ${result.attorneyId} from "${row.name}"`)
    } else {
      linked += 1
      console.log(`  ↳ linked "${row.name}" to existing attorney ${result.attorneyId}`)
    }
  }

  console.log(
    `\nDone.${dryRun ? ' (dry run)' : ''} created=${created} linked=${linked} skipped=${skipped}`
  )

  await prisma.$disconnect().catch(() => undefined)
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect().catch(() => undefined)
  process.exit(1)
})
