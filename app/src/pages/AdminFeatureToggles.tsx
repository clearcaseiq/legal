import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createAdminFeatureToggle,
  getAdminFeatureToggles,
  getAdminFirms,
  getAdminUsers,
  updateAdminFeatureToggle,
} from '../lib/api'
import { getAdminLoginPath, isAdminAuthError } from '../lib/auth'
import {
  Badge,
  DataTable,
  PageHeader,
  SectionCard,
  type DataTableColumn,
} from '../features/shared/ui'

interface FeatureToggle {
  id: string
  key: string
  description?: string | null
  enabled: boolean
  scope: 'global' | 'firm' | 'user'
  lawFirmId?: string | null
  userId?: string | null
  createdAt?: string
}

interface FirmOption {
  id: string
  name: string
  slug?: string
}

interface UserOption {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

function firmLabel(firm: FirmOption) {
  return firm.name || firm.slug || firm.id
}

function userLabel(user: UserOption) {
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  return name ? `${name} (${user.email})` : user.email
}

export default function AdminFeatureToggles() {
  const navigate = useNavigate()
  const [toggles, setToggles] = useState<FeatureToggle[]>([])
  const [firms, setFirms] = useState<FirmOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    key: '',
    description: '',
    enabled: false,
    scope: 'global' as 'global' | 'firm' | 'user',
    lawFirmId: '',
    userId: '',
  })

  const redirectOnAuthError = (err: unknown) => {
    if (isAdminAuthError(err)) {
      navigate(getAdminLoginPath('/admin/feature-toggles'), { replace: true })
      return true
    }
    return false
  }

  const loadToggles = async () => {
    try {
      setLoading(true)
      setError(null)
      const [toggleData, firmData, userData] = await Promise.all([
        getAdminFeatureToggles(),
        getAdminFirms().catch(() => ({ data: [] })),
        getAdminUsers({ limit: 200 }).catch(() => ({ data: [] })),
      ])
      setToggles(toggleData.data || [])
      setFirms(Array.isArray(firmData?.data) ? firmData.data : [])
      setUsers(Array.isArray(userData?.data) ? userData.data : [])
    } catch (err: any) {
      if (redirectOnAuthError(err)) return
      setError(err.response?.data?.error || 'Failed to load feature toggles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadToggles()
  }, [])

  const resolveTargetLabel = (toggle: FeatureToggle) => {
    if (toggle.scope === 'firm') {
      const firm = firms.find((item) => item.id === toggle.lawFirmId)
      return firm ? firmLabel(firm) : toggle.lawFirmId || '—'
    }
    if (toggle.scope === 'user') {
      const user = users.find((item) => item.id === toggle.userId)
      return user ? userLabel(user) : toggle.userId || '—'
    }
    return '—'
  }

  const handleCreate = async () => {
    try {
      setError(null)
      if (!form.key.trim()) {
        setError('Key is required')
        return
      }
      if (form.scope === 'firm' && !form.lawFirmId) {
        setError('Select a law firm for firm-scoped toggles')
        return
      }
      if (form.scope === 'user' && !form.userId) {
        setError('Select a user for user-scoped toggles')
        return
      }
      const payload = {
        key: form.key.trim(),
        description: form.description.trim() || undefined,
        enabled: form.enabled,
        scope: form.scope,
        lawFirmId: form.scope === 'firm' ? form.lawFirmId || undefined : undefined,
        userId: form.scope === 'user' ? form.userId || undefined : undefined,
      }
      const created = await createAdminFeatureToggle(payload)
      setToggles((prev) => [created.data, ...prev])
      setForm({
        key: '',
        description: '',
        enabled: false,
        scope: 'global',
        lawFirmId: '',
        userId: '',
      })
    } catch (err: any) {
      if (redirectOnAuthError(err)) return
      setError(err.response?.data?.error || 'Failed to create feature toggle')
    }
  }

  const handleToggle = async (toggle: FeatureToggle) => {
    try {
      const updated = await updateAdminFeatureToggle(toggle.id, {
        enabled: !toggle.enabled,
      })
      setToggles((prev) => prev.map((item) => (item.id === toggle.id ? updated.data : item)))
    } catch (err: any) {
      if (redirectOnAuthError(err)) return
      setError(err.response?.data?.error || 'Failed to update feature toggle')
    }
  }

  const columns: DataTableColumn<FeatureToggle>[] = [
    {
      key: 'key',
      header: 'Key',
      cell: (toggle) => (
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-medium text-slate-900 dark:text-slate-100">{toggle.key}</p>
          {toggle.description && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toggle.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      cell: (toggle) => <Badge tone={toggle.scope === 'global' ? 'blue' : 'neutral'}>{toggle.scope}</Badge>,
    },
    {
      key: 'target',
      header: 'Target',
      cell: (toggle) => (
        <span className="text-xs text-slate-600 dark:text-slate-300" title={toggle.lawFirmId || toggle.userId || undefined}>
          {resolveTargetLabel(toggle)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (toggle) => (
        <button
          type="button"
          onClick={() => handleToggle(toggle)}
          aria-pressed={toggle.enabled}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          title={toggle.enabled ? 'Click to disable' : 'Click to enable'}
        >
          <Badge tone={toggle.enabled ? 'success' : 'neutral'}>
            {toggle.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature toggles"
        description="Flags that gate platform behavior globally, per firm, or per user."
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

      <SectionCard title="Create a toggle">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="input"
            placeholder="Toggle key"
            aria-label="Toggle key"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
          />
          <input
            className="input"
            placeholder="Description"
            aria-label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="input"
            aria-label="Scope"
            value={form.scope}
            onChange={(e) =>
              setForm({
                ...form,
                scope: e.target.value as 'global' | 'firm' | 'user',
                lawFirmId: '',
                userId: '',
              })
            }
          >
            <option value="global">Global</option>
            <option value="firm">Firm</option>
            <option value="user">User</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enabled on create
          </label>
        </div>

        {form.scope === 'firm' && (
          <select
            className="input mt-3"
            aria-label="Law firm"
            value={form.lawFirmId}
            onChange={(e) => setForm({ ...form, lawFirmId: e.target.value })}
          >
            <option value="">Select a law firm…</option>
            {firms.map((firm) => (
              <option key={firm.id} value={firm.id}>
                {firmLabel(firm)}
              </option>
            ))}
          </select>
        )}
        {form.scope === 'user' && (
          <select
            className="input mt-3"
            aria-label="User"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
          >
            <option value="">Select a user…</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {userLabel(user)}
              </option>
            ))}
          </select>
        )}

        <div className="mt-4">
          <button type="button" onClick={handleCreate} className="btn-primary text-ui-sm">
            Create toggle
          </button>
        </div>
      </SectionCard>

      <SectionCard title="All toggles">
        <DataTable
          columns={columns}
          rows={toggles}
          rowKey={(toggle) => toggle.id}
          loading={loading}
          loadingMessage="Loading toggles…"
          emptyMessage="No feature toggles yet."
        />
      </SectionCard>
    </div>
  )
}
