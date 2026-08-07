import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminUsers, updateAdminUserCapabilities, updateAdminUserRole } from '../lib/api'
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
const DEFAULT_LIMIT = 50

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
  const [roleFilter, setRoleFilter] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

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
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & role management"
        description="Grant platform roles and scope admin capabilities (ops, network, oversight, config, users). Allowlisted ADMIN_EMAILS accounts always keep full access."
        actions={
          <button type="button" onClick={() => navigate('/admin')} className="btn-outline text-ui-sm">
            Back to dashboard
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <SectionCard
        title={`${total.toLocaleString()} user${total === 1 ? '' : 's'}`}
        trailing={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setOffset(0)
              }}
              className="input w-auto capitalize"
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
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
          emptyMessage={appliedSearch ? 'No users match your search.' : 'No users found.'}
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
