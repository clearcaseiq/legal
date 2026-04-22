import { prisma } from './prisma'
import { buildMedicalChronology, computeCasePreparation } from './case-insights'
import { buildMedicalCostBenchmarkSummary, type MedicalCostBenchmarkSummary } from './medical-cost-benchmarks'

type Priority = 'high' | 'medium' | 'low'

export type CaseCommandCenterListItem = {
  title: string
  detail: string
  severity: Priority
}

export type CaseCommandCenterSource = {
  label: string
  detail: string
}

export type CaseAwareMessageTemplate = {
  id: string
  label: string
  text: string
}

export type CaseCommandCenter = {
  assessmentId: string
  leadId: string | null
  stage: {
    key: string
    title: string
    detail: string
    plaintiffTitle: string
    plaintiffDetail: string
    progressPercent: number
  }
  readiness: {
    score: number
    label: string
    detail: string
  }
  valueStory: {
    median: number
    low: number
    high: number
    detail: string
  }
  liabilityStory: {
    label: string
    detail: string
  }
  coverageStory: {
    label: string
    detail: string
    policyLimit: number | null
  }
  negotiationSummary: {
    eventCount: number
    latestEventType: string | null
    latestStatus: string | null
    latestEventDate: string | null
    latestDemand: number | null
    latestOffer: number | null
    gapToDemand: number | null
    posture: string
    recommendedMove: string
  }
  treatmentMonitor: {
    chronologyCount: number
    providerCount: number
    providers: string[]
    latestTreatmentDate: string | null
    largestGapDays: number
    status: string
    recommendedAction: string
  }
  medicalCostBenchmark: MedicalCostBenchmarkSummary
  strengths: CaseCommandCenterListItem[]
  weaknesses: CaseCommandCenterListItem[]
  defenseRisks: CaseCommandCenterListItem[]
  missingItems: Array<{ key: string; label: string; priority: Priority; plaintiffReason: string }>
  nextBestAction: {
    actionType: 'request_documents' | 'schedule_consult' | 'client_follow_up' | 'prepare_demand' | 'review_negotiation'
    title: string
    detail: string
  }
  suggestedDocumentRequest: {
    requestedDocs: string[]
    customMessage: string
  } | null
  suggestedPlaintiffUpdate: string
  copilot: {
    suggestedPrompts: string[]
    evidenceContext: CaseCommandCenterSource[]
  }
  sources: CaseCommandCenterSource[]
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function formatCurrencyCompact(value: number | null | undefined) {
  const amount = Number(value || 0)
  if (!amount) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function summarizeGapDays(gapDays: number) {
  if (gapDays >= 90) return 'long'
  if (gapDays >= 45) return 'meaningful'
  return 'noticeable'
}

function buildReadinessLabel(score: number) {
  if (score >= 85) return 'Demand-ready'
  if (score >= 65) return 'Attorney-review ready'
  if (score >= 40) return 'Needs file strengthening'
  return 'Early file'
}

function buildStage(params: {
  leadStatus?: string | null
  readinessScore: number
  missingCount: number
  treatmentGapCount: number
  hasNegotiation: boolean
  hasUpcomingConsult: boolean
}) {
  if (params.hasNegotiation) {
    return {
      key: 'negotiation',
      title: 'Negotiation strategy active',
      detail: 'The file has reached active negotiation review, so the focus is on value framing, offer response, and closing remaining risks.',
      plaintiffTitle: 'Your attorney is negotiating',
      plaintiffDetail: 'Your case has moved into negotiation work. We will keep you updated as offers or strategy changes come in.',
      progressPercent: 80,
    }
  }

  if (params.leadStatus === 'retained') {
    return {
      key: 'retained',
      title: 'Representation active',
      detail: 'The case is now in active attorney handling. The focus is on keeping the file organized and strengthening recovery leverage.',
      plaintiffTitle: 'Your attorney is actively working the case',
      plaintiffDetail: 'Your case is in active handling. New requests will appear if anything else is needed to keep it moving.',
      progressPercent: 72,
    }
  }

  if (params.hasUpcomingConsult) {
    return {
      key: 'consult',
      title: 'Consultation prep',
      detail: 'The next step is getting the attorney consult ready with a clear case summary and any missing support.',
      plaintiffTitle: 'Your consultation is being prepared',
      plaintiffDetail: 'Your attorney is preparing for the next conversation and may ask for a few final details before that meeting.',
      progressPercent: 58,
    }
  }

  if (params.missingCount > 0 || params.treatmentGapCount > 0 || params.readinessScore < 65) {
    return {
      key: 'file_strengthening',
      title: 'File strengthening',
      detail: 'The case still has a few gaps that affect valuation or liability confidence, so the focus is on documents, treatment continuity, and support.',
      plaintiffTitle: 'We are strengthening your case file',
      plaintiffDetail: 'A few documents or details are still needed before your attorney can push the case forward with more confidence.',
      progressPercent: 42,
    }
  }

  return {
    key: 'review_ready',
    title: 'Attorney review ready',
    detail: 'The file looks organized enough for the next legal workup, with fewer blockers slowing demand or negotiation preparation.',
    plaintiffTitle: 'Your file is ready for deeper attorney review',
    plaintiffDetail: 'Your case materials look organized enough for your attorney to keep advancing the next stage.',
    progressPercent: 63,
  }
}

function buildLiabilityStory(liabilityScore: number, facts: Record<string, any>) {
  const fault = String(facts?.liability?.fault || '').replace(/_/g, ' ')
  const evidence = Array.isArray(facts?.liability?.evidence) ? facts.liability.evidence.slice(0, 2) : []
  const negligence = String(facts?.liability?.negligence || '').replace(/_/g, ' ')
  const cues = [fault, negligence, ...evidence].filter(Boolean)

  if (liabilityScore >= 0.7) {
    return {
      label: 'Strong',
      detail: cues.length > 0
        ? `Liability currently reads as strong, supported by ${cues.join(', ')}.`
        : 'Liability currently reads as strong from the facts on file, but it still helps to keep corroborating support organized.',
    }
  }

  if (liabilityScore >= 0.45) {
    return {
      label: 'Mixed',
      detail: cues.length > 0
        ? `Liability looks mixed right now. The file points to ${cues.join(', ')}, but opposing arguments are still plausible.`
        : 'Liability looks mixed right now and will likely turn on additional records, reports, or witness support.',
    }
  }

  return {
    label: 'Unclear',
    detail: cues.length > 0
      ? `Liability is still thin. The current file only lightly supports ${cues.join(', ')} and needs stronger corroboration.`
      : 'Liability is still unclear and needs stronger supporting facts before it will present well to the defense or carrier.',
  }
}

function buildCoverageStory(policyLimit: number | null, hasInsuranceInfo: boolean, latestDemand: number | null) {
  if (!hasInsuranceInfo) {
    return {
      label: 'Coverage unclear',
      detail: 'Insurance details are still incomplete, so recovery path and policy-limit planning remain uncertain.',
      policyLimit: null,
    }
  }

  if (policyLimit && latestDemand && latestDemand > policyLimit) {
    return {
      label: 'Policy pressure',
      detail: `The current demand posture may run above the known policy limit of ${formatCurrencyCompact(policyLimit)}, so strategy should account for coverage constraints early.`,
      policyLimit,
    }
  }

  if (policyLimit) {
    return {
      label: 'Coverage identified',
      detail: `Known coverage is at least ${formatCurrencyCompact(policyLimit)}, which helps frame negotiation expectations and value strategy.`,
      policyLimit,
    }
  }

  return {
    label: 'Coverage noted',
    detail: 'Insurance information is on file, but usable policy-limit detail is still thin.',
    policyLimit: null,
  }
}

function buildNegotiationSummary(params: {
  negotiationEvents: Array<{ eventType: string | null; amount: number | null; eventDate: Date | null; status: string | null }>
  policyLimit: number | null
}) {
  const latestEvent = params.negotiationEvents[0] || null
  const latestDemand = params.negotiationEvents.find((item) => item.eventType === 'demand')?.amount ?? null
  const latestOffer = params.negotiationEvents.find((item) => item.eventType === 'offer')?.amount ?? null
  const gapToDemand =
    typeof latestDemand === 'number' && typeof latestOffer === 'number'
      ? Math.max(0, latestDemand - latestOffer)
      : null

  let posture = 'No negotiation posture yet'
  let recommendedMove = 'Finish document and treatment blockers before pushing demand posture.'

  if (latestEvent) {
    if (latestEvent.eventType === 'offer') {
      posture = latestOffer
        ? `Carrier offer logged at ${formatCurrencyCompact(latestOffer)}.`
        : 'Carrier offer logged and awaiting response strategy.'
      recommendedMove = gapToDemand && gapToDemand > 0
        ? `Counter with updated damages support and explain the remaining ${formatCurrencyCompact(gapToDemand)} gap to demand.`
        : 'Counter or respond with updated damages and liability support.'
    } else if (latestEvent.eventType === 'counter') {
      posture = 'Counter posture is active.'
      recommendedMove = 'Tighten supporting records, prepare follow-up cadence, and anchor around the latest documented value story.'
    } else if (latestEvent.eventType === 'demand') {
      posture = latestDemand
        ? `Demand package is out at ${formatCurrencyCompact(latestDemand)}.`
        : 'Demand posture is active.'
      recommendedMove = 'Track carrier response timing and make sure the package closes any remaining medical or coverage gaps.'
    } else {
      posture = 'Negotiation activity is active.'
      recommendedMove = 'Review the most recent event, update the risk posture, and decide the next response window.'
    }
  }

  if (params.policyLimit && latestDemand && latestDemand > params.policyLimit) {
    posture = `${posture} The current demand is pressing against the known policy ceiling.`
  }

  return {
    eventCount: params.negotiationEvents.length,
    latestEventType: latestEvent?.eventType ?? null,
    latestStatus: latestEvent?.status ?? null,
    latestEventDate: latestEvent?.eventDate ? latestEvent.eventDate.toISOString() : null,
    latestDemand,
    latestOffer,
    gapToDemand,
    posture,
    recommendedMove,
  }
}

function buildTreatmentMonitor(params: {
  chronology: Array<{ date: string | null; provider?: string }>
  treatmentGaps: Array<{ gapDays: number }>
}) {
  const providers = Array.from(
    new Set(
      params.chronology
        .map((item) => (typeof item.provider === 'string' ? item.provider.trim() : ''))
        .filter(Boolean),
    ),
  )
  const latestTreatmentDate =
    params.chronology
      .map((item) => item.date)
      .filter((value): value is string => Boolean(value))
      .sort()
      .slice(-1)[0] ?? null
  const largestGapDays = params.treatmentGaps.reduce((max, item) => Math.max(max, item.gapDays || 0), 0)

  let status = 'Treatment flow is still thin'
  let recommendedAction = 'Pull the next treatment records and confirm where care is continuing.'

  if (params.chronology.length >= 4 && largestGapDays === 0) {
    status = 'Treatment chronology looks organized'
    recommendedAction = 'Keep provider records current so the damages story stays negotiation-ready.'
  } else if (largestGapDays >= 60) {
    status = `Treatment continuity risk: ${largestGapDays}-day gap`
    recommendedAction = 'Close the treatment gap narrative quickly before demand or negotiation posture hardens.'
  } else if (params.chronology.length >= 2) {
    status = 'Treatment chronology is forming'
    recommendedAction = 'Round out remaining providers, records, and any recent follow-up visits.'
  }

  return {
    chronologyCount: params.chronology.length,
    providerCount: providers.length,
    providers: providers.slice(0, 4),
    latestTreatmentDate,
    largestGapDays,
    status,
    recommendedAction,
  }
}

export function answerCommandCenterCopilot(summary: CaseCommandCenter, question: string) {
  const normalized = question.toLowerCase()

  if (normalized.includes('missing') || normalized.includes('docs')) {
    const items = summary.missingItems.slice(0, 3).map((item) => item.label)
    return {
      answer: items.length > 0
        ? `The biggest file gaps right now are ${items.join(', ')}. ${summary.nextBestAction.detail}`
        : 'There are no major document blockers right now. The file looks organized enough for the next attorney workup.',
      sources: summary.sources.slice(0, 3),
    }
  }

  if (normalized.includes('defense') || normalized.includes('risk') || normalized.includes('weak')) {
    const risks = summary.defenseRisks.slice(0, 2).map((item) => item.title)
    return {
      answer: risks.length > 0
        ? `The main defense risks are ${risks.join(' and ')}. ${summary.liabilityStory.detail}`
        : `No major defense red flags stand out yet. ${summary.liabilityStory.detail}`,
      sources: summary.sources.slice(0, 3),
    }
  }

  if (normalized.includes('next')) {
    return {
      answer: `${summary.nextBestAction.title}: ${summary.nextBestAction.detail}`,
      sources: summary.sources.slice(0, 3),
    }
  }

  if (normalized.includes('value') || normalized.includes('settlement')) {
    return {
      answer: `The current value story centers on ${formatCurrencyCompact(summary.valueStory.median)} with a working range of ${formatCurrencyCompact(summary.valueStory.low)} to ${formatCurrencyCompact(summary.valueStory.high)}. ${summary.valueStory.detail}`,
      sources: summary.sources.slice(0, 3),
    }
  }

  if (normalized.includes('demand') || normalized.includes('ready') || normalized.includes('readiness')) {
    return {
      answer: `Readiness is ${summary.readiness.score}% (${summary.readiness.label}). ${summary.readiness.detail} ${summary.nextBestAction.detail}`,
      sources: summary.sources.slice(0, 4),
    }
  }

  if (normalized.includes('negotiation') || normalized.includes('offer') || normalized.includes('counter')) {
    return {
      answer: `${summary.negotiationSummary.posture} ${summary.negotiationSummary.recommendedMove}`,
      sources: summary.sources.filter((source) => ['Negotiation posture', 'Coverage posture', 'Readiness score'].includes(source.label)).slice(0, 3),
    }
  }

  if (normalized.includes('treatment') || normalized.includes('provider') || normalized.includes('medical')) {
    const providerLabel =
      summary.treatmentMonitor.providers.length > 0
        ? ` Providers on file include ${summary.treatmentMonitor.providers.join(', ')}.`
        : ''
    return {
      answer: `${summary.treatmentMonitor.status}. ${summary.treatmentMonitor.recommendedAction}${providerLabel}`,
      sources: summary.sources.filter((source) => ['Treatment chronology', 'Readiness score', 'Evidence on file'].includes(source.label)).slice(0, 3),
    }
  }

  if (normalized.includes('update') || normalized.includes('message') || normalized.includes('client')) {
    return {
      answer: `Use this update with the client: ${summary.suggestedPlaintiffUpdate}`,
      sources: summary.sources.slice(0, 3),
    }
  }

  return {
    answer: `${summary.stage.title}: ${summary.stage.detail} ${summary.nextBestAction.title}: ${summary.nextBestAction.detail}`,
    sources: summary.sources.slice(0, 3),
  }
}

export function buildCaseAwareMessageTemplates(summary: CaseCommandCenter): CaseAwareMessageTemplate[] {
  const templates: CaseAwareMessageTemplate[] = [
    {
      id: 'case_stage_update',
      label: 'Case stage update',
      text: `${summary.stage.plaintiffTitle}. ${summary.stage.plaintiffDetail}`,
    },
    {
      id: 'next_case_step',
      label: 'Next case step',
      text: summary.suggestedPlaintiffUpdate,
    },
    {
      id: 'demand_readiness_status',
      label: 'Demand readiness status',
      text: `Your file is currently ${summary.readiness.label.toLowerCase()} (${summary.readiness.score}% readiness). ${summary.nextBestAction.detail}`,
    },
  ]

  if (summary.suggestedDocumentRequest) {
    templates.push({
      id: 'request_key_documents',
      label: 'Request missing documents',
      text: `To keep your case moving, please send ${summary.suggestedDocumentRequest.requestedDocs
        .map((item) => item.replace(/_/g, ' '))
        .join(', ')}. ${summary.suggestedDocumentRequest.customMessage}`,
    })
  }

  if (summary.nextBestAction.actionType === 'schedule_consult') {
    templates.push({
      id: 'schedule_consultation',
      label: 'Schedule consultation',
      text: 'Your file looks organized enough for the next attorney conversation. What times work best for you this week for a consultation?',
    })
  } else {
    templates.push({
      id: 'follow_up_reminder',
      label: 'Follow-up reminder',
      text: `Just checking in on the next case step. ${summary.nextBestAction.detail}`,
    })
  }

  if (summary.negotiationSummary.eventCount > 0) {
    templates.push({
      id: 'negotiation_status_update',
      label: 'Negotiation status update',
      text: `Your case is in active negotiation review. ${summary.negotiationSummary.posture} ${summary.negotiationSummary.recommendedMove}`,
    })
  }

  return templates
}

export async function buildCaseCommandCenter(params: {
  assessmentId: string
  leadId?: string | null
}): Promise<CaseCommandCenter> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.assessmentId },
    select: {
      id: true,
      claimType: true,
      venueState: true,
      venueCounty: true,
      facts: true,
      createdAt: true,
      leadSubmission: {
        select: {
          id: true,
          status: true,
          lifecycleState: true,
          viabilityScore: true,
          liabilityScore: true,
          causationScore: true,
          damagesScore: true,
        },
      },
      predictions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          viability: true,
          bands: true,
        },
      },
    },
  })

  if (!assessment) {
    throw new Error('Assessment not found')
  }

  const facts = parseJson<Record<string, any>>(assessment.facts, {})
  const leadId = params.leadId ?? assessment.leadSubmission?.id ?? null
  const [casePreparation, chronology, evidenceFiles, appointments, insuranceDetails, negotiationEvents, latestContact] = await Promise.all([
    computeCasePreparation(assessment.id),
    buildMedicalChronology(assessment.id),
    prisma.evidenceFile.findMany({
      where: { assessmentId: assessment.id },
      select: { category: true, originalName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appointment.findMany({
      where: { assessmentId: assessment.id },
      select: { status: true, scheduledAt: true, type: true },
      orderBy: { scheduledAt: 'desc' },
    }),
    prisma.insuranceDetail.findMany({
      where: { assessmentId: assessment.id },
      select: { policyLimit: true },
    }),
    prisma.negotiationEvent.findMany({
      where: { assessmentId: assessment.id },
      select: { eventType: true, amount: true, eventDate: true, status: true },
      orderBy: { eventDate: 'desc' },
    }),
    leadId
      ? prisma.leadContact.findFirst({
          where: { leadId },
          select: { createdAt: true, contactType: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve(null),
  ])

  const prediction = assessment.predictions[0]
  const viability = parseJson<Record<string, number>>(prediction?.viability, {})
  const bands = parseJson<{ p25?: number; median?: number; p75?: number }>(prediction?.bands, {})
  const liabilityScore = viability.liability ?? assessment.leadSubmission?.liabilityScore ?? 0.5
  const readinessScore = casePreparation.readinessScore || 0
  const nextUpcomingConsult = appointments.find((item) => item.status === 'SCHEDULED' && new Date(item.scheduledAt) > new Date())
  const latestDemand = negotiationEvents.find((item) => item.eventType === 'demand')?.amount ?? null
  const hasNegotiation = negotiationEvents.length > 0
  const policyLimit = insuranceDetails.reduce<number | null>((max, item) => {
    const limit = item.policyLimit ?? 0
    return limit > (max || 0) ? limit : max
  }, null)
  const stage = buildStage({
    leadStatus: assessment.leadSubmission?.status,
    readinessScore,
    missingCount: casePreparation.missingDocs.length,
    treatmentGapCount: casePreparation.treatmentGaps.length,
    hasNegotiation,
    hasUpcomingConsult: !!nextUpcomingConsult,
  })
  const liabilityStory = buildLiabilityStory(liabilityScore, facts)
  const coverageStory = buildCoverageStory(policyLimit, insuranceDetails.length > 0, latestDemand)
  const negotiationSummary = buildNegotiationSummary({ negotiationEvents, policyLimit })
  const treatmentMonitor = buildTreatmentMonitor({ chronology, treatmentGaps: casePreparation.treatmentGaps })
  const medicalCostBenchmark = buildMedicalCostBenchmarkSummary({
    chronology,
    medCharges: facts?.damages?.med_charges as number | undefined,
  })

  const strengths: CaseCommandCenterListItem[] = casePreparation.strengths.slice(0, 4).map((item) => ({
    title: item,
    detail: 'This point currently helps the attorney’s valuation or liability story.',
    severity: 'low',
  }))
  if ((viability.damages ?? 0) >= 0.7) {
    strengths.unshift({
      title: 'Damages support looks credible',
      detail: 'The current file has enough loss/treatment support to improve the value narrative.',
      severity: 'low',
    })
  }
  if (chronology.length >= 3) {
    strengths.push({
      title: 'Treatment chronology is taking shape',
      detail: `There are ${chronology.length} treatment or record events on file, which helps case storytelling.`,
      severity: 'low',
    })
  }

  const weaknesses: CaseCommandCenterListItem[] = casePreparation.weaknesses.slice(0, 4).map((item) => ({
    title: item,
    detail: 'This issue is currently slowing review, valuation, or case positioning.',
    severity: item.toLowerCase().includes('missing') ? 'high' : 'medium',
  }))

  const defenseRisks: CaseCommandCenterListItem[] = []
  for (const gap of casePreparation.treatmentGaps.slice(0, 2)) {
    defenseRisks.push({
      title: `${summarizeGapDays(gap.gapDays)} treatment gap`,
      detail: `There is a ${gap.gapDays}-day gap between ${gap.startDate} and ${gap.endDate}, which an adjuster may use against causation or damages.`,
      severity: gap.gapDays >= 60 ? 'high' : 'medium',
    })
  }
  if ((facts?.liability?.comparativeNegligence ?? facts?.liability?.comparative_negligence) === true) {
    defenseRisks.push({
      title: 'Comparative fault issue',
      detail: 'The file already suggests a comparative-negligence angle, so liability framing needs to stay careful.',
      severity: 'high',
    })
  }
  if (!evidenceFiles.some((file) => file.category === 'police_report') && ['auto', 'auto_accident', 'slip_and_fall'].includes(assessment.claimType)) {
    defenseRisks.push({
      title: 'No incident report on file',
      detail: 'Without a police or incident report, the defense has more room to challenge how the event happened.',
      severity: 'medium',
    })
  }
  if (!latestContact) {
    defenseRisks.push({
      title: 'Client contact is still thin',
      detail: 'No recent contact activity is logged, which increases the risk of stale facts and slower follow-through.',
      severity: 'medium',
    })
  }

  const missingItems = casePreparation.missingDocs.map((item) => ({
    key: item.key,
    label: item.label,
    priority: item.priority,
    plaintiffReason:
      item.key === 'medical_records'
        ? 'These records help your attorney prove treatment and strengthen the value story.'
        : item.key === 'police_report'
          ? 'This report helps confirm what happened and strengthens early liability review.'
          : item.key === 'bills'
            ? 'These bills help show the financial impact of your injury.'
            : item.key === 'hipaa'
              ? 'This authorization lets your attorney request records directly when needed.'
              : 'This helps your attorney keep the case moving with fewer gaps.',
  }))

  const topMissing = missingItems.slice(0, 3)
  const suggestedDocumentRequest = topMissing.length > 0
    ? {
        requestedDocs: topMissing.map((item) => item.key),
        customMessage: `To keep your case moving, please send ${topMissing.map((item) => item.label.toLowerCase()).join(', ')}. ${topMissing[0]?.plaintiffReason || ''}`.trim(),
      }
    : null

  let nextBestAction: CaseCommandCenter['nextBestAction']
  if (suggestedDocumentRequest) {
    nextBestAction = {
      actionType: 'request_documents',
      title: 'Request the highest-impact missing documents',
      detail: `The file still needs ${topMissing.map((item) => item.label.toLowerCase()).join(', ')} before the value and liability story will read as strongly as it should.`,
    }
  } else if (!nextUpcomingConsult && ['submitted', 'contacted'].includes(assessment.leadSubmission?.status || '')) {
    nextBestAction = {
      actionType: 'schedule_consult',
      title: 'Get the consult on the calendar',
      detail: 'The file is organized enough for the next attorney conversation, and scheduling that touchpoint should keep momentum up.',
    }
  } else if (readinessScore >= 75 && negotiationEvents.length === 0) {
    nextBestAction = {
      actionType: 'prepare_demand',
      title: 'Move the file toward demand preparation',
      detail: 'The case looks organized enough that the next leverage move is to tighten the damages narrative and prepare the demand package.',
    }
  } else if (negotiationEvents.length > 0) {
    nextBestAction = {
      actionType: 'review_negotiation',
      title: 'Review the latest negotiation posture',
      detail: 'There is already negotiation activity on the file, so the next step is responding to the latest offer/risk posture with a cleaner strategy.',
    }
  } else {
    nextBestAction = {
      actionType: 'client_follow_up',
      title: 'Send a focused plaintiff update',
      detail: 'A short, specific client update should keep the file moving and reduce avoidable back-and-forth.',
    }
  }

  const suggestedPlaintiffUpdate = suggestedDocumentRequest
    ? `Your attorney is still strengthening the file before the next major step. The most helpful items right now are ${topMissing.map((item) => item.label.toLowerCase()).join(', ')}.`
    : `${stage.plaintiffTitle}. ${stage.plaintiffDetail}`

  const sources: CaseCommandCenterSource[] = [
    {
      label: 'Readiness score',
      detail: `${readinessScore}/100 readiness from missing documents, treatment continuity, and current file support.`,
    },
    {
      label: 'Treatment chronology',
      detail: chronology.length > 0
        ? `${chronology.length} timeline events are currently on file.`
        : 'No treatment chronology has been built yet.',
    },
    {
      label: 'Evidence on file',
      detail: `${evidenceFiles.length} evidence file${evidenceFiles.length === 1 ? '' : 's'} currently attached to the assessment.`,
    },
    {
      label: 'Coverage posture',
      detail: coverageStory.detail,
    },
    {
      label: 'Negotiation posture',
      detail: negotiationSummary.posture,
    },
    {
      label: 'Treatment monitor',
      detail: `${treatmentMonitor.status}. ${treatmentMonitor.recommendedAction}`,
    },
    {
      label: 'Medical cost benchmark',
      detail: medicalCostBenchmark.detail,
    },
  ]

  const summary: CaseCommandCenter = {
    assessmentId: assessment.id,
    leadId,
    stage,
    readiness: {
      score: readinessScore,
      label: buildReadinessLabel(readinessScore),
      detail: readinessScore >= 75
        ? 'The file is organized enough for deeper attorney work and fewer basic blockers remain.'
        : 'The file still needs a few substantive items before it will present cleanly for demand or negotiation work.',
    },
    valueStory: {
      median: bands.median ?? 0,
      low: bands.p25 ?? 0,
      high: bands.p75 ?? 0,
      detail: bands.median
        ? `The current modeled value centers on ${formatCurrencyCompact(bands.median)} and will improve most if the remaining blockers are closed.`
        : 'The file still needs stronger support before modeled value will feel reliable.',
    },
    liabilityStory,
    coverageStory,
    negotiationSummary,
    treatmentMonitor,
    medicalCostBenchmark,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    defenseRisks: defenseRisks.slice(0, 4),
    missingItems,
    nextBestAction,
    suggestedDocumentRequest,
    suggestedPlaintiffUpdate,
    copilot: {
      suggestedPrompts: [
        'What is still missing before this case is demand-ready?',
        'What would the adjuster attack first?',
        'What should I do on the negotiation side next?',
        'What is the treatment or provider risk right now?',
        'Draft a plaintiff update based on the current blockers.',
        'Explain the current value story in plain English.',
      ],
      evidenceContext: sources,
    },
    sources,
  }

  return summary
}
