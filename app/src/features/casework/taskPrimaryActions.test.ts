import { describe, expect, it } from 'vitest'
import { resolveTaskHelpTooltip, resolveTaskPrimaryAction, sectionForTaskAction } from './taskPrimaryActions'

describe('resolveTaskPrimaryAction', () => {
  it('opens the Client Info tab for the verify-contact task', () => {
    const action = resolveTaskPrimaryAction({ title: 'Verify client contact information', taskType: 'client' })
    expect(action?.kind).toBe('open_client_info')
    expect(sectionForTaskAction(action!.kind)).toBe('client-info')
  })

  it('does not read "client" as a lien', () => {
    expect(resolveTaskPrimaryAction({ title: 'Client follow-up call' })?.kind).toBe('open_overview')
    expect(resolveTaskPrimaryAction({ title: 'Resolve medical liens' })?.kind).toBe('open_insurance')
  })

  it('keeps other client tasks on Overview', () => {
    const action = resolveTaskPrimaryAction({ title: 'Confirm scope of representation', taskType: 'client' })
    expect(action?.kind).toBe('open_overview')
  })

  it.each([undefined, 'evidence', 'liability', 'general', 'insurance'])(
    'opens Insurance for confirming the defendant carrier and claim number (type %s)',
    (taskType) => {
      const action = resolveTaskPrimaryAction({
        title: 'Confirm defendant insurance carrier / claim number',
        taskType,
      })
      expect(action?.kind).toBe('open_insurance')
      expect(sectionForTaskAction(action!.kind)).toBe('insurance')
    },
  )

  it.each(['Request Dec Page from State Farm', 'Request declarations page from Zion'])(
    'opens Insurance for "%s"',
    (title) => {
      const action = resolveTaskPrimaryAction({ title, taskType: 'general' })
      expect(action?.kind).toBe('open_insurance')
    },
  )

  it('sends the carrier letter from the Insurance tab', () => {
    const action = resolveTaskPrimaryAction({ title: 'Send Letter of Representation (LOR)' })
    expect(action?.kind).toBe('send_lor')
    expect(sectionForTaskAction(action!.kind)).toBe('insurance?letter=1')
  })

  it('sends provider letters from the Medical tab', () => {
    const action = resolveTaskPrimaryAction({ title: 'Send letters of representation to providers' })
    expect(action?.kind).toBe('send_lor_providers')
    expect(sectionForTaskAction(action!.kind)).toBe('medical?letter=1')
  })
})

describe('resolveTaskHelpTooltip', () => {
  const generatedTitles = [
    'Open matter & run conflict check',
    'Send retainer to client',
    'Confirm signed representation agreement',
    'Send client welcome packet',
    'Request police / incident report',
    'Send letters of representation to providers',
    'Open insurance claims (liability + UM/UIM)',
    'Monitor ongoing treatment',
    'Treatment complete / MMI reached',
    'Gather photos, witness statements & scene evidence',
    'All medical records & bills received',
    'Compile special damages summary',
    'Draft demand letter',
    'Attorney review & approve demand',
    'Demand sent to carrier',
    'Adjuster offer received',
    'Evaluate offer vs. case value',
    'Counter & negotiate',
    'Client approval of settlement terms',
    'Settlement reached',
    'Execute release & settlement documents',
    'Resolve medical liens',
    'Disburse & send client closing statement',
    'Close matter',
    'Collect Wage verification',
    'Resolve treatment continuity gap',
    'Confirm current treatment status with client',
    'Review negotiation posture',
    'Move file into demand drafting',
    "Confirm the client's own coverage (UM/UIM, PIP/MedPay)",
    'Contact the client about the treatment gap',
    'Open the lien / subrogation investigation',
    'Document future treatment / life-care costs',
    'Confirm defendant insurance carrier / claim number',
    'Request Dec Page from State Farm',
    'Something the attorney typed by hand',
  ]

  it.each(generatedTitles)('has help copy for "%s"', (title) => {
    expect(resolveTaskHelpTooltip({ title })?.length).toBeGreaterThan(20)
  })

  it('uses the task notes when no specific copy exists', () => {
    const help = resolveTaskHelpTooltip({
      title: 'Call Dr. Lee',
      notes: 'Ask the office for the updated narrative report before Friday.',
    })
    expect(help).toBe('Ask the office for the updated narrative report before Friday.')
  })

  it('returns nothing for an untitled task', () => {
    expect(resolveTaskHelpTooltip({ title: '  ' })).toBeNull()
  })
})
