import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))

import {
  activeWorkflowSlot,
  buildWorkflowCatalog,
  inferWorkflowCategoryForTask,
} from './workflow-step-tasks'

const item = (phaseName: string, phaseOrder: number, stageName: string, stageOrder: number, status = 'pending') => ({
  phaseName,
  phaseOrder,
  stageName,
  stageOrder,
  status,
  stepType: 'task',
})

const standardPi = [
  item('Intake & Setup', 0, 'Case Opening', 0, 'completed'),
  item('Intake & Setup', 0, 'Records & Claims', 1),
  item('Treatment & Investigation', 1, 'Medical Treatment', 2),
  item('Treatment & Investigation', 1, 'Evidence & Records', 3),
  item('Demand Preparation', 2, 'Demand Package', 4),
  item('Negotiation', 3, 'Negotiation', 5),
  item('Settlement & Closing', 4, 'Settlement', 6),
]

// A firm's med-mal workflow that names its phases differently.
const medMal = [
  item('Onboarding', 0, 'Client Engagement', 0, 'completed'),
  item('Expert Review', 1, 'Chart Review', 1),
  item('Expert Review', 1, 'Certificate of Merit', 2),
  item('Pre-Suit', 2, 'Notice of Intent', 3),
  item('Resolution', 3, 'Payout', 4),
]

const place = (items: any[], task: Record<string, string>) => {
  const r = inferWorkflowCategoryForTask(task, buildWorkflowCatalog(items), activeWorkflowSlot(items))
  return r ? `${r.phaseName} / ${r.stageName}` : null
}

describe('inferWorkflowCategoryForTask', () => {
  it('routes tasks into the matching stage of the standard PI workflow', () => {
    expect(place(standardPi, { title: 'Send retainer agreement', taskType: 'general' })).toBe(
      'Intake & Setup / Case Opening',
    )
    expect(place(standardPi, { title: 'Call adjuster about coverage', taskType: 'general' })).toBe(
      'Intake & Setup / Records & Claims',
    )
    expect(place(standardPi, { title: 'Follow up on physical therapy appointment', taskType: 'general' })).toBe(
      'Treatment & Investigation / Medical Treatment',
    )
    expect(place(standardPi, { title: 'Get witness statements', taskType: 'general' })).toBe(
      'Treatment & Investigation / Evidence & Records',
    )
    expect(place(standardPi, { title: 'Draft demand letter', taskType: 'general' })).toBe(
      'Demand Preparation / Demand Package',
    )
    expect(place(standardPi, { title: 'Respond to counter-offer', taskType: 'general' })).toBe(
      'Negotiation / Negotiation',
    )
    expect(place(standardPi, { title: 'Prepare closing statement', taskType: 'general' })).toBe(
      'Settlement & Closing / Settlement',
    )
  })

  it('never invents phases for a case type whose workflow uses different names', () => {
    const phases = new Set(medMal.map((i) => i.phaseName))
    for (const title of [
      'Send retainer agreement',
      'Request medical records',
      'Draft demand letter',
      'Respond to counter-offer',
      'Schedule deposition',
      'Prepare closing statement',
      'Something with no keywords',
    ]) {
      const r = place(medMal, { title, taskType: 'general' })
      expect(r, title).not.toBeNull()
      expect(phases.has(r!.split(' / ')[0]), `${title} -> ${r}`).toBe(true)
    }
    expect(place(medMal, { title: 'Send retainer agreement', taskType: 'general' })).toBe(
      'Onboarding / Client Engagement',
    )
    expect(place(medMal, { title: 'Prepare closing statement', taskType: 'general' })).toBe('Resolution / Payout')
  })

  it('files tasks with no category under the stage the case is currently in', () => {
    expect(place(standardPi, { title: 'Misc follow-up', taskType: 'general' })).toBe(
      'Intake & Setup / Records & Claims',
    )
  })

  it('does not treat a medical records release as settlement work', () => {
    expect(place(standardPi, { title: 'Sign medical records release', taskType: 'general' })).toBe(
      'Treatment & Investigation / Medical Treatment',
    )
  })

  it('uses the standard pipeline names when the case has no workflow', () => {
    expect(place([], { title: 'Draft demand letter', taskType: 'general' })).toBe(
      'Demand Preparation / Demand Package',
    )
    expect(place([], { title: 'Misc follow-up', taskType: 'general' })).toBeNull()
  })

  it('leaves workflow-linked tasks to their own step', () => {
    expect(place(standardPi, { title: 'Draft demand', sourceTemplateStepId: 'wfitem:abc' })).toBeNull()
  })
})
