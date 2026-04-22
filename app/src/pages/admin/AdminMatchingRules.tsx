import { useEffect, useState } from 'react'
import {
  getAdminMatchingRules,
  saveAdminMatchingRules,
  type MatchingRulesConfig,
} from '../../lib/api'

const RANKING_WEIGHT_KEYS = [
  { key: 'jurisdiction_fit' as const, label: 'Jurisdiction fit' },
  { key: 'case_type_fit' as const, label: 'Case type fit' },
  { key: 'economic_fit' as const, label: 'Economic fit' },
  { key: 'response_score' as const, label: 'Response score' },
  { key: 'conversion_score' as const, label: 'Conversion score' },
  { key: 'capacity_score' as const, label: 'Capacity score' },
  { key: 'plaintiff_fit' as const, label: 'Plaintiff fit' },
  { key: 'strategic_priority' as const, label: 'Strategic priority' },
] as const

export default function AdminMatchingRules() {
  const [config, setConfig] = useState<MatchingRulesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAdminMatchingRules()
      .then((data) => {
        if (!cancelled) {
          setConfig(data)
          setError(null)
        }
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.response?.data?.error || e?.message || 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const update = (updates: Partial<MatchingRulesConfig>) => {
    if (!config) return
    setConfig({ ...config, ...updates })
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      await saveAdminMatchingRules(config)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updateWeight = (key: keyof MatchingRulesConfig, value: number) => {
    if (!config) return
    const next = { ...config, [key]: value }
    setConfig(next)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-slate-500">Loading matching rules…</div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        {error || 'Could not load matching rules.'}
      </div>
    )
  }

  const weightSum = RANKING_WEIGHT_KEYS.reduce(
    (s, { key }) => s + (config[key] ?? 0),
    0
  )
  const weightValid = Math.abs(weightSum - 1) < 0.01

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Matching rules</h1>
        <button
          onClick={handleSave}
          disabled={saving || !weightValid}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          Matching rules saved successfully.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Routing mechanism</h2>
            <p className="mt-1 text-sm text-slate-600">
              Turn automated routing on or off globally. When off, new auto-routing and escalation waves pause until re-enabled.
            </p>
          </div>
          <button
            type="button"
            onClick={() => update({ routingEnabled: !config.routingEnabled })}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              config.routingEnabled
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-slate-300 bg-slate-100 text-slate-700'
            }`}
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                config.routingEnabled ? 'bg-green-500' : 'bg-slate-400'
              }`}
            />
            {config.routingEnabled ? 'Routing is on' : 'Routing is off'}
          </button>
        </div>
      </section>

      {/* Wave sizing */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Wave sizing</h2>
        <p className="mb-4 text-sm text-slate-600">
          Maximum attorneys to contact per wave. Wave 1 is initial outreach; waves 2–3 are escalations.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Wave 1</span>
            <input
              type="number"
              min={1}
              max={20}
              value={config.maxAttorneysWave1}
              onChange={(e) => update({ maxAttorneysWave1: parseInt(e.target.value, 10) || 1 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Wave 2</span>
            <input
              type="number"
              min={1}
              max={20}
              value={config.maxAttorneysWave2}
              onChange={(e) => update({ maxAttorneysWave2: parseInt(e.target.value, 10) || 1 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Wave 3</span>
            <input
              type="number"
              min={1}
              max={20}
              value={config.maxAttorneysWave3}
              onChange={(e) => update({ maxAttorneysWave3: parseInt(e.target.value, 10) || 1 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {/* Escalation timing */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Escalation timing</h2>
        <p className="mb-4 text-sm text-slate-600">
          Hours to wait before escalating to the next wave if no attorney accepts.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Wave 1 → 2 (hours)</span>
            <input
              type="number"
              min={0}
              max={168}
              value={config.wave1WaitHours}
              onChange={(e) => update({ wave1WaitHours: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Wave 2 → 3 (hours)</span>
            <input
              type="number"
              min={0}
              max={168}
              value={config.wave2WaitHours}
              onChange={(e) => update({ wave2WaitHours: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Wave 3 complete (hours)</span>
            <input
              type="number"
              min={0}
              max={168}
              value={config.wave3WaitHours}
              onChange={(e) => update({ wave3WaitHours: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {/* Pre-routing gate */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Pre-routing gate</h2>
        <p className="mb-4 text-sm text-slate-600">
          Minimum scores and allowed jurisdictions/claim types. Cases below these thresholds are not routed.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Min case score (0–1)</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={config.minCaseScore}
              onChange={(e) => update({ minCaseScore: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Min evidence score (0–1)</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={config.minEvidenceScore}
              onChange={(e) => update({ minEvidenceScore: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Supported jurisdictions (comma-separated state codes)</span>
            <input
              type="text"
              value={config.supportedJurisdictions.join(', ')}
              onChange={(e) =>
                update({
                  supportedJurisdictions: e.target.value
                    .split(',')
                    .map((s) => s.trim().toUpperCase())
                    .filter(Boolean),
                })
              }
              placeholder="CA, TX, FL, NY, ..."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Supported claim types (comma-separated)</span>
            <input
              type="text"
              value={config.supportedClaimTypes.join(', ')}
              onChange={(e) =>
                update({
                  supportedClaimTypes: e.target.value
                    .split(',')
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean),
                })
              }
              placeholder="auto, slip_and_fall, medmal, ..."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {/* Value thresholds */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Value thresholds</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Min value threshold</span>
            <input
              type="number"
              min={0}
              value={config.minValueThreshold}
              onChange={(e) => update({ minValueThreshold: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Geographic expansion radius (miles)</span>
            <input
              type="number"
              min={0}
              max={500}
              value={config.geographicExpansionRadiusMiles}
              onChange={(e) =>
                update({ geographicExpansionRadiusMiles: parseInt(e.target.value, 10) || 0 })
              }
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {/* Ranking weights */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Ranking weights</h2>
        <p className="mb-4 text-sm text-slate-600">
          Weights for attorney ranking (must sum to 1.0). Higher weight = more influence on match score.
        </p>
        {!weightValid && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Weights sum to {weightSum.toFixed(2)}. They must sum to 1.0 to save.
          </div>
        )}
        <div className="space-y-4">
          {RANKING_WEIGHT_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4">
              <label className="w-40 shrink-0 text-sm font-medium text-slate-700">{label}</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config[key] ?? 0}
                onChange={(e) => updateWeight(key, parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm text-slate-600">
                {(config[key] ?? 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-slate-500">
          Total: {weightSum.toFixed(2)} {weightValid ? '✓' : '(adjust to 1.0)'}
        </div>
      </section>
    </div>
  )
}
