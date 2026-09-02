/**
 * Pure helpers for IntakeWizardQuick — unit-tested without React/i18n.
 */
import { INCIDENT_SUBTYPE_TAGS } from './caseTaxonomy'
import { getCountiesForState } from './usLocationData'

/**
 * Maps the incident type the plaintiff picked in intake onto the claimType
 * stored on the assessment.
 *
 * This map used to collapse four incident types onto other categories that had
 * an exact match in a narrower enum — workplace and assault and "other" all
 * became slip_and_fall, and toxic became product. That was destructive: the
 * plaintiff's actual answer was gone by the time the request left the browser,
 * so someone who reported a workplace injury was shown to the admin and the
 * attorney as a slip & fall (CP-406). Every incident type now round-trips to a
 * distinct claim type. SOL and routing are unaffected — both normalise these
 * slugs back to the same underlying rules (see solRules CLAIM_TYPE_ALIASES and
 * case-type-match).
 */
export const INJURY_TO_CLAIM: Record<string, string> = {
  vehicle: 'auto',
  slip_fall: 'slip_and_fall',
  workplace: 'workplace_injury',
  medmal: 'medmal',
  dog_bite: 'dog_bite',
  product: 'product',
  assault: 'intentional_tort',
  toxic: 'toxic_exposure',
  nursing_home_abuse: 'nursing_home_abuse',
  wrongful_death: 'wrongful_death',
  high_severity_surgery: 'high_severity_surgery',
  other: 'other_pi',
}

export type CaseTaxonomy = {
  caseSubtype: string
  incidentTags: string[]
  taxonomyPath: string[]
}

const compactTags = (values: Array<string | false | null | undefined>) =>
  Array.from(new Set(values.filter(Boolean) as string[]))

/**
 * @param input.incidentSubtype The subtype the claimant picked directly (see
 * caseTaxonomy.ts). Where present it wins over anything derived from branch
 * answers, because it is the claimant's own answer to the same question rather
 * than an inference from a neighbouring one. A type that gains a subtype
 * question should follow the vehicle branch below and prefer it the same way.
 */
export function buildCaseTaxonomy(input: {
  injuryType?: string
  claimType?: string
  incidentSubtype?: string
  branch?: Record<string, any>
  insuranceCoverage?: Record<string, any>
  injuryDetails?: Record<string, any>
  casePosture?: Record<string, any>
}): CaseTaxonomy {
  const injuryType = input.injuryType || ''
  const incidentSubtype = input.incidentSubtype || ''
  const branch = input.branch || {}
  const insuranceCoverage = input.insuranceCoverage || {}
  const injuryDetails = input.injuryDetails || {}
  const casePosture = input.casePosture || {}
  const claimType = input.claimType || injuryTypeToClaimType(injuryType)

  let caseSubtype = injuryType || claimType || 'personal_injury'
  const taxonomyPath = [claimType]
  const tags: Array<string | false | null | undefined> = [injuryType, claimType]

  if (injuryType === 'vehicle') {
    const crashType = branch.crashType || 'vehicle_accident'
    const defendantType = branch.defendantType || ''
    caseSubtype =
      incidentSubtype
        ? incidentSubtype
        : defendantType === 'trucking' ? 'truck_accident'
          : defendantType === 'uber_lyft' ? 'rideshare_accident'
            : defendantType === 'delivery' ? 'delivery_vehicle_accident'
              : crashType === 'pedestrian' ? 'pedestrian_accident'
                : crashType === 'bicycle' ? 'bicycle_accident'
                  : crashType === 'multi_vehicle' ? 'multi_vehicle_accident'
                    : crashType === 'rear_end' ? 'rear_end_collision'
                      : crashType === 'head_on' ? 'head_on_collision'
                        : crashType === 'left_turn' ? 'left_turn_collision'
                          : 'auto_accident'
    taxonomyPath.push(caseSubtype)
    tags.push(
      ...(INCIDENT_SUBTYPE_TAGS[caseSubtype] || []),
      crashType,
      defendantType,
      defendantType === 'trucking' && 'commercial_vehicle',
      defendantType === 'uber_lyft' && 'rideshare',
      defendantType === 'delivery' && 'delivery_driver',
      defendantType === 'company' && 'company_vehicle',
      defendantType === 'government' && 'government_entity',
      branch.propertyDamage && `property_damage_${branch.propertyDamage}`,
      insuranceCoverage.umUimCoverage === 'yes' && 'um_uim_available',
      insuranceCoverage.umUimCoverage === 'no' && 'no_um_uim_reported',
      insuranceCoverage.defendantCoverageLimits && `defendant_limits_${insuranceCoverage.defendantCoverageLimits}`,
    )
  } else if (injuryType === 'slip_fall' || injuryType === 'workplace') {
    const propertyType = injuryType === 'workplace' ? 'workplace' : branch.propertyType || 'premises'
    const hazardType = branch.hazardType || ''
    caseSubtype = injuryType === 'workplace' ? 'workplace_injury' : `${propertyType}_premises`
    taxonomyPath.push(caseSubtype)
    tags.push(
      propertyType,
      hazardType,
      hazardType && `hazard_${hazardType}`,
      branch.incidentReport && 'incident_report_available',
      propertyType === 'apartment' && 'apartment_complex',
      propertyType === 'grocery' && 'retail_store',
      propertyType === 'hotel' && 'hotel',
      propertyType === 'sidewalk' && 'sidewalk',
      injuryType === 'workplace' && 'workers_comp_possible',
      injuryType === 'workplace' && 'third_party_liability_possible',
    )
  } else if (injuryType === 'medmal') {
    const errorType = branch.errorType || 'medical_error'
    const providerType = branch.providerType || ''
    caseSubtype =
      errorType === 'birth_injury' ? 'birth_injury'
        : providerType === 'nursing_home' ? 'nursing_home_abuse'
          : `${errorType}_malpractice`
    taxonomyPath.push(caseSubtype)
    tags.push(errorType, providerType, providerType && `provider_${providerType}`)
  } else if (injuryType === 'dog_bite') {
    caseSubtype = branch.biteLocation ? `dog_bite_${branch.biteLocation}` : 'dog_bite'
    taxonomyPath.push(caseSubtype)
    tags.push(
      branch.dogOwned === 'yes' && 'known_owner',
      branch.dogOwned === 'no_stray' && 'stray_dog',
      branch.biteLocation,
      branch.priorAggression === 'yes' && 'prior_aggression',
    )
  } else if (injuryType === 'product') {
    caseSubtype = branch.productType ? `${branch.productType}_defect` : 'product_liability'
    taxonomyPath.push(caseSubtype)
    tags.push(
      branch.productType,
      branch.productMalfunction && 'product_malfunction',
      branch.productRecalled && 'product_recall',
    )
  } else if (injuryType === 'assault') {
    caseSubtype = branch.assaultType ? `negligent_security_${branch.assaultType}` : 'negligent_security'
    taxonomyPath.push(caseSubtype)
    tags.push(
      branch.assaultType,
      branch.securityPresent === false && 'no_security_reported',
      branch.poorLighting && 'poor_lighting',
      'intentional_act',
      'premises_security',
    )
  } else if (injuryType === 'toxic') {
    caseSubtype = branch.substance ? `${branch.substance}_exposure` : 'toxic_exposure'
    taxonomyPath.push(caseSubtype)
    tags.push(
      branch.substance,
      branch.exposureDuration && `exposure_${branch.exposureDuration}`,
      'environmental_exposure',
    )
  } else if (incidentSubtype) {
    // A type that has a subtype question but no branch derivation of its own.
    caseSubtype = incidentSubtype
    taxonomyPath.push(caseSubtype)
    tags.push(...(INCIDENT_SUBTYPE_TAGS[caseSubtype] || []))
  }

  tags.push(
    Array.isArray(injuryDetails.diagnoses) && injuryDetails.diagnoses.includes('fracture') && 'fracture',
    Array.isArray(injuryDetails.diagnoses) && injuryDetails.diagnoses.includes('tbi') && 'tbi',
    Array.isArray(injuryDetails.imaging) && injuryDetails.imaging.includes('mri') && 'mri_documented',
    injuryDetails.surgeryStatus && injuryDetails.surgeryStatus !== 'not_discussed' && `surgery_${injuryDetails.surgeryStatus}`,
    casePosture.faultBelief && `fault_${casePosture.faultBelief}`,
    casePosture.attorneyStatus === 'no' && 'unrepresented',
    casePosture.acceptedSettlement === 'yes' && 'settlement_accepted',
  )

  return {
    caseSubtype,
    incidentTags: compactTags(tags),
    taxonomyPath: compactTags(taxonomyPath),
  }
}

export const CA_COUNTIES = [
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 'Del Norte', 'El Dorado',
  'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles',
  'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada',
  'Orange', 'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino', 'San Diego',
  'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara',
  'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama',
  'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba',
] as const

export function normalizeCounty(county: string): string {
  const c = county.replace(/\s*County\s*$/i, '').trim()
  return CA_COUNTIES.find((x) => x.toLowerCase() === c.toLowerCase()) || c
}

export function sanitizeDetectedCounty(state: string, county: string): string {
  const normalizedState = state.trim().toUpperCase()
  const normalizedCounty = normalizeCounty(county)
  if (!normalizedCounty) return ''

  const counties = getCountiesForState(normalizedState)
  if (counties.length === 0) return normalizedCounty

  return counties.find((entry) => entry.toLowerCase() === normalizedCounty.toLowerCase()) ?? ''
}

/**
 * One field the narrative can answer on the claimant's behalf. A discriminated
 * union rather than a bag of strings so the caller writing these into the form
 * cannot forget the extra data a fill needs — a body-part merge has to say
 * which parts it added, and a location fill carries two values, not one.
 */
export type DetectionFill =
  | { key: 'incidentDate'; date: string }
  | { key: 'venue'; state: string; county: string }
  | { key: 'injurySeverity'; value: string }
  | { key: 'medicalTreatment'; value: string }
  | { key: 'initialCareTiming'; value: string }
  | { key: 'emsResponded'; value: 'yes' | 'no' }
  | { key: 'bodyParts'; parts: string[] }
  | { key: 'crashType'; value: string }
  | { key: 'faultParty'; value: string }
  | { key: 'policeReport' }
  | { key: 'witnesses' }
  | { key: 'photosVideo' }

/** The parts of the intake form that decide whether a detected fact may be written. */
export type DetectionFillSnapshot = {
  incidentDatePreset: string
  incidentDate: string
  venue: { state: string; county: string }
  injurySeverity: string
  medicalTreatmentCount: number
  initialCareTiming: string
  emsResponded: string
  bodyParts: string[]
  branch: Record<string, unknown>
}

/**
 * Decide which detected facts may be written into the form.
 *
 * Extraction runs on a debounce while the claimant types, so this can be asked
 * the same question repeatedly against a form they have since edited. Three
 * rules make that safe. An answer that already exists is never replaced, so
 * their own input always wins. The yes/no evidence flags are only ever turned
 * on, because an auto-cleared checkbox looks exactly like one that was never
 * touched and a wrong "no" would be invisible to the only person who could
 * correct it. And since a fill only ever lands on an empty field, undoing one
 * is always a reset to empty — which is what makes per-field undo trustworthy.
 *
 * Shaped as a pure function over a snapshot because the alternative — deciding
 * this inside a React state updater — cannot be tested and cannot be read.
 */
export function planDetectionFill(
  snapshot: DetectionFillSnapshot,
  result: {
    incidentDate?: string | null
    state?: string | null
    county?: string | null
    injurySeverity?: string | null
    firstCare?: string | null
    careTiming?: string | null
    emsResponded?: 'yes' | 'no' | 'unknown'
    bodyParts?: string[]
    crashType?: string | null
    atFault?: string | null
    policeReport?: 'yes' | 'no' | 'unknown'
    witnesses?: 'yes' | 'no' | 'unknown'
    photos?: 'yes' | 'no' | 'unknown'
  },
): DetectionFill[] {
  const fills: DetectionFill[] = []

  if (result.incidentDate && !snapshot.incidentDatePreset && !snapshot.incidentDate) {
    fills.push({ key: 'incidentDate', date: result.incidentDate })
  }

  // A county the model invented, or one belonging to another state, is dropped
  // rather than written — sanitizeDetectedCounty returns '' unless the name
  // matches a real county in that state.
  const state = snapshot.venue.state || (result.state ?? '')
  const county =
    snapshot.venue.county ||
    (result.county && state ? sanitizeDetectedCounty(state, result.county) : '')
  if (state !== snapshot.venue.state || county !== snapshot.venue.county) {
    fills.push({ key: 'venue', state, county })
  }

  if (result.injurySeverity && !snapshot.injurySeverity) {
    fills.push({ key: 'injurySeverity', value: result.injurySeverity })
  }
  if (result.firstCare && snapshot.medicalTreatmentCount === 0) {
    fills.push({ key: 'medicalTreatment', value: result.firstCare })
  }
  if (result.careTiming && !snapshot.initialCareTiming) {
    fills.push({ key: 'initialCareTiming', value: result.careTiming })
  }
  if ((result.emsResponded === 'yes' || result.emsResponded === 'no') && !snapshot.emsResponded) {
    fills.push({ key: 'emsResponded', value: result.emsResponded })
  }

  // Defaulted because the app and API deploy separately: an API still serving
  // the previous extraction shape returns no bodyParts at all.
  const addedParts = (result.bodyParts ?? []).filter(part => !snapshot.bodyParts.includes(part))
  if (addedParts.length) fills.push({ key: 'bodyParts', parts: addedParts })

  if (result.crashType && !snapshot.branch.crashType) {
    fills.push({ key: 'crashType', value: result.crashType })
  }
  if (result.atFault && !snapshot.branch.faultParty) {
    fills.push({ key: 'faultParty', value: result.atFault })
  }
  if (result.policeReport === 'yes' && !snapshot.branch.policeReport) fills.push({ key: 'policeReport' })
  if (result.witnesses === 'yes' && !snapshot.branch.witnesses) fills.push({ key: 'witnesses' })
  if (result.photos === 'yes' && !snapshot.branch.photosVideo) fills.push({ key: 'photosVideo' })

  return fills
}

export function injuryTypeToClaimType(injuryType: string): string {
  // An unrecognised incident type is by definition not a product claim; the
  // old 'product' fallback mislabelled anything unmapped.
  return INJURY_TO_CLAIM[injuryType] ?? 'other_pi'
}

/**
 * Whether the "police report" document label applies for a given injury type.
 *
 * Police reliably respond to vehicle collisions and assaults, so those cases
 * produce a police report. Premises, workplace, dog-bite, product, and other
 * cases are usually documented by an incident report filed by the property
 * owner or employer instead — showing "Police Report" there makes plaintiffs
 * think they have nothing to upload. For those we use an "Incident Report /
 * Police Report" label so the right document gets collected.
 */
export function usesPoliceReportLabel(injuryType: string): boolean {
  return injuryType === 'vehicle' || injuryType === 'assault'
}
