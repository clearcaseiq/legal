import type { AssessmentWrite, ExpectationCheck, JurisdictionIntelligence, PlaintiffContext } from './schemas'

type IntakeValidationIssue = {
  path: string[]
  message: string
}

type IntakeValidationResult =
  | { success: true; data: AssessmentWrite }
  | { success: false; errors: IntakeValidationIssue[] }

const CLAIM_TYPES = new Set<AssessmentWrite['claimType']>([
  'auto',
  'slip_and_fall',
  'dog_bite',
  'medmal',
  'product',
  'nursing_home_abuse',
  'wrongful_death',
  'high_severity_surgery',
])

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function validateAssessmentSubmission(input: Record<string, any>): IntakeValidationResult {
  const errors: IntakeValidationIssue[] = []

  const claimType = typeof input.claimType === 'string' ? input.claimType : ''
  if (!CLAIM_TYPES.has(claimType as AssessmentWrite['claimType'])) {
    errors.push({ path: ['claimType'], message: 'Please select a valid claim type' })
  }

  const venueState = typeof input.venue?.state === 'string' ? input.venue.state.trim().toUpperCase() : ''
  const venueCounty = typeof input.venue?.county === 'string' ? input.venue.county.trim() : ''
  if (venueState.length !== 2) {
    errors.push({ path: ['venue', 'state'], message: 'State is required' })
  }
  if (!venueCounty) {
    errors.push({ path: ['venue', 'county'], message: 'County is required' })
  }

  const incidentDate = typeof input.incident?.date === 'string' ? input.incident.date.trim() : ''
  const incidentNarrative = typeof input.incident?.narrative === 'string' ? input.incident.narrative.trim() : ''
  const incidentLocation = typeof input.incident?.location === 'string' ? input.incident.location.trim() : ''
  if (!incidentDate) {
    errors.push({ path: ['incident', 'date'], message: 'Incident date is required' })
  }
  if (incidentNarrative.length < 10) {
    errors.push({ path: ['incident', 'narrative'], message: 'Please provide a detailed description' })
  }

  const incidentTimeline = Array.isArray(input.incident?.timeline)
    ? input.incident.timeline
        .filter((item: unknown): item is Record<string, any> => isRecord(item))
        .map((item: Record<string, any>, index: number) => ({
          label: typeof item.label === 'string' ? item.label.trim() : '',
          order: isFiniteNumber(item.order) ? item.order : index + 1,
          approxDate: typeof item.approxDate === 'string' && item.approxDate.trim() ? item.approxDate.trim() : undefined,
        }))
        .filter((item: { label: string }) => item.label.length > 0)
    : undefined

  const injuries = Array.isArray(input.injuries)
    ? input.injuries.filter((item: unknown): item is Record<string, any> => isRecord(item))
    : []
  if (
    injuries.length === 0 ||
    typeof injuries[0]?.description !== 'string' ||
    injuries[0].description.trim().length === 0
  ) {
    errors.push({ path: ['injuries'], message: 'Please describe your injuries' })
  }

  const treatment = Array.isArray(input.treatment) ? input.treatment.filter((item) => isRecord(item)) : undefined

  const consents = {
    tos: !!input.consents?.tos,
    privacy: !!input.consents?.privacy,
    ml_use: !!input.consents?.ml_use,
    hipaa: !!input.consents?.hipaa,
  }
  if (!consents.tos) {
    errors.push({ path: ['consents', 'tos'], message: 'You must accept the terms of service' })
  }
  if (!consents.privacy) {
    errors.push({ path: ['consents', 'privacy'], message: 'You must accept the privacy policy' })
  }
  if (!consents.ml_use) {
    errors.push({ path: ['consents', 'ml_use'], message: 'You must consent to ML processing' })
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  const damages = isRecord(input.damages) ? Object.fromEntries(
    Object.entries(input.damages).filter(([, value]) => isFiniteNumber(value))
  ) : {}

  const data: AssessmentWrite = {
    userId: typeof input.userId === 'string' && input.userId.trim() ? input.userId.trim() : undefined,
    claimType: claimType as AssessmentWrite['claimType'],
    venue: {
      state: venueState,
      county: venueCounty,
    },
    incident: {
      date: incidentDate,
      location: incidentLocation || undefined,
      narrative: incidentNarrative,
      parties: Array.isArray(input.incident?.parties)
        ? input.incident.parties.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
        : undefined,
      timeline: incidentTimeline,
    },
    injuries: injuries.map((injury) => ({ ...injury })),
    treatment,
    damages,
    insurance: isRecord(input.insurance) ? input.insurance : undefined,
    consents,
    jurisdiction: isRecord(input.jurisdiction) ? (input.jurisdiction as JurisdictionIntelligence) : undefined,
    plaintiffContext: isRecord(input.plaintiffContext) ? (input.plaintiffContext as PlaintiffContext) : undefined,
    expectationCheck: isRecord(input.expectationCheck) ? (input.expectationCheck as ExpectationCheck) : undefined,
  }

  if (isRecord(input.liability)) {
    data.liability = input.liability
  }

  return { success: true, data }
}
