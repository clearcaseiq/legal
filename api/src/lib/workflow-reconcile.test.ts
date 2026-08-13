import { describe, expect, it } from 'vitest'
import {
  WORKFLOW_RECONCILE_RULES,
  taskBelongsToWorkflowItem,
  tasksRelatedToWorkflowItem,
} from './workflow-reconcile'

function decide(title: string, flags: Record<string, boolean>) {
  const rule = WORKFLOW_RECONCILE_RULES.find((r) => r.match(title))
  if (!rule) return null
  const ctx = {
    assessmentId: 'x',
    evidenceCategories: new Set<string>(),
    signedRetainer: false,
    sentRetainer: false,
    claimOpened: false,
    hasPhotos: false,
    hasMedicalRecords: false,
    hasMedicalBills: false,
    hasPoliceReport: false,
    medicalSpecialsOnFile: false,
    conflictCleared: false,
    welcomeSent: false,
    hasHipaa: false,
    ...flags,
  }
  return rule.satisfied(ctx as any) ? rule.id : null
}

describe('workflow reconcile rules', () => {
  it('completes open-insurance-claim when a claim number is on file', () => {
    expect(decide('Open insurance claims (liability + UM/UIM)', { claimOpened: true })).toBe(
      'open_insurance_claim',
    )
    expect(decide('Open insurance claims (liability + UM/UIM)', { claimOpened: false })).toBeNull()
  })

  it('completes police-report request when the report is on file', () => {
    expect(decide('Request police / incident report', { hasPoliceReport: true })).toBe('police_report')
  })

  it('completes retainer confirm only when signed', () => {
    expect(decide('Confirm signed representation agreement', { sentRetainer: true })).toBeNull()
    expect(decide('Confirm signed representation agreement', { signedRetainer: true })).toBe(
      'confirm_retainer',
    )
  })

  it('leaves judgment steps alone for case-data reconcile', () => {
    expect(decide('Send letters of representation to providers', { claimOpened: true })).toBeNull()
    expect(decide('Draft demand letter', { hasMedicalRecords: true, hasMedicalBills: true })).toBeNull()
  })
})

describe('task ↔ workflow step ownership', () => {
  const policeStep = { id: 'wf-police', title: 'Request police / incident report' }

  it('links coach / day-1 variants of the same work to the workflow step', () => {
    expect(
      taskBelongsToWorkflowItem(policeStep, {
        id: 't1',
        title: 'Collect Police/incident report',
        status: 'done',
      }),
    ).toBe(true)
    expect(
      taskBelongsToWorkflowItem(policeStep, {
        id: 't2',
        title: 'Secure police report from agency',
        status: 'open',
      }),
    ).toBe(true)
  })

  it('links by wfitem: sourceTemplateStepId', () => {
    expect(
      taskBelongsToWorkflowItem(policeStep, {
        id: 't3',
        title: 'Something else',
        status: 'open',
        sourceTemplateStepId: 'wfitem:wf-police',
      }),
    ).toBe(true)
  })

  it('does not collapse unrelated work onto the step', () => {
    expect(
      taskBelongsToWorkflowItem(policeStep, {
        id: 't4',
        title: 'Draft demand letter',
        status: 'done',
      }),
    ).toBe(false)
  })

  it('keeps send-retainer and confirm-retainer as separate families', () => {
    const send = { id: 'wf-send', title: 'Send retainer to client' }
    const confirm = { id: 'wf-confirm', title: 'Confirm signed representation agreement' }
    expect(
      taskBelongsToWorkflowItem(send, { id: 'a', title: 'Send retainer to client', status: 'done' }),
    ).toBe(true)
    expect(
      taskBelongsToWorkflowItem(send, {
        id: 'b',
        title: 'Confirm signed representation agreement',
        status: 'done',
      }),
    ).toBe(false)
    expect(
      taskBelongsToWorkflowItem(confirm, {
        id: 'c',
        title: 'Confirm signed retainer agreement',
        status: 'done',
      }),
    ).toBe(true)
  })

  it('collects every related task for a step', () => {
    const related = tasksRelatedToWorkflowItem(policeStep, [
      { id: '1', title: 'Collect Police/incident report', status: 'done' },
      { id: '2', title: 'Request police / incident report', status: 'open' },
      { id: '3', title: 'Draft demand letter', status: 'open' },
    ])
    expect(related.map((t) => t.id).sort()).toEqual(['1', '2'])
  })

  it('links obtain/collect medical records tasks to the records workflow step', () => {
    const recordsStep = { id: 'wf-med', title: 'Obtain medical records' }
    expect(
      taskBelongsToWorkflowItem(recordsStep, {
        id: 'a',
        title: 'Collect medical records',
        status: 'open',
      }),
    ).toBe(true)
    expect(
      taskBelongsToWorkflowItem(recordsStep, {
        id: 'b',
        title: 'Collect medical bills',
        status: 'open',
      }),
    ).toBe(false)
  })
})
