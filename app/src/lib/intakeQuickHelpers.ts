/**
 * Pure helpers for IntakeWizardQuick — unit-tested without React/i18n.
 */
import { getCountiesForState } from './usLocationData'

/**
 * Maps intake injury types to the API claimType enum
 * ('auto' | 'slip_and_fall' | 'dog_bite' | 'medmal' | 'product' |
 *  'nursing_home_abuse' | 'wrongful_death' | 'high_severity_surgery').
 *
 * Types without an exact enum match map to the closest general
 * personal-injury category so SOL deadlines and routing stay correct:
 * - workplace → slip_and_fall (premises/general PI; workers'-comp tagged separately)
 * - assault → slip_and_fall (negligent security is premises liability)
 * - toxic → product (toxic torts route like product liability; same SOL rule)
 * - other → slip_and_fall (general personal-injury SOL)
 */
export const INJURY_TO_CLAIM: Record<string, string> = {
  vehicle: 'auto',
  slip_fall: 'slip_and_fall',
  workplace: 'slip_and_fall',
  medmal: 'medmal',
  dog_bite: 'dog_bite',
  product: 'product',
  assault: 'slip_and_fall',
  toxic: 'product',
  other: 'slip_and_fall',
}

export type CaseTaxonomy = {
  caseSubtype: string
  incidentTags: string[]
  taxonomyPath: string[]
}

const compactTags = (values: Array<string | false | null | undefined>) =>
  Array.from(new Set(values.filter(Boolean) as string[]))

export function buildCaseTaxonomy(input: {
  injuryType?: string
  claimType?: string
  branch?: Record<string, any>
  insuranceCoverage?: Record<string, any>
  injuryDetails?: Record<string, any>
  casePosture?: Record<string, any>
}): CaseTaxonomy {
  const injuryType = input.injuryType || ''
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
      defendantType === 'trucking' ? 'truck_accident'
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

export function injuryTypeToClaimType(injuryType: string): string {
  return INJURY_TO_CLAIM[injuryType] ?? 'product'
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
