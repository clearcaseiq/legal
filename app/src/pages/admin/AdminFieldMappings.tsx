import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getAdminFieldMappings, saveAdminFieldMappings } from '../../lib/api'
import {
  DEFAULT_FIELD_MAPPINGS,
  type FieldMapping,
  type FieldMappingsConfig,
  type MappingEntry,
} from '../../lib/field-mappings'

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export default function AdminFieldMappings() {
  const [config, setConfig] = useState<FieldMappingsConfig>(DEFAULT_FIELD_MAPPINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAdminFieldMappings()
      .then((data) => {
        if (!cancelled && data?.mappings?.length) setConfig(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load field mappings. Showing defaults.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const updateMapping = (field: string, next: Partial<FieldMapping>) => {
    setConfig((prev) => ({
      mappings: prev.mappings.map((m) => (m.field === field ? { ...m, ...next } : m)),
    }))
    setSavedAt(null)
  }

  const updateEntry = (field: string, index: number, next: Partial<MappingEntry>) => {
    setConfig((prev) => ({
      mappings: prev.mappings.map((m) =>
        m.field === field
          ? { ...m, entries: m.entries.map((e, i) => (i === index ? { ...e, ...next } : e)) }
          : m
      ),
    }))
    setSavedAt(null)
  }

  const addEntry = (field: string) => {
    setConfig((prev) => ({
      mappings: prev.mappings.map((m) =>
        m.field === field ? { ...m, entries: [...m.entries, { canonical: '', label: '', aliases: [] }] } : m
      ),
    }))
    setSavedAt(null)
  }

  const removeEntry = (field: string, index: number) => {
    setConfig((prev) => ({
      mappings: prev.mappings.map((m) =>
        m.field === field ? { ...m, entries: m.entries.filter((_, i) => i !== index) } : m
      ),
    }))
    setSavedAt(null)
  }

  const addMapping = () => {
    const base = 'newField'
    let field = base
    let n = 1
    while (config.mappings.some((m) => m.field === field)) {
      field = `${base}${n++}`
    }
    setConfig((prev) => ({
      mappings: [
        ...prev.mappings,
        {
          field,
          label: 'New mapping',
          description: '',
          sourceLabel: 'Value',
          targetLabel: 'Aliases',
          entries: [],
        },
      ],
    }))
    setSavedAt(null)
  }

  const removeMapping = (field: string) => {
    setConfig((prev) => ({ mappings: prev.mappings.filter((m) => m.field !== field) }))
    setSavedAt(null)
  }

  const handleSave = async () => {
    // Drop empty rows and normalize before saving.
    const cleaned: FieldMappingsConfig = {
      mappings: config.mappings
        .map((m) => ({
          ...m,
          field: slugify(m.field) || m.field,
          entries: m.entries
            .map((e) => ({
              canonical: e.canonical.trim(),
              label: (e.label || '').trim() || undefined,
              aliases: Array.from(
                new Set(
                  (e.aliases || [])
                    .map((a) => a.trim())
                    .filter((a) => a && a !== e.canonical.trim())
                )
              ),
            }))
            .filter((e) => e.canonical.length > 0),
        }))
        .filter((m) => m.field.length > 0),
    }

    const fields = cleaned.mappings.map((m) => m.field)
    if (new Set(fields).size !== fields.length) {
      setError('Field ids must be unique. Please rename duplicates.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const saved = await saveAdminFieldMappings(cleaned)
      if (saved?.mappings?.length) setConfig(saved)
      setSavedAt(Date.now())
    } catch {
      setError('Failed to save field mappings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_FIELD_MAPPINGS)
    setSavedAt(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
        <span className="ml-3 text-sm">Loading field mappings…</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Field Mappings</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Reconcile values that differ between surfaces — e.g. the case type a plaintiff picks in attorney
            search vs. the specialty slug an attorney stored. Each row maps a canonical value to any number of
            aliases that should resolve to it. Changes apply without a deploy.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {savedAt && !error && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Field mappings saved. New values take effect immediately.
        </div>
      )}

      <div className="mt-6 space-y-6">
        {config.mappings.map((mapping) => (
          <section
            key={mapping.field}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <input
                  value={mapping.label}
                  onChange={(e) => updateMapping(mapping.field, { label: e.target.value })}
                  className="w-full rounded-lg border border-transparent bg-transparent text-lg font-semibold text-slate-900 hover:border-slate-200 focus:border-brand-500 focus:outline-none dark:text-slate-100"
                  placeholder="Mapping name"
                />
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">field id</span>
                  <input
                    value={mapping.field}
                    onChange={(e) => updateMapping(mapping.field, { field: e.target.value })}
                    className="rounded border border-slate-200 px-2 py-0.5 font-mono text-xs text-slate-600 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
                <textarea
                  value={mapping.description || ''}
                  onChange={(e) => updateMapping(mapping.field, { description: e.target.value })}
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  placeholder="What this mapping controls"
                />
              </div>
              <button
                type="button"
                onClick={() => removeMapping(mapping.field)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    <th className="px-2">{mapping.sourceLabel || 'Canonical value'}</th>
                    <th className="px-2">Label</th>
                    <th className="px-2">{mapping.targetLabel || 'Aliases (comma-separated)'}</th>
                    <th className="w-10 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {mapping.entries.map((entry, index) => (
                    <tr key={index}>
                      <td className="px-2 align-top">
                        <input
                          value={entry.canonical}
                          onChange={(e) => updateEntry(mapping.field, index, { canonical: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="auto"
                        />
                      </td>
                      <td className="px-2 align-top">
                        <input
                          value={entry.label || ''}
                          onChange={(e) => updateEntry(mapping.field, index, { label: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="Auto Accident"
                        />
                      </td>
                      <td className="px-2 align-top">
                        <input
                          value={(entry.aliases || []).join(', ')}
                          onChange={(e) =>
                            updateEntry(mapping.field, index, {
                              aliases: e.target.value.split(',').map((a) => a.trim()),
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="vehicle, car_accident"
                        />
                      </td>
                      <td className="px-2 align-top">
                        <button
                          type="button"
                          onClick={() => removeEntry(mapping.field, index)}
                          className="mt-2 text-slate-400 hover:text-red-600"
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => addEntry(mapping.field)}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              <Plus className="h-4 w-4" />
              Add row
            </button>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={addMapping}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-700"
      >
        <Plus className="h-4 w-4" />
        Add a new field mapping
      </button>
    </div>
  )
}
