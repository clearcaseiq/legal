import { describe, expect, it } from 'vitest'
import { resolveTaskPrimaryAction, sectionForTaskAction } from './taskPrimaryActions'

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
