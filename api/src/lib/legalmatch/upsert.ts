import { PrismaClient } from '@prisma/client'
import { getImportSource, upsertImportSource } from './provenance'
import type { LegalMatchLocation, LegalMatchProfile } from './types'
import { mergeJsonArray, parseJsonText, slugify, uniqueStrings } from './utils'

type UpsertResult = {
  attorneyId: string
  status: 'created' | 'updated'
}

const SOURCE_NAME = 'legalmatch'
type Jurisdiction = { state?: string | null; cities?: string[] | null }

export async function upsertLegalMatchAttorney(
  prisma: PrismaClient,
  profile: LegalMatchProfile,
  importRunId: string
): Promise<UpsertResult> {
  const existingImportSource = await getImportSource(prisma, profile.sourceUrlHash)

  const lawFirmId = await resolveLawFirm(prisma, profile)
  const existingAttorney = await resolveAttorney(prisma, existingImportSource?.attorneyId ?? null, profile, lawFirmId)
  const sameSourceAttorney = Boolean(existingImportSource?.attorneyId && existingAttorney)

  const attorneyMetaPatch = {
    externalSources: {
      legalmatch: {
        sourceUrl: profile.sourceUrl,
        importedAt: new Date().toISOString(),
        parseWarnings: profile.parseWarnings,
      },
    },
  }

  let attorneyId = existingAttorney?.id
  let status: UpsertResult['status'] = 'updated'

  if (!existingAttorney) {
    const created = await prisma.attorney.create({
      data: {
        name: profile.fullName,
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        specialties: JSON.stringify(profile.specialties),
        venues: JSON.stringify(uniqueStrings([profile.state])),
        meta: JSON.stringify(attorneyMetaPatch),
        profile: JSON.stringify({ source: SOURCE_NAME, sourcePayload: profile.sourcePayload }),
        isActive: true,
        isVerified: false,
        averageRating: profile.averageRating ?? 0,
        totalReviews: profile.totalReviews ?? 0,
        lawFirmId,
      },
    })
    attorneyId = created.id
    status = 'created'
  } else {
    await prisma.attorney.update({
      where: { id: existingAttorney.id },
      data: {
        email: pickString(existingAttorney.email, profile.email, sameSourceAttorney),
        phone: pickString(existingAttorney.phone, profile.phone, sameSourceAttorney),
        specialties: mergeJsonArray(existingAttorney.specialties, profile.specialties),
        venues: mergeJsonArray(existingAttorney.venues, uniqueStrings([profile.state])),
        averageRating: pickNumber(existingAttorney.averageRating, profile.averageRating, sameSourceAttorney) ?? existingAttorney.averageRating,
        totalReviews: pickInteger(existingAttorney.totalReviews, profile.totalReviews, sameSourceAttorney) ?? existingAttorney.totalReviews,
        lawFirmId: pickString(existingAttorney.lawFirmId, lawFirmId, sameSourceAttorney),
        meta: mergeJsonObject(existingAttorney.meta, attorneyMetaPatch),
        profile: mergeJsonObject(existingAttorney.profile, { sourcePayload: profile.sourcePayload }),
      },
    })
    attorneyId = existingAttorney.id
  }

  const existingProfile = await prisma.attorneyProfile.findUnique({
    where: { attorneyId },
  })

  const firmLocations = profile.locations.length > 0 ? JSON.stringify(profile.locations) : null
  const jurisdictions = profile.state
    ? JSON.stringify([{ state: profile.state, cities: uniqueStrings([profile.city]) }])
    : null

  if (!existingProfile) {
    await prisma.attorneyProfile.create({
      data: {
        attorneyId,
        bio: profile.bio ?? null,
        photoUrl: profile.photoUrl ?? null,
        specialties: JSON.stringify(profile.specialties),
        languages: JSON.stringify(profile.languages),
        yearsExperience: profile.yearsExperience ?? 0,
        totalReviews: profile.totalReviews ?? 0,
        averageRating: profile.averageRating ?? 0,
        firmName: profile.firmName ?? null,
        firmWebsite: profile.website ?? null,
        firmLocations,
        jurisdictions,
      },
    })
  } else {
    await prisma.attorneyProfile.update({
      where: { attorneyId },
      data: {
        bio: pickString(existingProfile.bio, profile.bio, sameSourceAttorney),
        photoUrl: pickString(existingProfile.photoUrl, profile.photoUrl, sameSourceAttorney),
        specialties: mergeJsonArray(existingProfile.specialties, profile.specialties),
        languages: mergeJsonArray(existingProfile.languages, profile.languages),
        yearsExperience: pickInteger(existingProfile.yearsExperience, profile.yearsExperience, sameSourceAttorney) ?? existingProfile.yearsExperience,
        totalReviews: pickInteger(existingProfile.totalReviews, profile.totalReviews, sameSourceAttorney) ?? existingProfile.totalReviews,
        averageRating: pickNumber(existingProfile.averageRating, profile.averageRating, sameSourceAttorney) ?? existingProfile.averageRating,
        firmName: pickString(existingProfile.firmName, profile.firmName, sameSourceAttorney),
        firmWebsite: pickString(existingProfile.firmWebsite, profile.website, sameSourceAttorney),
        firmLocations: resolveFirmLocations(existingProfile.firmLocations, profile.locations, sameSourceAttorney),
        jurisdictions: resolveJurisdictions(existingProfile.jurisdictions, jurisdictions, sameSourceAttorney),
      },
    })
  }

  await upsertImportSource(prisma, {
    attorneyId,
    importRunId,
    profile,
  })

  return { attorneyId, status }
}

async function resolveLawFirm(prisma: PrismaClient, profile: LegalMatchProfile) {
  if (!profile.firmName) return null

  const existing = await prisma.lawFirm.findFirst({
    where: { name: profile.firmName },
  })

  if (existing) {
    return existing.id
  }

  const slugBase = slugify([profile.firmName, profile.city, profile.state].filter(Boolean).join('-')) || 'law-firm'
  const slug = await ensureUniqueSlug(prisma, slugBase)

  const created = await prisma.lawFirm.create({
    data: {
      name: profile.firmName,
      slug,
      primaryEmail: profile.email ?? null,
      phone: profile.phone ?? null,
      website: profile.website ?? null,
      address: profile.locations[0]?.address ?? null,
      city: profile.city ?? null,
      state: profile.state ?? null,
      zip: profile.zip ?? null,
    },
  })

  return created.id
}

async function ensureUniqueSlug(prisma: PrismaClient, baseSlug: string) {
  let candidate = baseSlug
  let counter = 2

  while (await prisma.lawFirm.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${counter}`
    counter += 1
  }

  return candidate
}

async function resolveAttorney(
  prisma: PrismaClient,
  attorneyId: string | null,
  profile: LegalMatchProfile,
  lawFirmId: string | null
) {
  if (attorneyId) {
    const byId = await prisma.attorney.findUnique({ where: { id: attorneyId } })
    if (byId) return byId
  }

  if (profile.email) {
    const byEmail = await prisma.attorney.findUnique({ where: { email: profile.email } })
    if (byEmail) return byEmail
  }

  if (profile.phone) {
    const byPhone = await prisma.attorney.findFirst({ where: { phone: profile.phone } })
    if (byPhone) return byPhone
  }

  return prisma.attorney.findFirst({
    where: {
      name: profile.fullName,
      lawFirmId: lawFirmId ?? undefined,
    },
  })
}

function pickString(existing: string | null, incoming: string | null | undefined, overwrite: boolean) {
  if (!incoming) return existing
  if (overwrite || !existing) return incoming
  return existing
}

function pickNumber(existing: number | null, incoming: number | null | undefined, overwrite: boolean) {
  if (incoming === null || incoming === undefined) return existing
  if (overwrite || existing === null || existing === 0) return incoming
  return existing
}

function pickInteger(existing: number | null, incoming: number | null | undefined, overwrite: boolean) {
  const value = pickNumber(existing, incoming, overwrite)
  return value === null || value === undefined ? value : Math.round(value)
}

function mergeJsonObject(existing: string | null, patch: Record<string, unknown>) {
  const base = parseJsonText<Record<string, unknown>>(existing) ?? {}
  return JSON.stringify(deepMerge(base, patch))
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>)
      continue
    }
    result[key] = value
  }
  return result
}

function mergeJsonLocations(existing: string | null, incoming: LegalMatchProfile['locations']) {
  const parsed = parseJsonText<LegalMatchProfile['locations']>(existing) ?? []
  return JSON.stringify(dedupeLocations([...parsed, ...incoming]))
}

function mergeJsonJurisdictions(existing: string | null, incoming: string) {
  const parsed = parseJsonText<Jurisdiction[]>(existing) ?? []
  const next = parseJsonText<Jurisdiction[]>(incoming) ?? []
  return JSON.stringify(mergeJurisdictionArrays(parsed, next))
}

function resolveFirmLocations(
  existing: string | null,
  incoming: LegalMatchProfile['locations'],
  overwrite: boolean
) {
  if (incoming.length === 0) return existing
  if (overwrite) return JSON.stringify(dedupeLocations(incoming))
  return mergeJsonLocations(existing, incoming)
}

function resolveJurisdictions(existing: string | null, incoming: string | null, overwrite: boolean) {
  if (!incoming) return existing
  if (overwrite) {
    const parsed = parseJsonText<Jurisdiction[]>(incoming) ?? []
    return JSON.stringify(mergeJurisdictionArrays([], parsed))
  }
  return mergeJsonJurisdictions(existing, incoming)
}

function dedupeLocations(locations: LegalMatchLocation[]) {
  const seen = new Map<string, LegalMatchLocation>()
  for (const location of locations) {
    const key = [
      location.address ?? '',
      location.city ?? '',
      location.state ?? '',
      location.zip ?? '',
      location.phone ?? '',
    ]
      .map((value) => value.trim().toLowerCase())
      .join('|')

    if (!seen.has(key)) {
      seen.set(key, location)
    }
  }
  return Array.from(seen.values())
}

function mergeJurisdictionArrays(existing: Jurisdiction[], incoming: Jurisdiction[]) {
  const merged = new Map<string, Set<string>>()

  for (const jurisdiction of [...existing, ...incoming]) {
    const state = jurisdiction.state?.trim().toUpperCase()
    if (!state) continue

    const cities = merged.get(state) ?? new Set<string>()
    for (const city of jurisdiction.cities ?? []) {
      const normalizedCity = city?.trim()
      if (normalizedCity) cities.add(normalizedCity)
    }
    merged.set(state, cities)
  }

  return Array.from(merged.entries(), ([state, cities]) => ({
    state,
    cities: Array.from(cities),
  }))
}
