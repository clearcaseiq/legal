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

const STATE_OPTIONS = [
  ['CA', 'California'],
  ['TX', 'Texas'],
  ['FL', 'Florida'],
  ['NY', 'New York'],
  ['IL', 'Illinois'],
  ['PA', 'Pennsylvania'],
  ['OH', 'Ohio'],
  ['GA', 'Georgia'],
  ['NC', 'North Carolina'],
  ['MI', 'Michigan'],
  ['AZ', 'Arizona'],
  ['WA', 'Washington'],
  ['CO', 'Colorado'],
  ['NV', 'Nevada'],
  ['NJ', 'New Jersey'],
] as const

const CLAIM_TYPE_OPTIONS = [
  ['auto', 'Auto Accident'],
  ['auto_accident', 'Auto Accident Alias'],
  ['slip_and_fall', 'Slip and Fall'],
  ['premises', 'Premises Liability'],
  ['dog_bite', 'Dog Bite'],
  ['medmal', 'Medical Malpractice'],
  ['product', 'Product Liability'],
  ['product_liability', 'Product Liability Alias'],
  ['workplace_injury', 'Workplace / Third-Party Injury'],
  ['nursing_home_abuse', 'Nursing Home Abuse'],
  ['elder_abuse', 'Elder Abuse'],
  ['high_severity_surgery', 'High Severity / Surgery'],
  ['wrongful_death', 'Wrongful Death'],
  ['catastrophic_injury', 'Catastrophic Injury'],
  ['pi', 'General Personal Injury'],
  ['other_pi', 'Other PI'],
  ['mass_tort', 'Mass Tort'],
] as const
const CLAIM_TYPE_LABELS = Object.fromEntries(CLAIM_TYPE_OPTIONS.map(([value, label]) => [value, label])) as Record<string, string>

const GATE_PRESETS = {
  conservative: {
    label: 'Conservative',
    description: 'Routes fewer cases. Better when attorney supply is tight or quality control is the priority.',
    minCaseScore: 0.45,
    minEvidenceScore: 0.25,
    gateFailureAction: 'manual_review' as const,
  },
  balanced: {
    label: 'Balanced',
    description: 'Default posture. Routes plausible cases while holding lower-confidence cases for review.',
    minCaseScore: 0.25,
    minEvidenceScore: 0.1,
    gateFailureAction: 'manual_review' as const,
  },
  growth: {
    label: 'Growth',
    description: 'Routes more cases. Better when you want more attorney review volume.',
    minCaseScore: 0.15,
    minEvidenceScore: 0.05,
    gateFailureAction: 'needs_more_info' as const,
  },
} as const

const GATE_ACTION_OPTIONS = [
  { value: 'manual_review', label: 'Manual review' },
  { value: 'needs_more_info', label: 'Request more info' },
  { value: 'not_routable_yet', label: 'Do not route' },
] as const

const MATCHING_RULE_TABS = [
  { id: 'routing', label: 'Routing' },
  { id: 'timing', label: 'Timing' },
  { id: 'gate', label: 'Pre-routing Gate' },
  { id: 'quality', label: 'Attorney Rules' },
  { id: 'value', label: 'Value' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'weights', label: 'Weights' },
] as const

type MatchingRuleTab = typeof MATCHING_RULE_TABS[number]['id']

export default function AdminMatchingRules() {
  const [config, setConfig] = useState<MatchingRulesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [customJurisdiction, setCustomJurisdiction] = useState('')
  const [customClaimType, setCustomClaimType] = useState('')
  const [activeSection, setActiveSection] = useState<MatchingRuleTab>('routing')

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

  const handleRoutingToggle = async () => {
    if (!config || saving) return
    const routingEnabled = !config.routingEnabled
    setConfig({ ...config, routingEnabled })
    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      const saved = await saveAdminMatchingRules({ routingEnabled })
      setConfig((current) => current ? { ...current, routingEnabled: saved.routingEnabled } : saved)
      window.dispatchEvent(new CustomEvent('admin-routing-status-changed', {
        detail: { routingEnabled: saved.routingEnabled },
      }))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      setConfig(config)
      setError(e?.response?.data?.error || e?.message || 'Failed to update routing status')
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
  const responseDeadlineMinutes = Math.max(
    0,
    Math.round(config.defaultAttorneyResponseDeadlineMinutes || (config.defaultAttorneyResponseDeadlineHours || 24) * 60)
  )
  const responseDeadlineHoursInput = Math.floor(responseDeadlineMinutes / 60)
  const responseDeadlineMinutesInput = responseDeadlineMinutes % 60
  const updateResponseDeadline = (hours: number, minutes: number) => {
    const nextHours = Math.max(0, hours || 0)
    const nextMinutes = Math.min(59, Math.max(0, minutes || 0))
    update({ defaultAttorneyResponseDeadlineMinutes: nextHours * 60 + nextMinutes })
  }
  const formatResponseDeadline = (minutes: number) => {
    if (minutes <= 0) return 'not set'
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return [
      hours > 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : '',
      remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(' ')
  }
  const toggleListValue = (field: 'supportedJurisdictions' | 'supportedClaimTypes', value: string) => {
    if (!config) return
    const current = config[field] || []
    update({
      [field]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    } as Partial<MatchingRulesConfig>)
  }
  const addCustomJurisdiction = () => {
    const value = customJurisdiction.trim().toUpperCase()
    if (!value || config?.supportedJurisdictions.includes(value)) return
    update({ supportedJurisdictions: [...(config?.supportedJurisdictions || []), value] })
    setCustomJurisdiction('')
  }
  const addCustomClaimType = () => {
    const value = customClaimType.trim().toLowerCase().replace(/\s+/g, '_')
    if (!value || config?.supportedClaimTypes.includes(value)) return
    update({ supportedClaimTypes: [...(config?.supportedClaimTypes || []), value] })
    setCustomClaimType('')
  }
  const applyGatePreset = (mode: keyof typeof GATE_PRESETS) => {
    const preset = GATE_PRESETS[mode]
    update({
      preRoutingGateMode: mode,
      minCaseScore: preset.minCaseScore,
      minEvidenceScore: preset.minEvidenceScore,
      gateFailureAction: preset.gateFailureAction,
    })
  }
  const updateClaimOverride = (
    index: number,
    updates: Partial<NonNullable<MatchingRulesConfig['claimTypeGateOverrides']>[number]>
  ) => {
    const overrides = [...(config.claimTypeGateOverrides || [])]
    overrides[index] = { ...overrides[index], ...updates }
    update({ claimTypeGateOverrides: overrides })
  }
  const addClaimOverride = () => {
    const existing = new Set((config.claimTypeGateOverrides || []).map((override) => override.claimType))
    const nextClaim = (config.supportedClaimTypes || []).find((claimType) => !existing.has(claimType)) || ''
    update({
      claimTypeGateOverrides: [
        ...(config.claimTypeGateOverrides || []),
        {
          claimType: nextClaim,
          minCaseScore: config.minCaseScore,
          minEvidenceScore: config.minEvidenceScore,
          action: config.gateFailureAction,
        },
      ],
    })
  }
  const removeClaimOverride = (index: number) => {
    update({
      claimTypeGateOverrides: (config.claimTypeGateOverrides || []).filter((_, itemIndex) => itemIndex !== index),
    })
  }
  const updateStateOverride = (
    index: number,
    updates: Partial<MatchingRulesConfig['stateGateOverrides'][number]>
  ) => {
    const overrides = [...(config.stateGateOverrides || [])]
    overrides[index] = { ...overrides[index], ...updates }
    update({ stateGateOverrides: overrides, preRoutingGateMode: 'custom' })
  }
  const addStateOverride = () => {
    const existing = new Set((config.stateGateOverrides || []).map((override) => override.state))
    const nextState = (config.supportedJurisdictions || []).find((state) => !existing.has(state)) || 'CA'
    update({
      preRoutingGateMode: 'custom',
      stateGateOverrides: [
        ...(config.stateGateOverrides || []),
        {
          state: nextState,
          minCaseScore: config.minCaseScore,
          minEvidenceScore: config.minEvidenceScore,
          action: config.gateFailureAction,
        },
      ],
    })
  }
  const removeStateOverride = (index: number) => {
    update({
      preRoutingGateMode: 'custom',
      stateGateOverrides: (config.stateGateOverrides || []).filter((_, itemIndex) => itemIndex !== index),
    })
  }
  const updateJurisdictionOverride = (
    index: number,
    updates: Partial<MatchingRulesConfig['jurisdictionGateOverrides'][number]>
  ) => {
    const overrides = [...(config.jurisdictionGateOverrides || [])]
    overrides[index] = { ...overrides[index], ...updates }
    update({ jurisdictionGateOverrides: overrides, preRoutingGateMode: 'custom' })
  }
  const addJurisdictionOverride = () => {
    update({
      preRoutingGateMode: 'custom',
      jurisdictionGateOverrides: [
        ...(config.jurisdictionGateOverrides || []),
        {
          state: config.supportedJurisdictions?.[0] || 'CA',
          jurisdiction: '',
          minCaseScore: config.minCaseScore,
          minEvidenceScore: config.minEvidenceScore,
          action: config.gateFailureAction,
        },
      ],
    })
  }
  const removeJurisdictionOverride = (index: number) => {
    update({
      preRoutingGateMode: 'custom',
      jurisdictionGateOverrides: (config.jurisdictionGateOverrides || []).filter((_, itemIndex) => itemIndex !== index),
    })
  }
  const updatePricingTier = (
    index: number,
    updates: Partial<MatchingRulesConfig['caseRoutingPricingTiers'][number]>
  ) => {
    const tiers = [...(config.caseRoutingPricingTiers || [])]
    tiers[index] = { ...tiers[index], ...updates }
    update({ caseRoutingPricingTiers: tiers })
  }
  const addPricingTier = () => {
    const nextIndex = (config.caseRoutingPricingTiers || []).length + 1
    update({
      caseRoutingPricingTiers: [
        ...(config.caseRoutingPricingTiers || []),
        {
          id: `custom_tier_${nextIndex}`,
          label: `Custom Tier ${nextIndex}`,
          priceCents: 100000,
          caseTypes: [],
          description: 'Custom per-case routing fee tier.',
          enabled: true,
        },
      ],
    })
  }
  const removePricingTier = (index: number) => {
    update({
      caseRoutingPricingTiers: (config.caseRoutingPricingTiers || []).filter((_, itemIndex) => itemIndex !== index),
    })
  }
  const normalizeCaseTypeKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_')
  const claimTypeLabel = (claimType: string) => CLAIM_TYPE_LABELS[claimType] || claimType.replace(/_/g, ' ')
  const moveCaseTypeToPricingTier = (caseType: string, targetIndex: number) => {
    const normalized = normalizeCaseTypeKey(caseType)
    if (!normalized) return
    const tiers = (config.caseRoutingPricingTiers || []).map((tier, index) => {
      const withoutCaseType = (tier.caseTypes || []).filter((item) => item !== normalized)
      return {
        ...tier,
        caseTypes: index === targetIndex ? [...new Set([...withoutCaseType, normalized])] : withoutCaseType,
      }
    })
    update({ caseRoutingPricingTiers: tiers })
  }
  const removeCaseTypeFromPricingTier = (index: number, caseType: string) => {
    const tiers = [...(config.caseRoutingPricingTiers || [])]
    tiers[index] = {
      ...tiers[index],
      caseTypes: (tiers[index].caseTypes || []).filter((item) => item !== caseType),
    }
    update({ caseRoutingPricingTiers: tiers })
  }
  const assignedPricingCaseTypes = new Set(
    (config.caseRoutingPricingTiers || []).flatMap((tier) => tier.caseTypes || [])
  )
  const knownPricingCaseTypes = [
    ...new Set([
      ...CLAIM_TYPE_OPTIONS.map(([value]) => value),
      ...(config.supportedClaimTypes || []),
      ...(config.caseRoutingPricingTiers || []).flatMap((tier) => tier.caseTypes || []),
    ]),
  ].sort((a, b) => claimTypeLabel(a).localeCompare(claimTypeLabel(b)))
  const unassignedPricingCaseTypes = knownPricingCaseTypes.filter((claimType) => !assignedPricingCaseTypes.has(claimType))
  const formatCurrency = (priceCents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((priceCents || 0) / 100)
  const supportedJurisdictionCount = config.supportedJurisdictions?.length || 0
  const supportedClaimCount = config.supportedClaimTypes?.length || 0
  const stateOverrideCount = config.stateGateOverrides?.length || 0
  const jurisdictionOverrideCount = config.jurisdictionGateOverrides?.length || 0
  const claimOverrideCount = config.claimTypeGateOverrides?.length || 0
  const overrideCount = stateOverrideCount + jurisdictionOverrideCount + claimOverrideCount
  const isCustomGateMode = config.preRoutingGateMode === 'custom'

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

      <div className="sticky top-14 z-20 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="grid gap-2 sm:grid-cols-6">
          {MATCHING_RULE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                activeSection === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'routing' && (
      <>
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
            onClick={handleRoutingToggle}
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              config.routingEnabled
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-slate-300 bg-slate-100 text-slate-700'
            } disabled:cursor-not-allowed disabled:opacity-60`}
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
      </>
      )}

      {activeSection === 'timing' && (
      <>
      {/* Attorney response deadline */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Attorney response deadline</h2>
        <p className="mb-4 text-sm text-slate-600">
          How long an attorney has to accept before the case can move to the next matching step. This also controls plaintiff-facing response time copy.
        </p>
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Hours</span>
            <input
              type="number"
              step={1}
              min={0}
              max={168}
              value={responseDeadlineHoursInput === 0 ? '' : responseDeadlineHoursInput}
              onChange={(e) => updateResponseDeadline(parseInt(e.target.value, 10) || 0, responseDeadlineMinutesInput)}
              placeholder="0"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Minutes</span>
            <input
              type="number"
              step={1}
              min={0}
              max={59}
              value={responseDeadlineMinutesInput === 0 ? '' : responseDeadlineMinutesInput}
              onChange={(e) => updateResponseDeadline(responseDeadlineHoursInput, parseInt(e.target.value, 10) || 0)}
              placeholder="0"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Leave hours blank for 0. For example, enter 22 minutes for a 22-minute attorney response window.
        </p>
        <p className="mt-1 text-xs font-medium text-slate-600">
          Current response window: {formatResponseDeadline(responseDeadlineMinutes)}.
        </p>
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
      </>
      )}

      {activeSection === 'gate' && (
      <>
      {/* Pre-routing gate */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-800">Pre-routing gate</h2>
          <p className="mt-1 text-sm text-slate-600">
            Control which cases route automatically, which cases are held, and which claim types need stricter rules.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Rule preset</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {Object.entries(GATE_PRESETS).map(([mode, preset]) => (
              <button
                key={mode}
                type="button"
                onClick={() => applyGatePreset(mode as keyof typeof GATE_PRESETS)}
                className={`rounded-lg border p-3 text-left transition ${
                  config.preRoutingGateMode === mode
                    ? 'border-brand-300 bg-white ring-2 ring-brand-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-semibold text-slate-900">{preset.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-600">{preset.description}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => update({ preRoutingGateMode: 'custom' })}
              className={`rounded-lg border p-3 text-left transition ${
                isCustomGateMode
                  ? 'border-brand-300 bg-white ring-2 ring-brand-100'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-sm font-semibold text-slate-900">Custom</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                Keep the current values and manage thresholds, states, claim types, and overrides manually.
              </span>
            </button>
          </div>
          {isCustomGateMode ? (
            <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
              Custom rules are active. Adjust the fields below, then click Save changes to apply them.
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Editing any field below switches this section to Custom.
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Min case score</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={Math.round((config.minCaseScore || 0) * 100)}
                onChange={(e) => update({ preRoutingGateMode: 'custom', minCaseScore: (parseFloat(e.target.value) || 0) / 100 })}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Min evidence score</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={Math.round((config.minEvidenceScore || 0) * 100)}
                onChange={(e) => update({ preRoutingGateMode: 'custom', minEvidenceScore: (parseFloat(e.target.value) || 0) / 100 })}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">If case does not qualify</span>
            <select
              value={config.gateFailureAction}
              onChange={(e) => update({ preRoutingGateMode: 'custom', gateFailureAction: e.target.value as MatchingRulesConfig['gateFailureAction'] })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {GATE_ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-800">Supported jurisdictions</h3>
              <span className="text-xs text-slate-500">{supportedJurisdictionCount} selected</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATE_OPTIONS.map(([code, label]) => {
                const selected = config.supportedJurisdictions.includes(code)
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleListValue('supportedJurisdictions', code)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      selected
                        ? 'border-brand-200 bg-brand-50 text-brand-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label} ({code})
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={customJurisdiction}
                onChange={(e) => setCustomJurisdiction(e.target.value)}
                placeholder="Add state code"
                className="block w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button type="button" onClick={addCustomJurisdiction} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Add
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-800">Supported claim types</h3>
              <span className="text-xs text-slate-500">{supportedClaimCount} selected</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {CLAIM_TYPE_OPTIONS.map(([value, label]) => {
                const selected = config.supportedClaimTypes.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleListValue('supportedClaimTypes', value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      selected
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={customClaimType}
                onChange={(e) => setCustomClaimType(e.target.value)}
                placeholder="Add claim type"
                className="block w-48 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button type="button" onClick={addCustomClaimType} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <div className="rounded-xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-800">State-specific overrides</h3>
                <p className="text-xs text-slate-500">Use when attorney coverage or routing standards differ by state.</p>
              </div>
              <button type="button" onClick={addStateOverride} className="w-full shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:w-fit">
                Add state
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {(config.stateGateOverrides || []).length === 0 ? (
                <div className="px-4 py-5 text-sm text-slate-500">No state-specific overrides yet.</div>
              ) : (
                config.stateGateOverrides.map((override, index) => (
                  <div key={`${override.state}-${index}`} className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">State</span>
                      <select
                        value={override.state}
                        onChange={(e) => updateStateOverride(index, { state: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        {[...new Set([...(config.supportedJurisdictions || []), override.state].filter(Boolean))].map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">Min case</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round(((override.minCaseScore ?? config.minCaseScore) || 0) * 100)}
                        onChange={(e) => updateStateOverride(index, { minCaseScore: (parseFloat(e.target.value) || 0) / 100 })}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">Min evidence</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round(((override.minEvidenceScore ?? config.minEvidenceScore) || 0) * 100)}
                        onChange={(e) => updateStateOverride(index, { minEvidenceScore: (parseFloat(e.target.value) || 0) / 100 })}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">Hold action</span>
                      <select
                        value={override.action || config.gateFailureAction}
                        onChange={(e) => updateStateOverride(index, { action: e.target.value as MatchingRulesConfig['gateFailureAction'] })}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        {GATE_ACTION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeStateOverride(index)}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:col-span-2 lg:col-span-4"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-800">County / jurisdiction overrides</h3>
                <p className="text-xs text-slate-500">Most specific rule. Example: CA + Los Angeles County.</p>
              </div>
              <button type="button" onClick={addJurisdictionOverride} className="w-full shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:w-fit">
                Add jurisdiction
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {(config.jurisdictionGateOverrides || []).length === 0 ? (
                <div className="px-4 py-5 text-sm text-slate-500">No county or jurisdiction overrides yet.</div>
              ) : (
                config.jurisdictionGateOverrides.map((override, index) => (
                  <div key={`${override.state}-${override.jurisdiction}-${index}`} className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-5">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">State</span>
                      <select
                        value={override.state}
                        onChange={(e) => updateJurisdictionOverride(index, { state: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        {[...new Set([...(config.supportedJurisdictions || []), override.state].filter(Boolean))].map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">Jurisdiction</span>
                      <input
                        type="text"
                        value={override.jurisdiction}
                        onChange={(e) => updateJurisdictionOverride(index, { jurisdiction: e.target.value })}
                        placeholder="Los Angeles County"
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">Min case</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round(((override.minCaseScore ?? config.minCaseScore) || 0) * 100)}
                        onChange={(e) => updateJurisdictionOverride(index, { minCaseScore: (parseFloat(e.target.value) || 0) / 100 })}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">Min evidence</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round(((override.minEvidenceScore ?? config.minEvidenceScore) || 0) * 100)}
                        onChange={(e) => updateJurisdictionOverride(index, { minEvidenceScore: (parseFloat(e.target.value) || 0) / 100 })}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">Hold action</span>
                      <select
                        value={override.action || config.gateFailureAction}
                        onChange={(e) => updateJurisdictionOverride(index, { action: e.target.value as MatchingRulesConfig['gateFailureAction'] })}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        {GATE_ACTION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeJurisdictionOverride(index)}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:col-span-2 xl:col-span-5"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-800">Claim-specific overrides</h3>
              <p className="text-xs text-slate-500">Use stricter or looser thresholds for specific claim types.</p>
            </div>
            <button type="button" onClick={addClaimOverride} className="w-full shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:w-fit">
              Add override
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {(config.claimTypeGateOverrides || []).length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-500">No claim-specific overrides yet.</div>
            ) : (
              config.claimTypeGateOverrides.map((override, index) => (
                <div key={`${override.claimType}-${index}`} className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Claim type</span>
                    <select
                      value={override.claimType}
                      onChange={(e) => updateClaimOverride(index, { claimType: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {[...new Set([...(config.supportedClaimTypes || []), override.claimType].filter(Boolean))].map((claimType) => (
                        <option key={claimType} value={claimType}>{claimType.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Min case</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(((override.minCaseScore ?? config.minCaseScore) || 0) * 100)}
                      onChange={(e) => updateClaimOverride(index, { minCaseScore: (parseFloat(e.target.value) || 0) / 100 })}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Min evidence</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(((override.minEvidenceScore ?? config.minEvidenceScore) || 0) * 100)}
                      onChange={(e) => updateClaimOverride(index, { minEvidenceScore: (parseFloat(e.target.value) || 0) / 100 })}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Hold action</span>
                    <select
                      value={override.action || config.gateFailureAction}
                      onChange={(e) => updateClaimOverride(index, { action: e.target.value as MatchingRulesConfig['gateFailureAction'] })}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {GATE_ACTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeClaimOverride(index)}
                    className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:col-span-2 lg:col-span-4"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Mode</p>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{config.preRoutingGateMode}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Global thresholds</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{Math.round(config.minCaseScore * 100)}% / {Math.round(config.minEvidenceScore * 100)}%</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Supported surface</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{supportedJurisdictionCount} states, {supportedClaimCount} claims</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Overrides</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{overrideCount} configured</p>
          </div>
        </div>
      </section>
      </>
      )}

      {activeSection === 'quality' && (
      <>
      {/* Attorney quality gate */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Attorney quality gate</h2>
        <p className="mb-4 text-sm text-slate-600">
          After hard eligibility (jurisdiction, case type, capacity), attorneys must clear these quality rules before a case is routed to them. Tightening them routes to fewer, higher-quality attorneys; loosening them widens the pool.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Max response time — standard cases (hours)</span>
            <input
              type="number"
              step={1}
              min={1}
              max={336}
              value={config.qualityGateMaxResponseHours}
              onChange={(e) => update({ qualityGateMaxResponseHours: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">Attorneys slower than this are skipped for normal cases.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Max response time — hot cases (hours)</span>
            <input
              type="number"
              step={1}
              min={1}
              max={336}
              value={config.qualityGateHotCaseMaxResponseHours}
              onChange={(e) => update({ qualityGateHotCaseMaxResponseHours: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">Stricter SLA applied to high-viability cases.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Hot-case viability threshold (%)</span>
            <input
              type="number"
              step={1}
              min={0}
              max={100}
              value={Math.round(config.qualityGateHotCaseViabilityThreshold * 100)}
              onChange={(e) => update({ qualityGateHotCaseViabilityThreshold: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) / 100 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">Cases at/above this overall viability use the hot-case SLA.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Minimum contact rate (%)</span>
            <input
              type="number"
              step={1}
              min={0}
              max={100}
              value={Math.round(config.qualityGateMinContactRate * 100)}
              onChange={(e) => update({ qualityGateMinContactRate: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) / 100 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">Attorneys who historically contact fewer leads than this are skipped.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Maximum complaint rate (%)</span>
            <input
              type="number"
              step={1}
              min={0}
              max={100}
              value={Math.round(config.qualityGateMaxComplaintRate * 100)}
              onChange={(e) => update({ qualityGateMaxComplaintRate: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) / 100 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">Attorneys above this complaint/poor-outcome rate are skipped.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Maximum cherry-picking score (%)</span>
            <input
              type="number"
              step={1}
              min={0}
              max={100}
              value={Math.round(config.qualityGateMaxCherryPickingScore * 100)}
              onChange={(e) => update({ qualityGateMaxCherryPickingScore: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) / 100 })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">Attorneys who accept cases but rarely follow up above this rate are skipped.</span>
          </label>
        </div>
      </section>
      </>
      )}

      {activeSection === 'value' && (
      <>
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
      </>
      )}

      {activeSection === 'pricing' && (
      <>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Per-case routing fees</h2>
            <p className="mt-1 text-sm text-slate-600">
              Launch pricing tiers for exclusive PI case routing. Admins can change prices, descriptions, and case-type mappings anytime.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => update({ routingFeePaymentsEnabled: !config.routingFeePaymentsEnabled })}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                config.routingFeePaymentsEnabled
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-slate-300 bg-slate-100 text-slate-700'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  config.routingFeePaymentsEnabled ? 'bg-green-500' : 'bg-slate-400'
                }`}
              />
              {config.routingFeePaymentsEnabled ? 'Stripe payments on' : 'Stripe payments off'}
            </button>
            <button
              type="button"
              onClick={addPricingTier}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Add tier
            </button>
          </div>
        </div>

        <div className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
          config.routingFeePaymentsEnabled
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}>
          {config.routingFeePaymentsEnabled
            ? 'Stripe checkout is enabled for case acceptance when a pricing tier applies.'
            : 'Stripe checkout is currently bypassed. Attorneys can accept cases without payment while pricing tiers remain saved.'}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(config.caseRoutingPricingTiers || []).map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => document.getElementById(`pricing-tier-${tier.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                tier.enabled ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className="text-xs font-medium text-slate-500">{tier.label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(tier.priceCents)}</p>
              <p className="mt-1 text-xs text-slate-600">{tier.caseTypes.length} case types</p>
              <p className="mt-2 text-xs font-medium text-brand-700">Edit tier</p>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Unassigned case types</h3>
              <p className="mt-1 text-xs text-slate-500">
                Add these to a tier below. Moving a case type into a tier removes it from any other tier automatically.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">{unassignedPricingCaseTypes.length} unassigned</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unassignedPricingCaseTypes.length === 0 ? (
              <span className="text-sm text-slate-500">All known case types are assigned to pricing tiers.</span>
            ) : (
              unassignedPricingCaseTypes.map((claimType) => (
                <span key={claimType} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                  {claimTypeLabel(claimType)}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {(config.caseRoutingPricingTiers || []).length === 0 ? (
            <div className="rounded-xl border border-slate-200 px-4 py-5 text-sm text-slate-500">No pricing tiers configured.</div>
          ) : (
            (config.caseRoutingPricingTiers || []).map((tier, index) => (
              <div id={`pricing-tier-${tier.id}`} key={`${tier.id}-${index}`} className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{tier.label || 'Untitled tier'}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCurrency(tier.priceCents)} · {(tier.caseTypes || []).length} case type{(tier.caseTypes || []).length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePricingTier(index)}
                    aria-label={`Remove tier ${tier.label}`}
                    className="w-full rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:w-auto"
                  >
                    Remove tier
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Tier name</span>
                    <input
                      type="text"
                      value={tier.label}
                      onChange={(e) => updatePricingTier(index, { label: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={tier.enabled}
                      onChange={(e) => updatePricingTier(index, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Enabled
                  </label>
                </div>

                <div className="lg:col-span-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Routing fee</span>
                    <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white">
                      <span className="px-3 text-sm text-slate-500">$</span>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={Math.round((tier.priceCents || 0) / 100)}
                        onChange={(e) => updatePricingTier(index, { priceCents: Math.max(0, parseInt(e.target.value, 10) || 0) * 100 })}
                        className="block w-full border-0 px-0 py-2 pr-3 text-sm focus:ring-0"
                      />
                    </div>
                  </label>
                </div>

                <div className="lg:col-span-5">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Description / when to use</span>
                    <textarea
                      value={tier.description}
                      onChange={(e) => updatePricingTier(index, { description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">Case types in this tier</h4>
                      <p className="text-xs text-slate-500">Move case types here with the chooser below, or remove them from this tier.</p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{(tier.caseTypes || []).length} assigned</span>
                  </div>

                  <div className="mt-3 min-h-16 rounded-lg border border-slate-200 bg-white p-3">
                    {(tier.caseTypes || []).length === 0 ? (
                      <p className="px-2 py-2 text-xs text-slate-500">No case types assigned.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(tier.caseTypes || []).map((claimType) => (
                          <span key={claimType} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800">
                            {claimTypeLabel(claimType)}
                            <button
                              type="button"
                              onClick={() => removeCaseTypeFromPricingTier(index, claimType)}
                              className="ml-1 rounded-full border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 hover:bg-emerald-50"
                              aria-label={`Remove ${claimTypeLabel(claimType)} from ${tier.label}`}
                            >
                              Remove
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">Choose case type</span>
                      <select
                        value=""
                        aria-label="Choose case type"
                        onChange={(e) => {
                          moveCaseTypeToPricingTier(e.target.value, index)
                          e.currentTarget.value = ''
                        }}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Choose a case type...</option>
                        {knownPricingCaseTypes
                          .filter((claimType) => !(tier.caseTypes || []).includes(claimType))
                          .map((claimType) => (
                            <option key={claimType} value={claimType}>
                              {claimTypeLabel(claimType)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">Add custom case type</span>
                      <input
                        type="text"
                        placeholder="custom_case_type"
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return
                          e.preventDefault()
                          moveCaseTypeToPricingTier(e.currentTarget.value, index)
                          e.currentTarget.value = ''
                        }}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Choosing a case type moves it into this tier and removes it from any other tier. Type a custom key and press Enter to add it.</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          These are routing fees, not fee shares. Case type is the baseline tier; severe injuries, surgery, clear liability, or death can later upgrade a case into a higher tier through scoring.
        </div>
      </section>
      </>
      )}

      {activeSection === 'weights' && (
      <>
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
      </>
      )}
    </div>
  )
}
