import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const getClientPortalStatus = vi.fn()
const inviteClientToPortal = vi.fn()
vi.mock('../../lib/api', () => ({
  getClientPortalStatus: (...a: unknown[]) => getClientPortalStatus(...a),
  inviteClientToPortal: (...a: unknown[]) => inviteClientToPortal(...a),
}))

import ClientPortalInvite from './ClientPortalInvite'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const base = {
  state: 'not_invited',
  email: 'dana@example.com',
  hasAccount: false,
  inviteCount: 0,
  lastInvitedAt: null,
  nextInviteAt: null,
  limitReached: false,
  inviteLink: 'https://app.test/register?claim=t',
}

let container: HTMLDivElement
let root: Root | null = null

beforeEach(() => {
  vi.clearAllMocks()
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

async function render(props: { savedEmail?: string; dirty?: boolean } = {}) {
  await act(async () => {
    root ??= createRoot(container)
    root.render(<ClientPortalInvite leadId="lead-1" savedEmail={props.savedEmail ?? 'dana@example.com'} dirty={props.dirty ?? false} />)
  })
}

const button = (label: string) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined

describe('ClientPortalInvite', () => {
  it('invites a client who is not on the platform', async () => {
    getClientPortalStatus.mockResolvedValue(base)
    inviteClientToPortal.mockResolvedValue({
      ...base,
      state: 'invited',
      inviteCount: 1,
      lastInvitedAt: new Date().toISOString(),
      nextInviteAt: new Date(Date.now() + 86_400_000).toISOString(),
    })
    await render()

    await act(async () => button('Invite client')!.click())
    expect(inviteClientToPortal).toHaveBeenCalledWith('lead-1')
    expect(container.textContent).toContain('Invite sent to dana@example.com.')
    expect(button('Resend invite')!.disabled).toBe(true)
  })

  it('will not send while the email is unsaved or missing', async () => {
    getClientPortalStatus.mockResolvedValue(base)
    await render({ dirty: true })
    expect(button('Invite client')!.disabled).toBe(true)
    expect(container.textContent).toContain('Save your changes first')

    getClientPortalStatus.mockResolvedValue({ ...base, email: null })
    await render({ savedEmail: '' })
    expect(container.textContent).toContain('Add the client’s email below first')
  })

  it('shows that an active client needs no invite', async () => {
    getClientPortalStatus.mockResolvedValue({ ...base, state: 'active', inviteLink: null })
    await render()
    expect(container.textContent).toContain('Client is on ClearCaseIQ')
    expect(container.querySelector('button')).toBeNull()
  })
})
