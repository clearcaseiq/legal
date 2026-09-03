/**
 * The Users & Roles screen listed every account on the platform — plaintiffs and
 * outside attorneys next to the handful of people who work here — so the screen
 * meant for managing ClearCaseIQ staff was mostly other people's records.
 *
 * It now opens scoped to employees. `admin` is the only role that means an
 * employee: `staff` is law-firm staff despite the name, which is the ambiguity
 * that made the unscoped list hard to read in the first place.
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
  it('asks for admins only on first load', async () => {
    await mount()

    expect(getAdminUsers).toHaveBeenCalled()
    const [params] = vi.mocked(getAdminUsers).mock.calls[0]
    expect(params?.role).toBe('admin')
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
