/**
 * The Users & Roles screen listed every account on the platform — plaintiffs and
 * outside attorneys next to the handful of people who work here — so the screen
 * meant for managing ClearCaseIQ staff was mostly other people's records.
 *
 * It now opens scoped to employees. `admin` and `specialist` are the roles that
 * mean an employee: `staff` is law-firm staff despite the name, which is the
 * ambiguity that made the unscoped list hard to read in the first place.
 *
 * The widening path is load-bearing rather than a convenience. This screen is
 * the only place a client account can be deactivated — attorneys can also be
 * switched off from the attorney admin screen, but plaintiffs have no second
 * route — so if "All roles" ever stops reaching every account, that ability is
 * gone with it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { getAdminUsers } from '../lib/api'
import AdminUserRoles from './AdminUserRoles'

vi.mock('../lib/api', () => ({
  getAdminUsers: vi.fn(async () => ({ data: [], total: 0 })),
  createAdminUser: vi.fn(),
  updateAdminUserCapabilities: vi.fn(),
  updateAdminUserRole: vi.fn(),
  updateAdminUserStatus: vi.fn(),
}))

vi.mock('../lib/auth', () => ({
  getAdminLoginPath: vi.fn(() => '/admin/login'),
  isAdminAuthError: vi.fn(() => false),
}))

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// jsdom has no ResizeObserver, and the data table measures itself to decide
// whether to show a scroll affordance. Only rendered rows reach that effect,
// which is why the scoping tests above never needed the stub.
if (!(globalThis as any).ResizeObserver) {
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.clearAllMocks()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function mount() {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <AdminUserRoles />
      </MemoryRouter>,
    )
  })
}

/** The role filter, which is the only select rendered outside a table row. */
function roleSelect(): HTMLSelectElement {
  const select = container.querySelector<HTMLSelectElement>('select[aria-label="Filter by role"]')
  if (!select) throw new Error('role filter not rendered')
  return select
}

function lastCallParams() {
  const calls = vi.mocked(getAdminUsers).mock.calls
  return calls[calls.length - 1]?.[0]
}

async function selectRole(value: string) {
  const select = roleSelect()
  await act(async () => {
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('Users & Roles scoping', () => {
  it('asks for every employee role on first load', async () => {
    await mount()

    expect(getAdminUsers).toHaveBeenCalled()
    const [params] = vi.mocked(getAdminUsers).mock.calls[0]
    // Case Specialists are employees too. When this filter was a single role,
    // adding the specialist role would have quietly hidden every one of them
    // from the screen that manages employees.
    expect(params?.role?.split(',').sort()).toEqual(['admin', 'specialist'])
  })

  it('keeps specialists reachable as their own filter', async () => {
    await mount()
    await selectRole('specialist')

    expect(lastCallParams()?.role).toBe('specialist')
  })

  it('offers a widening option that sends no role at all', async () => {
    await mount()

    const values = Array.from(roleSelect().options).map((option) => option.value)
    // The empty value is what the API client omits from the query string, so it
    // is the one option that returns every account rather than a single role.
    expect(values).toContain('')

    await selectRole('')

    expect(lastCallParams()?.role).toBeUndefined()
  })

  it('can still reach client accounts, the only place they can be deactivated', async () => {
    await mount()
    await selectRole('client')

    expect(lastCallParams()?.role).toBe('client')
  })

  it('names firm staff as external rather than labelling them plain "staff"', async () => {
    await mount()

    const staff = Array.from(roleSelect().options).find((option) => option.value === 'staff')
    expect(staff?.textContent).toMatch(/firm/i)
  })
})

/**
 * Firm staff are a User *and* a FirmMember tied to a lawFirmId, which only the
 * firm's own team screen creates. Granting or minting the bare role here left an
 * account that passed the Firm Staff login and then belonged to no firm, so the
 * role is readable from this screen but no longer assignable.
 */
describe('firm staff are not assignable from the admin screen', () => {
  const account = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'u1',
    email: 'someone@example.com',
    firstName: 'Some',
    lastName: 'One',
    role: 'client',
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    ...over,
  })

  async function mountWith(users: ReturnType<typeof account>[]) {
    vi.mocked(getAdminUsers).mockResolvedValue({ data: users, total: users.length } as any)
    await mount()
  }

  function rowRoleSelect(email: string): HTMLSelectElement {
    const select = container.querySelector<HTMLSelectElement>(`select[aria-label="Role for ${email}"]`)
    if (!select) throw new Error(`no role select rendered for ${email}`)
    return select
  }

  it('leaves firm staff out of the roles a row can be switched to', async () => {
    await mountWith([account()])

    const values = Array.from(rowRoleSelect('someone@example.com').options)
      .filter((option) => !option.disabled)
      .map((option) => option.value)
    expect(values).not.toContain('staff')
    // The roles that do have something behind them stay reachable.
    expect(values).toEqual(expect.arrayContaining(['client', 'attorney', 'admin', 'specialist']))
  })

  it('still shows an existing firm staffer their own role rather than the first option', async () => {
    await mountWith([account({ id: 's1', email: 'para@firm.com', role: 'staff' })])

    const select = rowRoleSelect('para@firm.com')
    // A select whose value matches no option falls back to displaying the first
    // one, which here would read "client" — and put a paralegal one stray click
    // from becoming one.
    expect(select.value).toBe('staff')
    const own = Array.from(select.options).find((option) => option.value === 'staff')
    expect(own?.disabled).toBe(true)
    expect(own?.textContent).toMatch(/firm/i)
  })

  it('offers only ClearCaseIQ roles when adding a team member', async () => {
    await mountWith([])

    const addButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Add user',
    )
    if (!addButton) throw new Error('Add user button not rendered')
    await act(async () => {
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // The draft form's role select is the only one with no aria-label: the
    // filter and each row carry one.
    const draft = Array.from(container.querySelectorAll('select')).find(
      (select) => !select.getAttribute('aria-label'),
    )
    if (!draft) throw new Error('draft role select not rendered')
    const values = Array.from(draft.options).map((option) => option.value)
    expect(values).toEqual(['admin', 'specialist'])
    // Defaulting to a role that cannot be created would fail on submit.
    expect(values).toContain(draft.value)
  })
})
