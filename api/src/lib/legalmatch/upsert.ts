import { PrismaClient } from '@prisma/client'
import { getImportSource, upsertImportSource } from './provenance'
import type { LegalMatchLocation, LegalMatchProfile } from './types'
import { mergeJsonArray, parseJsonText, uniqueStrings } from './utils'
import { resolveExistingAttorney, resolveOrCreateLawFirm } from '../attorney-resolve'
import { resolveCaCounty } from '../ca-counties'
import { normalizePracticeAreas } from '../practice-area-normalize'
import {
  buildJurisdictions,
  mergeSerializedJurisdictions,
  serializeJurisdictions,
  type Jurisdiction,
} from '../jurisdictions'

type UpsertResult = {
  attorneyId: string
  status: 'created' | 'updated'
}

const SOURCE_NAME = 'legalmatch'

/**
 * Build the routing-visible jurisdictions for a profile.
 *
 * Routing matches on `counties`, so the cities LegalMatch gives us are resolved
 * to counties here. Cities are kept alongside for display. Note that an
 * unresolved city contributes no county: with no counties at all the attorney
 * reads as statewide, which is the pre-existing lenient behavior, so this
 * widens nothing that was previously narrow.
 */
function buildProfileJurisdictions(profile: LegalMatchProfile): Jurisdiction[] | null {
  const cities = uniqueStrings([
    profile.city,
    ...profile.locations.map((location) => location.city ?? null),
  ])

  const isCalifornia = String(profile.state ?? '').trim().toUpperCase() === 'CA'
  const counties = isCalifornia
    ? uniqueStrings(cities.map((city) => resolveCaCounty({ city }).county))
    : []

  return buildJurisdictions({ state: profile.state, counties, cities })
}

export async function upsertLegalMatchAttorney(
  prisma: PrismaClient,
  profile: LegalMatchProfile,
  importRunId: string
): Promise<UpsertResult> {
  const existingImportSource = await getImportSource(prisma, profile.sourceUrlHash)

  const lawFirmId = await resolveLawFirm(prisma, profile)
  const existingAttorney = await resolveAttorney(prisma, existingImportSource?.attorneyId ?? null, profile, lawFirmId)
  const sameSourceAttorney = Boolean(existingImportSource?.attorneyId && existingAttorney)

  // `Attorney.specialties` is the routing gate and only understands incident
  // types; LegalMatch gives prose. The original labels are kept on
  // `AttorneyProfile.specialties` for display.
  const normalized = normalizePracticeAreas(profile.specialties)
  const routingSpecialties = normalized.incidentTypes

  const attorneyMetaPatch = {
    externalSources: {
      legalmatch: {
        sourceUrl: profile.sourceUrl,
        importedAt: new Date().toISOString(),
        parseWarnings: profile.parseWarnings,
        practiceAreaLabels: profile.specialties,
        unmatchedPracticeAreas: normalized.unmatchedLabels,
        practiceAreasGenericOnly: normalized.genericOnly,
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
        specialties: JSON.stringify(routingSpecialties),
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
        specialties: mergeJsonArray(existingAttorney.specialties, routingSpecialties),
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
  const jurisdictions = serializeJurisdictions(buildProfileJurisdictions(profile))

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
  const resolved = await resolveOrCreateLawFirm(prisma, {
    name: profile.firmName,
    website: profile.website,
    email: profile.email,
    phone: profile.phone,
    address: profile.locations[0]?.address ?? null,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
  })
  return resolved?.id ?? null
}

async function resolveAttorney(
  prisma: PrismaClient,
  attorneyId: string | null,
  profile: LegalMatchProfile,
  lawFirmId: string | null
) {
  const match = await resolveExistingAttorney(prisma, {
    knownAttorneyId: attorneyId,
    email: profile.email,
    phone: profile.phone,
    name: profile.fullName,
    lawFirmId,
  })
  if (!match) return null
  return prisma.attorney.findUnique({ where: { id: match.id } })
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
  // Re-importing the same source replaces its own prior answer; a different
  // source only ever widens coverage.
  if (overwrite) return incoming
  return mergeSerializedJurisdictions(existing, parseJsonText<Jurisdiction[]>(incoming) ?? [])
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

