/**
 * Rose Virtual AI Intake - Backend Contract
 * Maps spoken/typed Rose form answers directly into ClearCaseIQ intake schema.
 */
import { z } from 'zod'
import type { AssessmentWrite } from './validators'
import type { CaseType } from './rose-engine'

// Rose case type IDs (from RoseIntake.tsx)
export const ROSE_CASE_TYPES = ['auto_accident', 'slip_fall', 'medical_malpractice', 'other_pi'] as const

// ClearCaseIQ claim types (from validators.ts)
const CLAIM_TYPES = ['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death', 'high_severity_surgery'] as const

const ROSE_TO_CLAIM: Record<(typeof ROSE_CASE_TYPES)[number], (typeof CLAIM_TYPES)[number]> = {
  auto_accident: 'auto',
  slip_fall: 'slip_and_fall',
  medical_malpractice: 'medmal',
  other_pi: 'product' // fallback for "Other Injury"
}

export const RoseIntakePayload = z.object({
  intakeVersion: z.string().optional().default('v1'),
  source: z.literal('rose_virtual_ai_widget'),
  submittedAtClient: z.string().optional(),
  caseType: z.enum(ROSE_CASE_TYPES),
  incidentDate: z.string().min(1),
  incidentLocation: z.string().min(1),
  incidentSummary: z.string().min(1),
  injuries: z.string().min(1),
  treatment: z.string().min(1),
  evidence: z.array(z.object({
    id: z.string(),
    name: z.string(),
    size: z.number(),
    type: z.string()
  })).optional().default([]),
  contact: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1)
  })
})

export type RoseIntakePayload = z.infer<typeof RoseIntakePayload>

/** Parse county from incident location if present (e.g. "Los Angeles County, CA" or "Orange County") */
function parseCountyFromLocation(location: string): string | undefined {
  const match = location.match(/([A-Za-z\s]+)\s+County/i)
  return match ? match[1].trim() : undefined
}

/** Map Rose intake payload to ClearCaseIQ AssessmentWrite schema */
export function roseToAssessmentPayload(rose: RoseIntakePayload): Omit<AssessmentWrite, 'userId'> {
  const claimType = ROSE_TO_CLAIM[rose.caseType as keyof typeof ROSE_TO_CLAIM] ?? 'product'
  const county = parseCountyFromLocation(rose.incidentLocation) ?? rose.contact.city ?? 'Unknown'

  return {
    claimType,
    venue: {
      state: rose.contact.state,
      county
    },
    incident: {
      date: rose.incidentDate,
      location: rose.incidentLocation,
      narrative: rose.incidentSummary
    },
    injuries: [{ description: rose.injuries }],
    treatment: [{ type: rose.treatment, notes: '' }],
    damages: {},
    consents: {
      tos: true,
      privacy: true,
      ml_use: true,
      hipaa: true
    },
    intakeData: {
      source: 'rose_virtual_ai_widget',
      intakeVersion: rose.intakeVersion ?? 'v1',
      submittedAtClient: rose.submittedAtClient,
      rosePayload: rose,
      contact: rose.contact,
      evidenceMetadata: rose.evidence
    }
  }
}

/** Map Rose engine structured_payload to ClearCaseIQ AssessmentWrite */
export function enginePayloadToAssessment(payload: {
  case_type?: string | null
  incident_date?: string | null
  incident_location?: string | null
  incident_summary?: string | null
  injuries?: string[] | null
  treatment_level?: string | null
  treatment_notes?: string | null
  liability_facts?: string[] | null
  insurance_info?: string | null
  plaintiff_contact?: {
    full_name?: string | null
    phone?: string | null
    email?: string | null
    city?: string | null
    state?: string | null
  } | null
  escalation?: { disposition?: string; reason?: string }
}): Omit<AssessmentWrite, 'userId'> {
  const caseTypeMap: Record<string, AssessmentWrite['claimType']> = {
    auto_accident: 'auto',
    slip_fall: 'slip_and_fall',
    medical_malpractice: 'medmal',
    other_pi: 'product',
    unknown: 'product',
  }
  const claimType = caseTypeMap[payload.case_type as CaseType] ?? 'product'
  const contact = payload.plaintiff_contact
  const state = contact?.state ?? 'Unknown'
  const county = contact?.city ?? 'Unknown'

  return {
    claimType,
    venue: { state, county },
    incident: {
      date: payload.incident_date ?? '',
      location: payload.incident_location ?? undefined,
      narrative: payload.incident_summary ?? undefined,
    },
    injuries: (payload.injuries && payload.injuries.length > 0)
      ? payload.injuries.map((d) => ({ description: d }))
      : [{ description: 'Not specified' }],
    treatment: [
      {
        type: payload.treatment_level ?? payload.treatment_notes ?? 'unknown',
        notes: payload.treatment_notes ?? '',
      },
    ],
    damages: {},
    consents: { tos: true, privacy: true, ml_use: true, hipaa: true },
    intakeData: {
      source: 'rose_virtual_ai_widget',
      intakeVersion: 'v2_engine',
      enginePayload: payload,
      escalation: payload.escalation,
    },
  }
}
