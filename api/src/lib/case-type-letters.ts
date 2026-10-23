/**
 * What changes in a case's letters with the kind of case: the evidence the
 * carrier is asked to preserve and the coverage it is asked to confirm, the
 * records a treating provider is asked for beyond what fits its specialty, the
 * payer details a bill should show, who signs the HIPAA authorization, and the
 * case-specific cautions shown before a send.
 *
 * Every claim-type slug (see claim-types.ts) maps onto one family here; an
 * unknown or missing type gets the general personal-injury profile.
 */
import { formatCaseTypeWithSubtype } from './claim-types'

export type CaseFamily =
  | 'vehicle'
  | 'premises'
  | 'workplace'
  | 'medmal'
  | 'animal'
  | 'product'
  | 'assault'
  | 'toxic'
  | 'nursing_home'
  | 'wrongful_death'
  | 'catastrophic'
  | 'general'

/** Case-specific record types, merged into records-request's RECORD_TYPES. */
export const CASE_RECORD_TYPES = {
  complete_chart: 'The complete chart, including physician orders, nursing notes, consent forms, and the electronic audit trail (access and edit log)',
  work_status: 'Work status reports, restrictions, and disability or off-work notes',
  wound_care: 'Wound care records and photographs, infection treatment, and rabies or tetanus prophylaxis',
  toxicology: 'Toxicology and exposure testing, and the occupational and environmental history taken',
  facility_care: 'Care plans, assessments, medication administration records, and fall or incident reports',
  final_treatment: 'Records of final treatment, the death or discharge summary, and any autopsy or pathology report held',
  future_care: 'Discharge plans, prognosis, and recommendations for future care, equipment, or home modifications',
  forensic_exam: 'Forensic or injury documentation, photographs, and any report made to law enforcement',
} as const
export type CaseRecordType = keyof typeof CASE_RECORD_TYPES

export interface CaseLetterProfile {
  family: CaseFamily
  /** What the claim is for: "injuries", or "injuries and death". */
  harm: string
  /** Evidence the carrier is asked to preserve. */
  preserve: string[]
  /** Extra asks of the carrier, after coverage confirmation. */
  carrierAsks: string[]
  /** Coverage line when the policy is the client's own. */
  ownPolicyCoverage: string
  /** Record types added for every provider on this kind of case. */
  extraRecordTypes: CaseRecordType[]
  /** A sentence added to the billing request (payer details the bill should show). */
  billingNote: string | null
  /** Who signs the HIPAA authorization, as the letter refers to them. */
  authorizationSigner: string
  /** Cautions shown as warnings before a records request is sent. */
  requestCautions: string[]
  /** Cautions shown as warnings before a letter of protection is issued. */
  lopCautions: string[]
}

const FAMILY_BY_SLUG: Record<string, CaseFamily> = {
  auto: 'vehicle',
  vehicle: 'vehicle',
  motor_vehicle: 'vehicle',
  car_accident: 'vehicle',
  truck_accident: 'vehicle',
  motorcycle: 'vehicle',
  slip_and_fall: 'premises',
  slip_fall: 'premises',
  premises: 'premises',
  premises_liability: 'premises',
  workplace: 'workplace',
  workplace_injury: 'workplace',
  workers_comp: 'workplace',
  medmal: 'medmal',
  medical_malpractice: 'medmal',
  med_mal: 'medmal',
  dog_bite: 'animal',
  product: 'product',
  product_liability: 'product',
  assault: 'assault',
  intentional_tort: 'assault',
  toxic: 'toxic',
  toxic_exposure: 'toxic',
  nursing_home_abuse: 'nursing_home',
  nursing_home: 'nursing_home',
  wrongful_death: 'wrongful_death',
  high_severity_surgery: 'catastrophic',
  other: 'general',
  other_pi: 'general',
}

/** Subtypes that say more than their claim type (a "workplace" subtype on an auto case is a work-vehicle crash, still vehicle). */
const FAMILY_BY_SUBTYPE: Record<string, CaseFamily> = {
  negligent_security: 'assault',
  birth_injury: 'medmal',
  nursing_home_abuse: 'nursing_home',
  toxic_exposure: 'toxic',
}

const GENERAL_OWN_POLICY =
  '- Confirm in writing all coverage available to our client under this policy, including any medical payments coverage, and its limits.'

const PROFILES: Record<CaseFamily, Omit<CaseLetterProfile, 'family' | 'harm'>> = {
  vehicle: {
    preserve: [
      'photographs and video of the scene and the vehicles',
      'vehicle event data recorder ("black box"), telematics and dashcam data',
      'the vehicles themselves and any damage estimates, until we have had the chance to inspect them',
      'recorded statements, 911 calls and dispatch records you hold',
    ],
    carrierAsks: ['- Send us the property damage estimate and photographs for each vehicle.'],
    ownPolicyCoverage:
      '- Confirm in writing all coverage available to our client under this policy, including uninsured/underinsured motorist, medical payments, and personal injury protection benefits and their limits.',
    extraRecordTypes: [],
    billingNote: 'Please show any payments from personal injury protection (PIP), medical payments coverage, or health insurance, by payer.',
    authorizationSigner: 'the patient',
    requestCautions: [],
    lopCautions: [],
  },
  premises: {
    preserve: [
      'surveillance and security video from the date of the incident, including the hours before and after',
      'incident and accident reports',
      'inspection, cleaning, sweep and maintenance logs for the area',
      'photographs of the area, and the names of employees on duty',
    ],
    carrierAsks: ['- Send us a copy of the incident report prepared for this incident.'],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: [],
    billingNote: 'Please show any payments from health insurance or medical payments coverage, by payer.',
    authorizationSigner: 'the patient',
    requestCautions: [],
    lopCautions: [],
  },
  workplace: {
    preserve: [
      "the employer's first report of injury and any internal incident report",
      'surveillance video, safety inspection and training records, and equipment maintenance records',
      'witness statements and the names of supervisors and coworkers present',
    ],
    carrierAsks: ['- Send us the workers’ compensation claim number, and a ledger of indemnity and medical payments made.'],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: ['work_status'],
    billingNote: "Please show the workers' compensation claim number, if billed to comp, and all payments received by payer.",
    authorizationSigner: 'the patient',
    requestCautions: [
      "Workplace injury: if this care was billed to workers' compensation, the provider may need the comp claim number, and comp rules on records and liens may apply.",
    ],
    lopCautions: [
      "Workplace injury: workers' compensation usually pays this care. Confirm a letter of protection is appropriate and does not conflict with the comp carrier's lien.",
    ],
  },
  medmal: {
    preserve: [
      'the complete medical chart in its native electronic form, including the audit trail and metadata',
      'monitoring strips, imaging and pathology specimens',
      'incident, occurrence and sentinel-event reports, and the policies and protocols in effect on the date of care',
      'staffing and scheduling records for the dates of care',
    ],
    carrierAsks: [],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: ['complete_chart'],
    billingNote: null,
    authorizationSigner: 'the patient',
    requestCautions: [
      'Medical malpractice: if this provider is a potential defendant, many states require a pre-suit notice or affidavit; check the rules before sending.',
    ],
    lopCautions: [],
  },
  animal: {
    preserve: [
      'any animal control, bite and quarantine reports',
      'records of the animal’s ownership, vaccination and prior incidents or complaints',
      'photographs and video of the incident and injuries',
    ],
    carrierAsks: ['- Send us any animal control, bite or quarantine report you hold.'],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: ['wound_care'],
    billingNote: 'Please show any payments from health insurance or medical payments coverage, by payer.',
    authorizationSigner: 'the patient',
    requestCautions: [],
    lopCautions: [],
  },
  product: {
    preserve: [
      'the product, its packaging, instructions and warnings, in its current condition; please do not repair, test, or discard it',
      'purchase records, lot or serial numbers, and any recall or complaint history you hold',
      'photographs and video of the product and the incident',
    ],
    carrierAsks: ['- Confirm that the product and its components are being preserved, and where they are held.'],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: [],
    billingNote: 'Please show any payments from health insurance or medical payments coverage, by payer.',
    authorizationSigner: 'the patient',
    requestCautions: [],
    lopCautions: [],
  },
  assault: {
    preserve: [
      'surveillance and security video from the date of the incident',
      'security staffing, patrol and guard logs, and prior incident and crime reports for the property',
      'incident reports and any report made to law enforcement',
    ],
    carrierAsks: ['- Send us the incident report and security logs for the date of the incident.'],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: ['forensic_exam'],
    billingNote: 'Please show any payments from health insurance or a victim compensation program, by payer.',
    authorizationSigner: 'the patient',
    requestCautions: [],
    lopCautions: [],
  },
  toxic: {
    preserve: [
      'environmental, air and water testing and monitoring results',
      'material safety data sheets, chemical inventories and purchase records',
      'exposure, industrial hygiene and regulatory inspection records',
    ],
    carrierAsks: [],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: ['toxicology'],
    billingNote: 'Please show any payments from health insurance or workers’ compensation, by payer.',
    authorizationSigner: 'the patient',
    requestCautions: [],
    lopCautions: [],
  },
  nursing_home: {
    preserve: [
      "the resident's complete chart, including care plans, assessments, medication administration and wound records",
      'fall, incident and abuse reports, and any report made to the state or to adult protective services',
      'staffing records, call-light logs and surveillance video for the relevant dates',
    ],
    carrierAsks: ['- Send us the incident reports and the facility’s report to the state, if one was made.'],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: ['facility_care', 'wound_care'],
    billingNote: 'Please show any payments from Medicare, Medicaid, or other insurance, by payer.',
    authorizationSigner: "the patient or the patient's legal representative",
    requestCautions: [
      "Nursing home case: if the resident lacks capacity, the authorization must be signed by a legal representative (power of attorney or guardian). Confirm the signer's authority is enclosed.",
    ],
    lopCautions: [],
  },
  wrongful_death: {
    preserve: [
      'all evidence related to the incident, including photographs, video and recorded statements',
      'any physical evidence, vehicles or equipment involved',
      'incident reports and any report made to law enforcement or the coroner',
    ],
    carrierAsks: ['- Confirm all coverage available for this loss, including any survival or death benefits and their limits.'],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: ['final_treatment'],
    billingNote: 'Please show the outstanding balance and all payments received, by payer.',
    authorizationSigner: "the decedent's personal representative",
    requestCautions: [
      "Wrongful death: a deceased patient's records are released only on an authorization signed by the personal representative of the estate. Enclose letters of administration or equivalent proof of authority.",
    ],
    lopCautions: [],
  },
  catastrophic: {
    preserve: [
      'all evidence related to the incident, including photographs, video and recorded statements',
      'any physical evidence, vehicles or equipment involved',
      'incident reports and any report made to law enforcement',
    ],
    carrierAsks: [],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: ['future_care', 'work_status'],
    billingNote: 'Please show all payments received and adjustments, by payer, and any amounts billed to future care.',
    authorizationSigner: 'the patient',
    requestCautions: [],
    lopCautions: [],
  },
  general: {
    preserve: ['photographs, video and recorded statements related to the incident', 'incident reports and any physical evidence'],
    carrierAsks: [],
    ownPolicyCoverage: GENERAL_OWN_POLICY,
    extraRecordTypes: [],
    billingNote: null,
    authorizationSigner: 'the patient',
    requestCautions: [],
    lopCautions: [],
  },
}

const slug = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')

export function caseFamily(claimType: string | null | undefined, subtype?: string | null): CaseFamily {
  return FAMILY_BY_SUBTYPE[slug(subtype)] || FAMILY_BY_SLUG[slug(claimType)] || 'general'
}

export function caseLetterProfile(claimType: string | null | undefined, subtype?: string | null): CaseLetterProfile {
  const family = caseFamily(claimType, subtype)
  return { ...PROFILES[family], family, harm: family === 'wrongful_death' ? 'injuries and death' : 'injuries' }
}

export function caseTypeLabel(claimType: string | null | undefined, subtype?: string | null): string {
  return formatCaseTypeWithSubtype(claimType, subtype)
}

/** "a, b and c" for the carrier's preservation sentence. */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] || ''
  return `${items.slice(0, -1).join('; ')}; and ${items[items.length - 1]}`
}
