import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createAdminUser,
  getAdminUsers,
  updateAdminUserCapabilities,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '../lib/api'
import { getAdminLoginPath, isAdminAuthError } from '../lib/auth'
import {
  ADMIN_CAPABILITIES,
  ADMIN_CAPABILITY_LABELS,
  type AdminCapability,
} from '../lib/adminCapabilities'
import {
  Avatar,
  Badge,
  DataTable,
  PageHeader,
  Pagination,
  SectionCard,
  type DataTableColumn,
} from '../features/shared/ui'

interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  createdAt: string
  capabilities?: AdminCapability[]
}

const ROLE_OPTIONS = ['client', 'attorney', 'staff', 'admin']
// Clients sign themselves up and attorneys register a firm, so neither can be
// created from here without leaving an account with nothing behind it.
const CREATABLE_ROLES = ['staff', 'admin'] as const
const DEFAULT_LIMIT = 50

// `admin` is the only role that means someone who works at ClearCaseIQ. `staff`
// reads as though it does, but it is law-firm staff — the "Firm Staff Login"
// screen signs them in — so it sits with the other external roles here.
//
// Spelled out rather than derived from ROLE_OPTIONS because the bare role names
// are what caused the confusion: this screen listed every account on the
// platform, and "staff" gave no hint that those people work somewhere else.
const EMPLOYEE_ROLE = 'admin'
const ROLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: EMPLOYEE_ROLE, label: 'ClearCaseIQ employees' },
  { value: '', label: 'All roles' },
  { value: 'client', label: 'Clients' },
  { value: 'attorney', label: 'Attorneys' },
  { value: 'staff', label: 'Firm staff' },
]

const EMPTY_DRAFT = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'staff' as (typeof CREATABLE_ROLES)[number],
  capabilities: [...ADMIN_CAPABILITIES] as AdminCapability[],
}

export default function AdminUserRoles() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  // Opens on ClearCaseIQ's own people. Widening to "All roles" stays one click
  // away because this screen is the only way to deactivate a client account.
  const [roleFilter, setRoleFilter] = useState(EMPLOYEE_ROLE)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim())
      setOffset(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminUsers({
        limit,
        offset,
        search: appliedSearch || undefined,
        role: roleFilter || undefined,
      })
      setUsers(data.data || [])
      setTotal(data.total ?? (data.data?.length || 0))
    } catch (err: any) {
      if (isAdminAuthError(err)) {
        navigate(getAdminLoginPath('/admin/users'), { replace: true })
        return
      }
      setError(err.response?.data?.error || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [limit, offset, appliedSearch, roleFilter, navigate])

  useEffect(() => {
    load()
  }, [load])

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      setSavingId(userId)
      const updated = await updateAdminUserRole(
        userId,
        role,
        role === 'admin' ? [...ADMIN_CAPABILITIES] : undefined,
      )
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: updated.data.role,
                capabilities: updated.data.capabilities || user.capabilities,
              }
            : user,
        ),
      )
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role')
    } finally {
      setSavingId(null)
    }
  }

  const handleCapabilityToggle = async (user: AdminUser, capability: AdminCapability) => {
    if (user.role !== 'admin') return
    const current = new Set(user.capabilities?.length ? user.capabilities : [...ADMIN_CAPABILITIES])
    if (current.has(capability)) current.delete(capability)
    else current.add(capability)
    const next = ADMIN_CAPABILITIES.filter((cap) => current.has(cap))
    if (next.length === 0) {
      setError('Admins need at least one capability')
      return
    }
    try {
      setSavingId(user.id)
      setError(null)
      const updated = await updateAdminUserCapabilities(user.id, next)
      setUsers((prev) =>
        prev.map((row) =>
          row.id === user.id
            ? { ...row, capabilities: updated.data.capabilities || next }
            : row,
        ),
      )
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update capabilities')
    } finally {
      setSavingId(null)
    }
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setCreating(true)
      setError(null)
      setNotice(null)
      const result = await createAdminUser({
        email: draft.email.trim(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        role: draft.role,
        capabilities: draft.role === 'admin' ? draft.capabilities : undefined,
      })
      setShowAdd(false)
      setDraft(EMPTY_DRAFT)
      // The account exists whether or not the email left the building, so say
      // which happened rather than implying an invite is on its way.
      setNotice(
        result.inviteSent
          ? `Invited ${result.data.email}. They have 72 hours to set a password.`
          : `Created ${result.data.email}, but the invite email could not be sent. They can use "Forgot password" to set one.`,
      )
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleStatusToggle = async (user: AdminUser) => {
    const next = !user.isActive
    if (
      !next &&
      !window.confirm(
        `Deactivate ${user.email}? They will be signed out on their next request and cannot log back in. Their history is kept.`,
      )
    ) {
      return
    }
    try {
      setSavingId(user.id)
      setError(null)
      setNotice(null)
      const updated = await updateAdminUserStatus(user.id, next)
      setUsers((prev) =>
        prev.map((row) => (row.id === user.id ? { ...row, isActive: updated.data.isActive } : row)),
      )
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status')
    } finally {
      setSavingId(null)
    }
  }

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (user) => {
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim()
        return (
          <div className="flex items-center gap-3">
            <Avatar name={name || user.email} />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                {name || 'Unnamed user'}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'role',
      header: 'Role',
      cell: (user) => (
        <select
          value={user.role}
          onChange={(e) => handleRoleChange(user.id, e.target.value)}
          disabled={savingId === user.id}
          aria-label={`Role for ${user.email}`}
          className="input w-40 capitalize"
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'capabilities',
      header: 'Admin capabilities',
      cell: (user) => {
        if (user.role !== 'admin') {
          return <span className="text-xs text-slate-400">—</span>
        }
        const active = new Set(user.capabilities?.length ? user.capabilities : [...ADMIN_CAPABILITIES])
        return (
          <div className="flex max-w-md flex-wrap gap-1.5">
            {ADMIN_CAPABILITIES.map((cap) => (
              <button
                key={cap}
                type="button"
                disabled={savingId === user.id}
                onClick={() => handleCapabilityToggle(user, cap)}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                title={`Toggle ${ADMIN_CAPABILITY_LABELS[cap]}`}
              >
                <Badge tone={active.has(cap) ? 'success' : 'neutral'}>
                  {ADMIN_CAPABILITY_LABELS[cap]}
                </Badge>
              </button>
            ))}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (user) => (
        <Badge tone={user.isActive ? 'success' : 'neutral'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (user) => (
        <button
          type="button"
          disabled={savingId === user.id}
          onClick={() => handleStatusToggle(user)}
          className={user.isActive ? 'btn-outline text-ui-sm' : 'btn-primary text-ui-sm'}
        >
          {user.isActive ? 'Deactivate' : 'Reactivate'}
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & role management"
        description="Grant platform roles and scope admin capabilities (ops, network, oversight, config, users). Allowlisted ADMIN_EMAILS accounts always keep full access."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAdd((open) => !open)
                setError(null)
                setNotice(null)
              }}
              className="btn-primary text-ui-sm"
            >
              {showAdd ? 'Cancel' : 'Add user'}
            </button>
            <button type="button" onClick={() => navigate('/admin')} className="btn-outline text-ui-sm">
              Back to dashboard
            </button>
          </div>
        }
      />

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {showAdd && (
        <SectionCard title="Add a team member">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">First name</span>
                <input
                  className="input w-full"
                  required
                  value={draft.firstName}
                  onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Last name</span>
                <input
                  className="input w-full"
                  required
                  value={draft.lastName}
                  onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Work email</span>
                <input
                  className="input w-full"
                  type="email"
                  required
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Role</span>
                <select
                  className="input w-full capitalize"
                  value={draft.role}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, role: e.target.value as (typeof CREATABLE_ROLES)[number] }))
                  }
                >
                  {CREATABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {draft.role === 'admin' && (
              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Admin capabilities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ADMIN_CAPABILITIES.map((cap) => {
                    const on = draft.capabilities.includes(cap)
                    return (
                      <button
                        key={cap}
                        type="button"
                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            capabilities: on
                              ? d.capabilities.filter((c) => c !== cap)
                              : ADMIN_CAPABILITIES.filter((c) => c === cap || d.capabilities.includes(c)),
                          }))
                        }
                      >
                        <Badge tone={on ? 'success' : 'neutral'}>{ADMIN_CAPABILITY_LABELS[cap]}</Badge>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="btn-primary text-ui-sm"
                disabled={creating || (draft.role === 'admin' && draft.capabilities.length === 0)}
              >
                {creating ? 'Sending invite…' : 'Send invite'}
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                They receive a link to set their own password. No password is set here.
              </p>
            </div>
          </form>
        </SectionCard>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <SectionCard
        title={
          roleFilter === EMPLOYEE_ROLE
            ? `${total.toLocaleString()} ClearCaseIQ employee${total === 1 ? '' : 's'}`
            : `${total.toLocaleString()} user${total === 1 ? '' : 's'}`
        }
        trailing={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="Filter by role"
            >
              {ROLE_FILTER_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="input w-full sm:w-64"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(user) => user.id}
          loading={loading}
          loadingMessage="Loading users…"
          emptyMessage={
            // Searching a plaintiff's address while scoped to employees finds
            // nothing, which reads as "no such account" rather than "not in this
            // filter". Say which it is.
            roleFilter === EMPLOYEE_ROLE
              ? appliedSearch
                ? 'No ClearCaseIQ employee matches your search. Choose "All roles" to search every account.'
                : 'No ClearCaseIQ employees found.'
              : appliedSearch
                ? 'No users match your search.'
                : 'No users found.'
          }
        />

        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          disabled={loading}
          onChange={setOffset}
          onLimitChange={(next) => {
            setLimit(next)
            setOffset(0)
          }}
          className="mt-4"
        />
      </SectionCard>
    </div>
  )
}
