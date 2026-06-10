import { useEffect, useMemo, useState } from 'react'
import { getAdminHeuristics, saveAdminHeuristics } from '../../lib/api'
import { DEFAULT_HEURISTICS, type HeuristicsConfig } from '../../lib/heuristics'

type FieldDef = {
  path: [keyof HeuristicsConfig, string]
  label: string
  help?: string
  step?: number
  min?: number
  max?: number
}

type SectionDef = {
  id: string
  title: string
  description: string
  fields: FieldDef[]
}

const SECTIONS: SectionDef[] = [
  {
    id: 'attorneyFitScore',
    title: 'Attorney fit score',
    description:
      'How an attorney\'s match score is built when cases are ranked. The score starts at the base and adds each bonus when the signal is present, then is clamped between min and max.',
    fields: [
      { path: ['attorneyFitScore', 'baseScore'], label: 'Base score', step: 0.01, min: 0, max: 1, help: 'Starting score before any bonuses (0–1).' },
      { path: ['attorneyFitScore', 'venueMatchBonus'], label: 'Venue match bonus', step: 0.01, min: 0, max: 1 },
      { path: ['attorneyFitScore', 'claimTypeMatchBonus'], label: 'Claim-type match bonus', step: 0.01, min: 0, max: 1 },
      { path: ['attorneyFitScore', 'verifiedBonus'], label: 'Verified attorney bonus', step: 0.01, min: 0, max: 1 },
      { path: ['attorneyFitScore', 'highRatingBonus'], label: 'High rating bonus', step: 0.01, min: 0, max: 1 },
      { path: ['attorneyFitScore', 'highRatingThreshold'], label: 'High rating threshold', step: 0.1, min: 0, max: 5, help: 'Rating (0–5) at/above which the high-rating bonus applies.' },
      { path: ['attorneyFitScore', 'fastResponseBonus'], label: 'Fast response bonus', step: 0.01, min: 0, max: 1 },
      { path: ['attorneyFitScore', 'fastResponseHours'], label: 'Fast response hours', step: 1, min: 0, help: 'Response time (hours) at/under which the fast-response bonus applies.' },
      { path: ['attorneyFitScore', 'minScore'], label: 'Minimum score', step: 0.01, min: 0, max: 1 },
      { path: ['attorneyFitScore', 'maxScore'], label: 'Maximum score', step: 0.01, min: 0, max: 1 },
    ],
  },
  {
    id: 'responseBadge',
    title: 'Response badges',
    description: 'Thresholds (in hours) used to label how quickly an attorney typically replies.',
    fields: [
      { path: ['responseBadge', 'fastResponderMaxHours'], label: '“Fast responder” max hours', step: 1, min: 0 },
      { path: ['responseBadge', 'sameDayMaxHours'], label: '“Same-day replies” max hours', step: 1, min: 0 },
      { path: ['responseBadge', 'within24MaxHours'], label: '“Replies within 24h” max hours', step: 1, min: 0 },
    ],
  },
  {
    id: 'caseStrength',
    title: 'Case strength bands',
    description: 'Case score (0–100) cutoffs that decide the Strong / Moderate / Weak label shown on leads.',
    fields: [
      { path: ['caseStrength', 'strongMin'], label: '“Strong” minimum score', step: 1, min: 0, max: 100 },
      { path: ['caseStrength', 'moderateMin'], label: '“Moderate” minimum score', step: 1, min: 0, max: 100 },
    ],
  },
  {
    id: 'acceptanceRate',
    title: 'Acceptance-rate labels',
    description: 'Acceptance-rate percentage (0–100) cutoffs for the Excellent / Strong / Improving label.',
    fields: [
      { path: ['acceptanceRate', 'excellentMin'], label: '“Excellent” minimum %', step: 1, min: 0, max: 100 },
      { path: ['acceptanceRate', 'strongMin'], label: '“Strong” minimum %', step: 1, min: 0, max: 100 },
    ],
  },
  {
    id: 'responseSpeed',
    title: 'Response-speed labels',
    description: 'Response-speed score (0–1) cutoffs for the Excellent / Strong / Improving label.',
    fields: [
      { path: ['responseSpeed', 'excellentMin'], label: '“Excellent” minimum score', step: 0.01, min: 0, max: 1 },
      { path: ['responseSpeed', 'strongMin'], label: '“Strong” minimum score', step: 0.01, min: 0, max: 1 },
    ],
  },
  {
    id: 'conflictCheck',
    title: 'Conflict check',
    description: 'How many of an attorney\'s other leads are screened when running a preliminary conflict check.',
    fields: [
      { path: ['conflictCheck', 'lookbackCases'], label: 'Cases to screen', step: 10, min: 1 },
    ],
  },
  {
    id: 'readinessLabels',
    title: 'File readiness labels',
    description: 'Readiness score (0–100) cutoffs for the Demand-ready / Attorney-review ready / Needs strengthening / Early file labels.',
    fields: [
      { path: ['readinessLabels', 'demandReadyMin'], label: '“Demand-ready” minimum', step: 1, min: 0, max: 100 },
      { path: ['readinessLabels', 'reviewReadyMin'], label: '“Attorney-review ready” minimum', step: 1, min: 0, max: 100 },
      { path: ['readinessLabels', 'strengtheningMin'], label: '“Needs strengthening” minimum', step: 1, min: 0, max: 100 },
    ],
  },
  {
    id: 'scoreTone',
    title: 'Score color tones',
    description: 'Score (0–100) cutoffs that decide whether a metric renders green, amber, or red across attorney dashboards.',
    fields: [
      { path: ['scoreTone', 'greenMin'], label: 'Green minimum', step: 1, min: 0, max: 100 },
      { path: ['scoreTone', 'amberMin'], label: 'Amber minimum', step: 1, min: 0, max: 100, help: 'Below this renders red.' },
    ],
  },
  {
    id: 'evidenceCompleteness',
    title: 'Evidence completeness',
    description: 'File/evidence completeness % cutoffs for the High / Moderate / Low label.',
    fields: [
      { path: ['evidenceCompleteness', 'highMin'], label: '“High” minimum %', step: 1, min: 0, max: 100 },
      { path: ['evidenceCompleteness', 'moderateMin'], label: '“Moderate” minimum %', step: 1, min: 0, max: 100 },
    ],
  },
  {
    id: 'opportunity',
    title: 'Opportunity bands',
    description: 'Opportunity score (0–100) cutoffs for the Strong / Moderate / Weak label on a lead.',
    fields: [
      { path: ['opportunity', 'strongMin'], label: '“Strong” minimum score', step: 1, min: 0, max: 100 },
      { path: ['opportunity', 'moderateMin'], label: '“Moderate” minimum score', step: 1, min: 0, max: 100 },
    ],
  },
  {
    id: 'marketplaceRank',
    title: 'Marketplace ranking tiers',
    description: 'Marketplace score (0–100) cutoffs for the Top 5% / Top 10% / Top 25% ranking shown to attorneys.',
    fields: [
      { path: ['marketplaceRank', 'top5Min'], label: '“Top 5%” minimum', step: 1, min: 0, max: 100 },
      { path: ['marketplaceRank', 'top10Min'], label: '“Top 10%” minimum', step: 1, min: 0, max: 100 },
      { path: ['marketplaceRank', 'top25Min'], label: '“Top 25%” minimum', step: 1, min: 0, max: 100 },
    ],
  },
  {
    id: 'leadSignals',
    title: 'Lead signal thresholds',
    description: 'Viability sub-score (0–1) cutoffs that drive the strengths, risks, and review recommendation shown on a lead — across web and the mobile app.',
    fields: [
      { path: ['leadSignals', 'liabilityStrongMin'], label: 'Liability “strength” minimum', step: 0.01, min: 0, max: 1 },
      { path: ['leadSignals', 'liabilityWeakMax'], label: 'Liability “risk” below', step: 0.01, min: 0, max: 1 },
      { path: ['leadSignals', 'damagesStrongMin'], label: 'Damages “strength” minimum', step: 0.01, min: 0, max: 1 },
      { path: ['leadSignals', 'damagesWeakMax'], label: 'Damages “risk” below', step: 0.01, min: 0, max: 1 },
      { path: ['leadSignals', 'reviewDecisionMin'], label: '“Review” recommendation minimum', step: 0.01, min: 0, max: 1, help: 'Overall viability at/above this recommends review, else watch.' },
    ],
  },
]

export default function AdminHeuristics() {
  const [config, setConfig] = useState<HeuristicsConfig>(DEFAULT_HEURISTICS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAdminHeuristics()
      .then((data) => {
        if (!cancelled && data) setConfig(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load heuristics. Showing defaults.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const getValue = (section: keyof HeuristicsConfig, key: string): number =>
    Number((config[section] as Record<string, number>)[key])

  const setValue = (section: keyof HeuristicsConfig, key: string, raw: string) => {
    const num = raw === '' ? 0 : Number(raw)
    if (Number.isNaN(num)) return
    setConfig((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, number>), [key]: num },
    }))
  }

  const validationError = useMemo(() => {
    if (config.caseStrength.moderateMin > config.caseStrength.strongMin) {
      return 'Case strength: “Moderate” minimum cannot be higher than “Strong” minimum.'
    }
    if (config.acceptanceRate.strongMin > config.acceptanceRate.excellentMin) {
      return 'Acceptance rate: “Strong” minimum cannot be higher than “Excellent” minimum.'
    }
    if (config.responseSpeed.strongMin > config.responseSpeed.excellentMin) {
      return 'Response speed: “Strong” minimum cannot be higher than “Excellent” minimum.'
    }
    if (config.attorneyFitScore.minScore > config.attorneyFitScore.maxScore) {
      return 'Fit score: minimum cannot be higher than maximum.'
    }
    if (config.opportunity.moderateMin > config.opportunity.strongMin) {
      return 'Opportunity: “Moderate” minimum cannot be higher than “Strong” minimum.'
    }
    if (config.evidenceCompleteness.moderateMin > config.evidenceCompleteness.highMin) {
      return 'Evidence completeness: “Moderate” minimum cannot be higher than “High” minimum.'
    }
    if (config.scoreTone.amberMin > config.scoreTone.greenMin) {
      return 'Score tones: amber minimum cannot be higher than green minimum.'
    }
    const r = config.readinessLabels
    if (r.strengtheningMin > r.reviewReadyMin || r.reviewReadyMin > r.demandReadyMin) {
      return 'Readiness labels: each tier minimum must be ≤ the next higher tier.'
    }
    const m = config.marketplaceRank
    if (m.top25Min > m.top10Min || m.top10Min > m.top5Min) {
      return 'Marketplace tiers: each tier minimum must be ≤ the next higher tier.'
    }
    return null
  }, [config])

  const handleSave = async () => {
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = await saveAdminHeuristics(config)
      setConfig(saved)
      setSavedAt(Date.now())
    } catch {
      setError('Failed to save heuristics. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_HEURISTICS)
    setSavedAt(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
        <span className="ml-3 text-sm">Loading heuristics…</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Heuristics</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Tune the scoring and labeling logic used across the attorney experience. Changes apply without a deploy.
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
            disabled={saving || Boolean(validationError)}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {(error || validationError) && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError || error}
        </div>
      )}
      {savedAt && !error && !validationError && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Heuristics saved. New values take effect immediately.
        </div>
      )}

      <div className="mt-6 space-y-6">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{section.description}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => {
                const [sectionKey, key] = field.path
                return (
                  <label key={`${sectionKey}.${key}`} className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                    <input
                      type="number"
                      step={field.step ?? 1}
                      min={field.min}
                      max={field.max}
                      value={getValue(sectionKey, key)}
                      onChange={(e) => setValue(sectionKey, key, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    {field.help && <span className="mt-1 block text-xs text-slate-500">{field.help}</span>}
                  </label>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
