import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminFirms, getAdminFirmSettings, upsertAdminFirmSetting } from '../lib/api'

interface Firm {
  id: string
  name: string
  slug: string
  state?: string | null
  city?: string | null
}

interface FirmSetting {
  id: string
  lawFirmId: string
  key: string
  value: string
  updatedAt: string
}

export default function AdminFirmSettings() {
  const navigate = useNavigate()
  const [firms, setFirms] = useState<Firm[]>([])
  const [selectedFirmId, setSelectedFirmId] = useState<string>('')
  const [settings, setSettings] = useState<FirmSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [valueInput, setValueInput] = useState('')
  const [saving, setSaving] = useState(false)

  const loadFirms = async () => {
    try {
      const data = await getAdminFirms()
      const firmList = data.data || []
      setFirms(firmList)
      if (firmList.length > 0 && !selectedFirmId) {
        setSelectedFirmId(firmList[0].id)
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login?redirect=/admin/firm-settings')
        return
      }
      setError(err.response?.data?.error || 'Failed to load firms')
    }
  }

  const loadSettings = async (lawFirmId: string) => {
    if (!lawFirmId) return
    try {
      setLoading(true)
      const data = await getAdminFirmSettings(lawFirmId)
      setSettings(data.data || [])
      setError(null)
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login?redirect=/admin/firm-settings')
        return
      }
      setError(err.response?.data?.error || 'Failed to load firm settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFirms()
  }, [])

  useEffect(() => {
    if (selectedFirmId) {
      loadSettings(selectedFirmId)
    }
  }, [selectedFirmId])

  const handleSave = async () => {
    if (!selectedFirmId) {
      setError('Select a firm first')
      return
    }
    if (!keyInput.trim()) {
      setError('Key is required')
      return
    }
    setSaving(true)
    try {
      let parsedValue: any = valueInput
      if (valueInput.trim().length > 0) {
        try {
          parsedValue = JSON.parse(valueInput)
        } catch {
          parsedValue = valueInput
        }
      }

      await upsertAdminFirmSetting(selectedFirmId, {
        key: keyInput.trim(),
        value: parsedValue
      })
      setKeyInput('')
      setValueInput('')
      await loadSettings(selectedFirmId)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save firm setting')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Firm-level Settings</h1>
        <p className="text-sm text-gray-600">Store and manage firm-specific configuration.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <select
            className="input md:w-80"
            value={selectedFirmId}
            onChange={(e) => setSelectedFirmId(e.target.value)}
          >
            <option value="">Select a firm</option>
            {firms.map((firm) => (
              <option key={firm.id} value={firm.id}>
                {firm.name} {firm.city ? `• ${firm.city}` : ''} {firm.state ? `(${firm.state})` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
          >
            Back to Admin Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Setting key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <textarea
            className="input min-h-[80px]"
            placeholder="Value (JSON or text)"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Setting'}
        </button>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading settings...</div>}

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
                <th className="text-left px-4 py-3 font-medium">Value</th>
                <th className="text-left px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {settings.map((setting) => (
                <tr key={setting.id}>
                  <td className="px-4 py-3 text-gray-900 font-medium">{setting.key}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <pre className="whitespace-pre-wrap text-xs bg-gray-50 border border-gray-100 rounded p-2">
                      {setting.value}
                    </pre>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(setting.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {settings.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    No settings found for this firm.
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
