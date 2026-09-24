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
})
