import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminFirms, getAdminFirmSettings, upsertAdminFirmSetting } from '../lib/api'
import {
  DataTable,
  PageHeader,
  SectionCard,
  type DataTableColumn,
} from '../features/shared/ui'

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

function isParseableJson(raw: string): boolean {
  try {
    JSON.parse(raw)
    return true
  } catch {
    return false
  }
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
        navigate('/login/admin?redirect=/admin/firm-settings')
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
        navigate('/login/admin?redirect=/admin/firm-settings')
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
      return
    }
    // No firm selected (including "this deployment has no firms"): clear the list
    // and stop loading, or the table would sit on "Loading…" forever.
    setSettings([])
    setLoading(false)
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

  const columns: DataTableColumn<FirmSetting>[] = [
    {
      key: 'key',
      header: 'Key',
      cell: (setting) => (
        <span className="font-mono text-[13px] font-medium text-slate-900 dark:text-slate-100">
          {setting.key}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      cell: (setting) => (
        <pre className="max-w-xl overflow-x-auto whitespace-pre-wrap rounded border border-slate-100 bg-slate-50 p-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
          {setting.value}
        </pre>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      align: 'right',
      cell: (setting) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(setting.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ]

  const selectedFirm = firms.find((f) => f.id === selectedFirmId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Firm-level settings"
        description="Per-firm configuration stored as key/value pairs. Values are saved as JSON when parseable, otherwise as plain text."
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
        title="Firm"
        trailing={
          <select
            className="input w-full sm:w-80"
            aria-label="Select a firm"
            value={selectedFirmId}
            onChange={(e) => setSelectedFirmId(e.target.value)}
          >
            <option value="">Select a firm</option>
            {firms.map((firm) => (
              <option key={firm.id} value={firm.id}>
                {firm.name}
                {firm.city ? ` • ${firm.city}` : ''}
                {firm.state ? ` (${firm.state})` : ''}
              </option>
            ))}
          </select>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Setting key
            </label>
            <input
              className="input"
              placeholder="e.g. demand.default_deadline_days"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Value
            </label>
            <textarea
              className="input min-h-[80px]"
              placeholder='JSON or text — e.g. 30, "on", or {"enabled":true}'
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
            />
            {/* The API silently stores unparseable input as a string, so say so up
                front rather than letting the admin discover it after saving. */}
            {valueInput.trim().length > 0 && !isParseableJson(valueInput) && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Not valid JSON. This will be stored as plain text.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedFirmId}
            className="btn-primary text-ui-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save setting'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title={selectedFirm ? `Settings — ${selectedFirm.name}` : 'Settings'}>
        <DataTable
          columns={columns}
          rows={settings}
          rowKey={(setting) => setting.id}
          loading={loading}
          loadingMessage="Loading settings…"
          emptyMessage={
            selectedFirmId ? 'No settings found for this firm.' : 'Select a firm to view its settings.'
          }
        />
      </SectionCard>
    </div>
  )
}
