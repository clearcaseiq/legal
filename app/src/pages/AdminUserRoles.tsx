import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminUsers, updateAdminUserRole } from '../lib/api'
import {
  Avatar,
  Badge,
  DataTable,
  PageHeader,
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

export default function AdminUserRoles() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getAdminUsers()
        setUsers(data.data || [])
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login/admin?redirect=/admin/users')
          return
        }
        setError(err.response?.data?.error || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [navigate])

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true
    const needle = searchTerm.toLowerCase()
    return (
      user.email.toLowerCase().includes(needle) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(needle) ||
      user.role.toLowerCase().includes(needle)
    )
  })

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
        title="Users"
        trailing={
          <input
            className="input w-full sm:w-72"
            placeholder="Search by name, email, or role"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        }
      >
        <DataTable
          columns={columns}
          rows={filteredUsers}
          rowKey={(user) => user.id}
          loading={loading}
          loadingMessage="Loading users…"
          emptyMessage={searchTerm ? 'No users match your search.' : 'No users found.'}
        />
      </SectionCard>
    </div>
  )
}
