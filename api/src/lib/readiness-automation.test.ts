import { describe, expect, it } from 'vitest'
import { buildReadinessAutomationPlan } from './readiness-automation'
import type { CaseCommandCenter } from './case-command-center'

function buildSummary(overrides: Partial<CaseCommandCenter> = {}): CaseCommandCenter {
  return {
    assessmentId: 'asm-1',
    leadId: 'lead-1',
    stage: {
      key: 'file_strengthening',
      title: 'File strengthening',
      detail: 'detail',
      plaintiffTitle: 'title',
      plaintiffDetail: 'detail',
      progressPercent: 42,
    },
    readiness: {
      score: 55,
      label: 'Needs file strengthening',
      detail: 'Readiness detail',
    },
    valueStory: {
      median: 10000,
      low: 5000,
      high: 15000,
      detail: 'Value detail',
    },
    liabilityStory: {
      label: 'Mixed',
      detail: 'Liability detail',
    },
    coverageStory: {
      label: 'Coverage identified',
      detail: 'Coverage detail',
      policyLimit: 25000,
    },
    negotiationSummary: {
      eventCount: 0,
      latestEventType: null,
      latestStatus: null,
      latestEventDate: null,
      latestDemand: null,
      latestOffer: null,
      gapToDemand: null,
      posture: 'No negotiation posture yet',
      recommendedMove: 'Finish blockers first.',
    },
    treatmentMonitor: {
      chronologyCount: 1,
      providerCount: 1,
      providers: ['ER'],
      latestTreatmentDate: '2026-04-01',
      largestGapDays: 0,
      status: 'Treatment flow is still thin',
      recommendedAction: 'Pull records.',
    },
    strengths: [],
    weaknesses: [],
    defenseRisks: [],
    missingItems: [],
    nextBestAction: {
      actionType: 'client_follow_up',
      title: 'Send update',
      detail: 'Keep the file moving.',
    },
    suggestedDocumentRequest: null,
    suggestedPlaintiffUpdate: 'Update',
    copilot: {
      suggestedPrompts: [],
      evidenceContext: [],
    },
    sources: [],
    ...overrides,
  }
}

describe('buildReadinessAutomationPlan', () => {
  it('creates blocker tasks and reminders for missing documents and treatment gaps', () => {
    const plan = buildReadinessAutomationPlan(buildSummary({
      missingItems: [
        {
          key: 'medical_records',
          label: 'Medical records',
          priority: 'high',
          plaintiffReason: 'Needed for damages.',
        },
      ],
      treatmentMonitor: {
        chronologyCount: 2,
        providerCount: 1,
        providers: ['PT'],
        latestTreatmentDate: '2026-04-03',
        largestGapDays: 61,
        status: 'Treatment continuity risk: 61-day gap',
        recommendedAction: 'Close the continuity story.',
      },
      nextBestAction: {
        actionType: 'request_documents',
        title: 'Request missing docs',
        detail: 'Medical records are still needed.',
      },
    }))

    expect(plan.tasks.map((item) => item.title)).toContain('Collect Medical records')
    expect(plan.tasks.map((item) => item.title)).toContain('Resolve treatment continuity gap')
    expect(plan.reminders.map((item) => item.category)).toEqual(['missing_docs', 'treatment_gap'])
  })

  it('creates negotiation and demand tasks when the file is ready enough', () => {
    const plan = buildReadinessAutomationPlan(buildSummary({
      readiness: {
        score: 89,
        label: 'Demand-ready',
        detail: 'Ready for demand.',
      },
      nextBestAction: {
        actionType: 'prepare_demand',
        title: 'Prepare demand',
        detail: 'Move into drafting.',
      },
      negotiationSummary: {
        eventCount: 2,
        latestEventType: 'offer',
        latestStatus: 'open',
        latestEventDate: '2026-04-08T00:00:00.000Z',
        latestDemand: 85000,
        latestOffer: 42000,
        gapToDemand: 43000,
        posture: 'Carrier offer logged.',
        recommendedMove: 'Counter with updated support.',
      },
    }))

    expect(plan.tasks.map((item) => item.title)).toContain('Review negotiation posture')
    expect(plan.tasks.map((item) => item.title)).toContain('Move file into demand drafting')
    expect(plan.reminders.map((item) => item.category)).toContain('negotiation')
    expect(plan.reminders.map((item) => item.category)).toContain('demand_ready')
  })
})
