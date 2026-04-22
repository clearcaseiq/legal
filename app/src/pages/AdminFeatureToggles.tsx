import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAdminFeatureToggle, getAdminFeatureToggles, updateAdminFeatureToggle } from '../lib/api'

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

export default function AdminFeatureToggles() {
  const navigate = useNavigate()
  const [toggles, setToggles] = useState<FeatureToggle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    key: '',
    description: '',
    enabled: false,
    scope: 'global' as 'global' | 'firm' | 'user',
    lawFirmId: '',
    userId: ''
  })

  const loadToggles = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminFeatureToggles()
      setToggles(data.data || [])
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login?redirect=/admin/feature-toggles')
        return
      }
      setError(err.response?.data?.error || 'Failed to load feature toggles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadToggles()
  }, [])

  const handleCreate = async () => {
    try {
      setError(null)
      if (!form.key.trim()) {
        setError('Key is required')
        return
      }
      const payload = {
        key: form.key.trim(),
        description: form.description.trim() || undefined,
        enabled: form.enabled,
        scope: form.scope,
        lawFirmId: form.scope === 'firm' ? (form.lawFirmId || undefined) : undefined,
        userId: form.scope === 'user' ? (form.userId || undefined) : undefined
      }
      const created = await createAdminFeatureToggle(payload)
      setToggles((prev) => [created.data, ...prev])
      setForm({
        key: '',
        description: '',
        enabled: false,
        scope: 'global',
        lawFirmId: '',
        userId: ''
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create feature toggle')
    }
  }

  const handleToggle = async (toggle: FeatureToggle) => {
    try {
      const updated = await updateAdminFeatureToggle(toggle.id, {
        enabled: !toggle.enabled
      })
      setToggles((prev) => prev.map((item) => (item.id === toggle.id ? updated.data : item)))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update feature toggle')
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Feature Toggles</h1>
        <p className="text-sm text-gray-600">Create and manage feature flags across the platform.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input"
            placeholder="Toggle key"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
          />
          <input
            className="input"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="input"
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value as 'global' | 'firm' | 'user' })}
          >
            <option value="global">Global</option>
            <option value="firm">Firm</option>
            <option value="user">User</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enabled
          </label>
        </div>
        {form.scope === 'firm' && (
          <input
            className="input"
            placeholder="Law firm ID"
            value={form.lawFirmId}
            onChange={(e) => setForm({ ...form, lawFirmId: e.target.value })}
          />
        )}
        {form.scope === 'user' && (
          <input
            className="input"
            placeholder="User ID"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
          />
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Create Toggle
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading toggles...</div>}

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
                <th className="text-left px-4 py-3 font-medium">Key</th>
                <th className="text-left px-4 py-3 font-medium">Scope</th>
                <th className="text-left px-4 py-3 font-medium">Target</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {toggles.map((toggle) => (
                <tr key={toggle.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{toggle.key}</div>
                    {toggle.description && (
                      <div className="text-xs text-gray-500">{toggle.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{toggle.scope}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {toggle.scope === 'firm' ? toggle.lawFirmId : toggle.scope === 'user' ? toggle.userId : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(toggle)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        toggle.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {toggle.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
              {toggles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    No feature toggles yet.
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
