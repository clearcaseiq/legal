import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminUsers, updateAdminUserRole } from '../lib/api'
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
  // Searching in memory would only ever match the current page, so the term is
  // debounced and sent to the server instead.
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
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login/admin?redirect=/admin/users')
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
      const updated = await updateAdminUserRole(userId, role)
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role: updated.data.role } : user))
      )
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role')
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
        description="Grant platform admin, attorney, or firm staff access. Admin unlocks every screen in this console."
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
