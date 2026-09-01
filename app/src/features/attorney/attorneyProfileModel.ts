/**
 * One shape for the attorney profile.
 *
 * The two profile screens used to keep it two ways: `/attorney-profile` parsed
 * the JSON columns into arrays, while the settings screen left them as JSON
 * strings and parsed on save. Both wrote to `PUT /v1/attorney-profile/profile`,
 * so whichever saved last won, and a field one screen didn't know about was at
 * the mercy of how the other serialized it.
 *
 * Everything is an array or a scalar here. Strings exist only inside
 * `normalizeAttorneyProfile` (reading the API) and `toProfileUpdatePayload`
 * (writing back to it).
 */

export type Jurisdiction = { state: string; counties: string[]; cities: string[] }

export type FirmLocation = {
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
}

/** `dayOfWeek` matches `Date#getDay` (0 = Sunday), which is what routing compares. */
export type IntakeWindow = { dayOfWeek: number; startTime: number; endTime: number }

/** `'24/7'` means no restriction. An empty array means no open window at all. */
export type IntakeHours = '24/7' | IntakeWindow[]

export type AttorneyProfileModel = {
  id: string
  bio: string
  photoUrl: string | null
  specialties: string[]
  languages: string[]
  /** Fluency keyed by language name. A language absent here shows no badge. */
  languageProficiency: Record<string, string>
  jurisdictions: Jurisdiction[]
  firmName: string | null
  firmLocations: FirmLocation[]
  intakeHours: IntakeHours
  minInjurySeverity: number | null
  excludedCaseTypes: string[]
  minDamagesRange: number | null
  maxDamagesRange: number | null
  maxCasesPerWeek: number | null
  maxCasesPerMonth: number | null
  pricingModel: string | null
  paymentModel: string | null
  subscriptionTier: string | null
  responseTimeHours: number
  /** Set by license verification, so shown read-only. */
  licenseState: string | null
  licenseVerified: boolean
  /**
   * Whether the signup email has been confirmed. Distinct from licenseVerified
   * and from the attorney's vetting status — this only reflects the account.
   */
  emailVerified: boolean
  yearsExperience: number
  yearsPiExperience: number
  totalCases: number
  totalSettlements: number
  averageSettlement: number
  successRate: number
  verifiedVerdicts: any[]
  isFeatured: boolean
  boostLevel: number
  totalReviews: number
  averageRating: number
  /** Present when the attorney belongs to a firm, which makes firm fields read-only. */
  lawFirmId: string | null
  attorney?: {
    name?: string | null
    email?: string | null
    phone?: string | null
    isVerified?: boolean
    [key: string]: unknown
  }
}

function parseArray(value: unknown): any[] {
  // The API returns these columns already parsed in some responses and as JSON
  // strings in others. Returning [] for the parsed case silently dropped real
  // data ("No languages specified" with languages on file).
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseRecord(value: unknown): Record<string, string> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, string>
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function parseStrings(value: unknown): string[] {
  return parseArray(value)
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseJurisdictions(value: unknown): Jurisdiction[] {
  return parseArray(value)
    .filter((entry) => entry && typeof entry === 'object' && entry.state)
    .map((entry) => ({
      state: String(entry.state),
      counties: parseStrings(entry.counties),
      cities: parseStrings(entry.cities),
    }))
}

function parseIntakeHours(value: unknown): IntakeHours {
  // Never set and "24/7" both mean unrestricted. Only an explicit window list
  // narrows it, and an empty list is meaningfully different from unrestricted:
  // routing reads it as a schedule with no open window.
  if (!value || value === '24/7') return '24/7'
  const windows = parseArray(value)
    .filter((w) => w && typeof w === 'object' && Number.isFinite(Number(w.dayOfWeek)))
    .map((w) => ({
      dayOfWeek: Number(w.dayOfWeek),
      startTime: Number(w.startTime ?? 9),
      endTime: Number(w.endTime ?? 17),
    }))
  return windows
}

export function normalizeAttorneyProfile(raw: any): AttorneyProfileModel {
  // The profile record has its own `specialties` column defaulting to "[]", while
  // the values chosen at registration live on `attorney.specialties`. A plain `??`
  // never fell back because "[]" is defined, so registered service types were
  // masked by the default (#68).
  const profileSpecialties = parseStrings(raw?.specialties)
  const specialties = profileSpecialties.length ? profileSpecialties : parseStrings(raw?.attorney?.specialties)
  const languages = parseStrings(raw?.languages)
  const totalCases = Number(raw?.totalCases || 0)
  const totalSettlements = Number(raw?.totalSettlements || 0)

  return {
    id: raw?.id || raw?.attorneyId || 'profile',
    bio: raw?.bio || raw?.attorney?.profile || '',
    photoUrl: raw?.photoUrl || null,
    specialties: specialties.length ? specialties : ['Personal Injury'],
    languages: languages.length ? languages : ['English'],
    languageProficiency: parseRecord(raw?.languageProficiency),
    jurisdictions: parseJurisdictions(raw?.jurisdictions),
    firmName: raw?.firmName || null,
    firmLocations: parseArray(raw?.firmLocations).filter((l) => l && typeof l === 'object'),
    intakeHours: parseIntakeHours(raw?.intakeHours),
    minInjurySeverity: parseNullableNumber(raw?.minInjurySeverity),
    excludedCaseTypes: parseStrings(raw?.excludedCaseTypes),
    minDamagesRange: parseNullableNumber(raw?.minDamagesRange),
    maxDamagesRange: parseNullableNumber(raw?.maxDamagesRange),
    maxCasesPerWeek: parseNullableNumber(raw?.maxCasesPerWeek),
    maxCasesPerMonth: parseNullableNumber(raw?.maxCasesPerMonth),
    pricingModel: raw?.pricingModel || null,
    paymentModel: raw?.paymentModel || null,
    subscriptionTier: raw?.subscriptionTier || null,
    responseTimeHours: Number(raw?.responseTimeHours ?? raw?.attorney?.responseTimeHours ?? 24),
    licenseState: raw?.licenseState || raw?.attorney?.barState || null,
    licenseVerified: Boolean(raw?.licenseVerified),
    emailVerified: Boolean(raw?.emailVerified),
    yearsExperience: Number(raw?.yearsExperience || 0),
    yearsPiExperience: Number(raw?.yearsPiExperience || 0),
    totalCases,
    totalSettlements,
    averageSettlement: Number(raw?.averageSettlement || (totalCases > 0 ? totalSettlements / totalCases : 0)),
    successRate: Number(raw?.successRate || 0),
    verifiedVerdicts: parseArray(raw?.verifiedVerdicts),
    isFeatured: Boolean(raw?.isFeatured),
    boostLevel: Number(raw?.boostLevel || 0),
    totalReviews: Number(raw?.totalReviews || raw?.attorney?.totalReviews || 0),
    averageRating: Number(raw?.averageRating || raw?.attorney?.averageRating || 0),
    lawFirmId: raw?.lawFirmId || raw?.lawFirm?.id || raw?.attorney?.lawFirmId || raw?.attorney?.lawFirm?.id || null,
    attorney: raw?.attorney,
  }
}

/**
 * The whole profile, every time.
 *
 * `PUT /profile` treats an absent field as "leave unchanged", which sounds safe
 * and is not: sending a partial body leaves the omitted arrays holding whatever
 * the *other* screen last wrote while this screen reports success and shows its
 * own stale copy. Sending everything is what makes a save mean what it says.
 */
export function toProfileUpdatePayload(model: AttorneyProfileModel): Record<string, unknown> {
  return {
    name: model.attorney?.name || undefined,
    bio: model.bio || null,
    photoUrl: model.photoUrl,
    // Raw arrays: the API stringifies these itself, and a pre-stringified value
    // double-encodes, so on reload it parses back to a string and the list resets.
    specialties: model.specialties,
    languages: model.languages.map((l) => l.trim()).filter(Boolean),
    languageProficiency: model.languageProficiency,
    jurisdictions: model.jurisdictions,
    firmName: model.firmName,
    firmLocations: model.firmLocations,
    intakeHours: model.intakeHours,
    minInjurySeverity: model.minInjurySeverity,
    excludedCaseTypes: model.excludedCaseTypes,
    minDamagesRange: model.minDamagesRange,
    maxDamagesRange: model.maxDamagesRange,
    maxCasesPerWeek: model.maxCasesPerWeek,
    maxCasesPerMonth: model.maxCasesPerMonth,
    pricingModel: model.pricingModel,
    paymentModel: model.paymentModel,
    subscriptionTier: model.subscriptionTier,
    responseTimeHours: Number(model.responseTimeHours) || 24,
    yearsExperience: model.yearsExperience,
    yearsPiExperience: model.yearsPiExperience,
    totalCases: model.totalCases,
    totalSettlements: model.totalSettlements,
    averageSettlement: model.averageSettlement,
    successRate: model.successRate,
  }
}
