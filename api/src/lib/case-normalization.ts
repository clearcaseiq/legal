/**
 * Case Intake Normalization
 * Transforms raw assessment + facts into a structured case object for the routing engine.
 * This is the object the routing engine consumes.
 */

import { prisma } from './prisma'
import { logger } from './logger'
import { deriveSOLStatus } from './solRules'

export interface NormalizedCase {
  case_id: string
  claim_type: string
  sub_type?: string
  incident_date?: string
  jurisdiction_state: string
  jurisdiction_county?: string
  city?: string
  injury_severity: number
  treatment_status: string
  liability_confidence: number
  evidence_score: number
  damages_score: number
  estimated_case_value_low: number
  estimated_case_value_high: number
  trial_probability?: number
  statute_of_limitations_status: 'ok' | 'expiring_soon' | 'expired' | 'unknown'
  plaintiff_language?: string
  medical_record_present: boolean
  police_report_present: boolean
  wage_loss_present: boolean
  urgency_level: 'low' | 'medium' | 'high' | 'critical'
  narrative_present: boolean
  plaintiff_contact_complete: boolean
  required_disclosures_accepted: boolean
  rawFacts?: Record<string, unknown>
  rawPrediction?: Record<string, unknown>
}

function parseFacts(facts: string | object): Record<string, unknown> {
  if (typeof facts === 'string') {
    try {
      return JSON.parse(facts) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return (facts as Record<string, unknown>) || {}
}

function parsePrediction(prediction: { viability?: string; bands?: string } | null): {
  viability?: Record<string, number>
  bands?: { p25?: number; median?: number; p75?: number }
} {
  if (!prediction) return {}
  return {
    viability: prediction.viability ? JSON.parse(prediction.viability) : undefined,
    bands: prediction.bands ? JSON.parse(prediction.bands) : undefined
  }
}

/**
 * Derive injury severity (0-4) from facts
 */
function deriveInjurySeverity(facts: Record<string, unknown>): number {
  const injuries = Array.isArray(facts.injuries) ? facts.injuries as Array<{ severity?: number }> : []
  if (injuries.length === 0) return 1
  const maxSeverity = Math.max(...injuries.map(i => i.severity ?? 1), 1)
  return Math.min(4, Math.max(0, maxSeverity))
}

/**
 * Derive treatment status from facts
 */
function deriveTreatmentStatus(facts: Record<string, unknown>): string {
  const treatment = Array.isArray(facts.treatment) ? facts.treatment : []
  if (treatment.length === 0) return 'none'
  const hasOngoing = treatment.some((t: { status?: string }) => t.status === 'ongoing')
  return hasOngoing ? 'ongoing' : 'completed'
}

/**
 * Derive evidence score (0-1) from evidence files and facts
 */
async function deriveEvidenceScore(assessmentId: string, facts: Record<string, unknown>): Promise<number> {
  const files = await prisma.evidenceFile.count({
    where: { assessmentId }
  })
  const hasNarrative = !!(facts.incident as Record<string, unknown>)?.narrative
  const hasLocation = !!((facts.incident as Record<string, unknown>)?.location || facts.venue)
  const damages = (facts.damages as Record<string, number>) || {}
  const hasDamages = !!(damages.med_charges || damages.med_paid || damages.wage_loss)
  let score = 0
  if (hasNarrative) score += 0.25
  if (hasLocation) score += 0.15
  if (files > 0) score += Math.min(0.4, files * 0.1)
  if (hasDamages) score += 0.2
  return Math.min(1, score)
}

/**
 * Normalize an assessment into a structured case for routing
 */
export async function normalizeCaseForRouting(assessment: {
  id: string
  claimType: string
  venueState: string
  venueCounty?: string | null
  facts: string
  predictions?: Array<{ viability?: string; bands?: string }>
}): Promise<NormalizedCase> {
  const facts = parseFacts(assessment.facts)
  const latestPred = assessment.predictions?.[0]
  const pred = parsePrediction(latestPred || null)

  const incident = (facts.incident as Record<string, unknown>) || {}
  const damages = (facts.damages as Record<string, number>) || {}
  const consents = (facts.consents as Record<string, boolean>) || {}
  const venue = (facts.venue as Record<string, string>) || {}
  const plaintiffContext = (facts.plaintiffContext as Record<string, unknown>) || {}

  const bands = pred.bands || {}
  const viability = pred.viability || {}
  const medianValue = bands.median ?? ((damages.med_charges || damages.med_paid || 0) || 15000)
  const p25 = bands.p25 ?? Math.round(medianValue * 0.6)
  const p75 = bands.p75 ?? Math.round(medianValue * 1.4)

  const evidenceScore = await deriveEvidenceScore(assessment.id, facts)

  // Check evidence categories from DB
  const evidenceFiles = await prisma.evidenceFile.findMany({
    where: { assessmentId: assessment.id },
    select: { category: true }
  })
  const categories = new Set(evidenceFiles.map(f => f.category))
  const medical_record_present = categories.has('medical_records') || categories.has('bills')
  const police_report_present = categories.has('police_report')
  const wage_loss_present = categories.has('wage_loss') || !!(damages.wage_loss || (facts.caseAcceleration as Record<string, unknown>)?.wageLoss)

  const narrative_present = !!(incident.narrative && String(incident.narrative).trim().length > 20)
  const plaintiff_contact_complete = !!(plaintiffContext.email || plaintiffContext.phone)
  const required_disclosures_accepted = !!(consents.tos && consents.privacy && consents.hipaa)

  // Urgency: high viability + recent incident = higher urgency
  const incidentDate = incident.date as string | undefined
  const daysSinceIncident = incidentDate
    ? Math.floor((Date.now() - new Date(incidentDate).getTime()) / (24 * 60 * 60 * 1000))
    : 365
  const viabilityOverall = viability.overall ?? 0.5
  let urgency_level: NormalizedCase['urgency_level'] = 'medium'
  if (viabilityOverall >= 0.8 && daysSinceIncident < 30) urgency_level = 'critical'
  else if (viabilityOverall >= 0.7 && daysSinceIncident < 90) urgency_level = 'high'
  else if (viabilityOverall < 0.4) urgency_level = 'low'

  const sol = deriveSOLStatus({
    incidentDate,
    discoveryDate:
      (incident.discoveryDate as string | undefined) ||
      (incident.discoveredDate as string | undefined) ||
      (facts.discoveryDate as string | undefined),
    birthDate:
      (plaintiffContext.dateOfBirth as string | undefined) ||
      (plaintiffContext.birthDate as string | undefined) ||
      (plaintiffContext.dob as string | undefined),
    venue: {
      state: (assessment.venueState || venue.state || 'CA') as string,
      county: (assessment.venueCounty || venue.county) as string | undefined
    },
    claimType: assessment.claimType
  })

  return {
    case_id: assessment.id,
    claim_type: assessment.claimType,
    sub_type: (facts.claimType as string) || undefined,
    incident_date: incidentDate,
    jurisdiction_state: assessment.venueState || venue.state || 'CA',
    jurisdiction_county: assessment.venueCounty || venue.county,
    city: venue.city,
    injury_severity: deriveInjurySeverity(facts),
    treatment_status: deriveTreatmentStatus(facts),
    liability_confidence: viability.liability ?? 0.5,
    evidence_score: evidenceScore,
    damages_score: viability.damages ?? 0.5,
    estimated_case_value_low: p25,
    estimated_case_value_high: p75,
    statute_of_limitations_status: sol.status,
    plaintiff_language: plaintiffContext.language as string,
    medical_record_present,
    police_report_present,
    wage_loss_present,
    urgency_level,
    narrative_present,
    plaintiff_contact_complete,
    required_disclosures_accepted,
    rawFacts: facts,
    rawPrediction: pred as Record<string, unknown>
  }
}
