/**
 * Normalize free-text practice-area labels into the incident-type vocabulary
 * that routing actually understands.
 *
 * Imported and scraped sources describe practice areas in their own words —
 * "Auto Accidents", "Premises Liability", "Medical Negligence", or just
 * "Personal Injury". `coversClaimType()` in `case-type-match.ts` only accepts
 * the nine incident-type slugs (or a claim type directly), so anything else
 * silently matches no case. That is why attorneys promoted with the literal
 * string "Personal Injury" were created but never routed to.
 *
 * Order matters in `PATTERNS`: the first matching entry wins for a given label,
 * so specific sub-types are listed before broader catch-alls.
 */

/** The incident types accepted by `case-type-match.ts`. */
export const INCIDENT_TYPES = [
  'vehicle',
  'slip_fall',
  'workplace',
  'medmal',
  'dog_bite',
  'product',
  'assault',
  'toxic',
  'other',
] as const

export type IncidentType = (typeof INCIDENT_TYPES)[number]

const INCIDENT_TYPE_SET = new Set<string>(INCIDENT_TYPES)

/**
 * What a bare "Personal Injury" label is taken to mean.
 *
 * Motor vehicle, premises and dog bite are the bread and butter of essentially
 * every plaintiff PI practice. Medical malpractice and product liability are
 * deliberately excluded: they are specialist practices that general PI firms
 * routinely refer out, so claiming them without evidence would route the most
 * complex cases to firms that do not want them. A firm that does handle them
 * will say so explicitly, and that path is matched by `PATTERNS` below.
 */
export const GENERIC_PI_INCIDENT_TYPES: IncidentType[] = [
  'vehicle',
  'slip_fall',
  'dog_bite',
]

type Pattern = {
  incident: IncidentType
  /** Matched against the normalized label. */
  test: RegExp
}

/**
 * Build a matcher from phrase alternatives, tolerating a plural on the phrase —
 * sources write both "Dog Bite" and "Dog Bites". The trailing `s?` is harmless
 * for phrases that already end in "s" ("premises", "products liability").
 */
function phrases(...alternatives: string[]): RegExp {
  return new RegExp(`\\b(?:${alternatives.join('|')})e?s?\\b`)
}

const PATTERNS: Pattern[] = [
  // Motor vehicle, including the specific vehicle types.
  {
    incident: 'vehicle',
    test: phrases(
      'auto',
      'car',
      'vehicle',
      'motor vehicle',
      'motorcycle',
      'truck',
      'trucking',
      'bicycle',
      'bike',
      'pedestrian',
      'rideshare',
      'uber',
      'lyft',
      'dui',
      'hit and run',
      'collision',
      'crash'
    ),
  },
  // Medical negligence. Ahead of "product" so "medical device" reads as medmal
  // only when paired with malpractice language, not on its own.
  {
    incident: 'medmal',
    test: phrases(
      'medical malpractice',
      'medical negligence',
      'med mal',
      'medmal',
      'birth injury',
      'birth trauma',
      'surgical error',
      'misdiagnosis',
      'hospital negligence',
      'nursing malpractice',
      'dental malpractice',
      'professional negligence'
    ),
  },
  {
    incident: 'dog_bite',
    test: phrases('dog bite', 'dog attack', 'animal attack', 'animal bite'),
  },
  {
    incident: 'product',
    test: phrases(
      'product liability',
      'products liability',
      'defective product',
      'dangerous product',
      'product defect',
      'pharmaceutical',
      'drug injury',
      'medical device',
      'recall'
    ),
  },
  {
    incident: 'toxic',
    test: phrases(
      'toxic',
      'asbestos',
      'mesothelioma',
      'environmental',
      'chemical exposure',
      'lead exposure',
      'mold',
      'contamination',
      'roundup',
      'talc'
    ),
  },
  {
    incident: 'workplace',
    test: phrases(
      'workers comp',
      'workers compensation',
      'workmans comp',
      'workplace injury',
      'industrial injury',
      'industrial accident',
      'construction accident',
      'on the job injury',
      'occupational'
    ),
  },
  {
    incident: 'assault',
    test: phrases(
      'assault',
      'battery',
      'sexual abuse',
      'sexual assault',
      'sexual harassment',
      'negligent security',
      'police misconduct',
      'civil rights',
      'excessive force',
      'child abuse'
    ),
  },
  {
    incident: 'slip_fall',
    test: phrases(
      'slip and fall',
      'slip fall',
      'trip and fall',
      'premises liability',
      'premises',
      'dangerous condition',
      'negligent maintenance'
    ),
  },
  // Broader PI buckets that do not map to a specific incident type.
  {
    incident: 'other',
    test: phrases(
      'wrongful death',
      'elder abuse',
      'nursing home',
      'mass tort',
      'class action',
      'catastrophic injury',
      'burn injury',
      'brain injury',
      'spinal cord',
      'dram shop',
      'aviation',
      'maritime',
      'admiralty',
      'railroad',
      'fela',
      'bad faith',
      'insurance bad faith'
    ),
  },
]

/** A bare personal-injury label with no sub-type attached. */
const GENERIC_PI = phrases(
  'personal injury',
  'injury law',
  'injury attorney',
  'injury lawyer',
  'accident',
  'accident law',
  'tort',
  'plaintiff',
  'trial law',
  'civil litigation'
)

function normalizeLabel(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type PracticeAreaNormalization = {
  /** Deduplicated incident types, safe to store in `Attorney.specialties`. */
  incidentTypes: IncidentType[]
  /** Labels that produced at least one incident type. */
  matchedLabels: string[]
  /** Labels that produced nothing — useful for tuning the patterns. */
  unmatchedLabels: string[]
  /**
   * True when the only evidence was a generic personal-injury label, so
   * `incidentTypes` came from `GENERIC_PI_INCIDENT_TYPES` rather than from a
   * stated sub-type. Callers should treat these as lower-confidence.
   */
  genericOnly: boolean
}

/**
 * Map one free-text label to incident types. A label can yield more than one
 * (e.g. "Auto and Truck Accidents" is a single `vehicle`, but "Personal Injury
 * and Workers Comp" yields both a generic bucket and `workplace`).
 *
 * Already-valid incident types and claim types pass straight through, so this
 * is safe to run repeatedly over data that has been normalized before.
 */
export function normalizePracticeAreaLabel(label: string): IncidentType[] {
  const raw = String(label ?? '').trim()
  if (!raw) return []

  // Already an incident type — pass through untouched.
  const slug = raw.toLowerCase().replace(/[\s-]+/g, '_')
  if (INCIDENT_TYPE_SET.has(slug)) return [slug as IncidentType]

  // Claim types stored by older code map back onto their incident type.
  if (slug === 'auto') return ['vehicle']
  if (slug === 'slip_and_fall') return ['slip_fall']

  const normalized = normalizeLabel(raw)
  if (!normalized) return []

  const found: IncidentType[] = []
  for (const pattern of PATTERNS) {
    if (pattern.test.test(normalized) && !found.includes(pattern.incident)) {
      found.push(pattern.incident)
    }
  }

  return found
}

/**
 * Normalize a list of labels into storable incident types.
 *
 * When nothing specific matches but a generic personal-injury label is present,
 * falls back to `GENERIC_PI_INCIDENT_TYPES` and flags the result as generic.
 */
export function normalizePracticeAreas(labels: readonly string[]): PracticeAreaNormalization {
  const incidentTypes: IncidentType[] = []
  const matchedLabels: string[] = []
  const unmatchedLabels: string[] = []
  let sawGenericPi = false

  for (const label of labels) {
    const raw = String(label ?? '').trim()
    if (!raw) continue

    const mapped = normalizePracticeAreaLabel(raw)
    if (mapped.length > 0) {
      matchedLabels.push(raw)
      for (const incident of mapped) {
        if (!incidentTypes.includes(incident)) incidentTypes.push(incident)
      }
      continue
    }

    if (GENERIC_PI.test(normalizeLabel(raw))) {
      sawGenericPi = true
      matchedLabels.push(raw)
      continue
    }

    unmatchedLabels.push(raw)
  }

  if (incidentTypes.length === 0 && sawGenericPi) {
    return {
      incidentTypes: [...GENERIC_PI_INCIDENT_TYPES],
      matchedLabels,
      unmatchedLabels,
      genericOnly: true,
    }
  }

  return { incidentTypes, matchedLabels, unmatchedLabels, genericOnly: false }
}

/**
 * Parse the practice-area column as stored on staging rows, which may hold a
 * JSON array, a comma-separated string, or a single label.
 */
export function parsePracticeAreaText(raw: string | null | undefined): string[] {
  const value = String(raw ?? '').trim()
  if (!value) return []

  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry).trim()).filter(Boolean)
      }
    } catch {
      // Fall through to delimiter splitting.
    }
  }

  return value
    .split(/[,;|]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}
