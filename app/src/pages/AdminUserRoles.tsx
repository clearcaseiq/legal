import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminUsers, updateAdminUserRole } from '../lib/api'

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
          navigate('/login?redirect=/admin/users')
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

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">User & Role Management</h1>
        <p className="text-sm text-gray-600">Update user roles and access levels.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <input
            className="input w-full md:w-80"
            placeholder="Search by name, email, or role"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-600">Loading users...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={savingId === user.id}
                      className="input"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
