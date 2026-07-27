/**
 * Entity resolution for attorney and law-firm imports.
 *
 * Every importer needs to answer the same two questions: "have I already got
 * this person?" and "have I already got this firm?". They each answered it
 * differently, so the same attorney could be created twice by two sources.
 * This module is the one answer.
 *
 * Match order for a person is strongest key first:
 *   1. bar number  — issued once per person, never reused
 *   2. email       — unique in our schema, though many attorneys have none
 *   3. phone + name — phone alone is unsafe (shared office lines merge
 *                     unrelated attorneys), so it must agree with the name
 *   4. name + firm — last resort, and the reason bar number matters
 *
 * For a firm: domain, then normalized name scoped to a state.
 */

import type { PrismaClient } from '@prisma/client'
import {
  extractFirmDomain,
  normalizeBarNumber,
  normalizeFirmName,
  normalizePersonName,
} from './attorney-identity'

type PrismaLike = Pick<PrismaClient, 'attorney' | 'lawFirm'>

export type FirmResolutionInput = {
  name?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

export type FirmResolution = {
  id: string
  created: boolean
  /** Which key produced the match, for import reporting. */
  via: 'domain' | 'nameKey' | 'created'
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function ensureUniqueSlug(prisma: PrismaLike, baseSlug: string): Promise<string> {
  const base = baseSlug || 'law-firm'
  let candidate = base
  let counter = 2
  while (await prisma.lawFirm.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  return candidate
}

/**
 * Find an existing firm or create one.
 *
 * Returns `null` when there is no firm name — a nameless firm row is worse than
 * leaving the attorney unaffiliated, because it can never be matched again.
 */
export async function resolveOrCreateLawFirm(
  prisma: PrismaLike,
  input: FirmResolutionInput
): Promise<FirmResolution | null> {
  const name = String(input.name ?? '').trim()
  if (!name) return null

  const firmDomain = extractFirmDomain(input.website) ?? extractFirmDomain(input.email)
  const nameKey = normalizeFirmName(name) || null
  const state = String(input.state ?? '').trim().toUpperCase() || null

  if (firmDomain) {
    const byDomain = await prisma.lawFirm.findUnique({ where: { firmDomain } })
    if (byDomain) {
      // Backfill the name key on a row created before it existed.
      if (nameKey && !byDomain.nameKey) {
        await prisma.lawFirm.update({ where: { id: byDomain.id }, data: { nameKey } })
      }
      return { id: byDomain.id, created: false, via: 'domain' }
    }
  }

  if (nameKey) {
    const byNameKey = await prisma.lawFirm.findFirst({
      where: { nameKey, ...(state ? { state } : {}) },
    })
    if (byNameKey) {
      if (firmDomain && !byNameKey.firmDomain) {
        // Claim the domain for this row, tolerating a race with a concurrent
        // importer that just took it.
        await prisma.lawFirm
          .update({ where: { id: byNameKey.id }, data: { firmDomain } })
          .catch(() => undefined)
      }
      return { id: byNameKey.id, created: false, via: 'nameKey' }
    }
  }

  // Fall back to an exact-name lookup so rows predating `nameKey` are reused
  // rather than duplicated on the first import after this change.
  const byExactName = await prisma.lawFirm.findFirst({ where: { name } })
  if (byExactName) {
    await prisma.lawFirm
      .update({
        where: { id: byExactName.id },
        data: {
          ...(nameKey && !byExactName.nameKey ? { nameKey } : {}),
          ...(firmDomain && !byExactName.firmDomain ? { firmDomain } : {}),
        },
      })
      .catch(() => undefined)
    return { id: byExactName.id, created: false, via: 'nameKey' }
  }

  const slug = await ensureUniqueSlug(
    prisma,
    slugify([name, input.city, input.state].filter(Boolean).join('-'))
  )

  const created = await prisma.lawFirm.create({
    data: {
      name,
      slug,
      nameKey,
      firmDomain,
      primaryEmail: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zip: input.zip ?? null,
    },
  })

  return { id: created.id, created: true, via: 'created' }
}

export type AttorneyResolutionInput = {
  barNumber?: string | null
  email?: string | null
  phone?: string | null
  name?: string | null
  lawFirmId?: string | null
  /** An id already known from import provenance; checked before anything else. */
  knownAttorneyId?: string | null
}

export type AttorneyMatch = {
  id: string
  via: 'knownId' | 'barNumber' | 'email' | 'phoneAndName' | 'nameAndFirm'
}

/**
 * Find the attorney an inbound record refers to, or `null` for a new person.
 */
export async function resolveExistingAttorney(
  prisma: PrismaLike,
  input: AttorneyResolutionInput
): Promise<AttorneyMatch | null> {
  if (input.knownAttorneyId) {
    const byId = await prisma.attorney.findUnique({ where: { id: input.knownAttorneyId } })
    if (byId) return { id: byId.id, via: 'knownId' }
  }

  const barNumber = normalizeBarNumber(input.barNumber)
  if (barNumber) {
    const byBar = await prisma.attorney.findUnique({ where: { barNumber } })
    if (byBar) return { id: byBar.id, via: 'barNumber' }
  }

  const email = String(input.email ?? '').trim()
  if (email) {
    const byEmail = await prisma.attorney.findUnique({ where: { email } })
    if (byEmail) return { id: byEmail.id, via: 'email' }
  }

  const nameKey = normalizePersonName(input.name)
  const phone = String(input.phone ?? '').trim()

  // Phone must agree with the name: a firm's main line is shared by everyone in
  // the office, so matching on it alone merges distinct attorneys.
  if (phone && nameKey) {
    const byPhone = await prisma.attorney.findMany({ where: { phone }, take: 25 })
    const match = byPhone.find((candidate) => normalizePersonName(candidate.name) === nameKey)
    if (match) return { id: match.id, via: 'phoneAndName' }
  }

  if (nameKey && input.lawFirmId) {
    const atFirm = await prisma.attorney.findMany({
      where: { lawFirmId: input.lawFirmId },
      take: 500,
    })
    const match = atFirm.find((candidate) => normalizePersonName(candidate.name) === nameKey)
    if (match) return { id: match.id, via: 'nameAndFirm' }
  }

  return null
}
