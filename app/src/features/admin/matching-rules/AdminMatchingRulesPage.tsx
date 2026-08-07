import { useEffect, useState } from 'react'
import { getAdminMatchingRules, saveAdminMatchingRules, type MatchingRulesConfig } from '../../../lib/api'
import { PageHeader } from '../../shared/ui'
import { RANKING_WEIGHT_KEYS, type MatchingRuleTab } from './constants'
import { GateRulesTab } from './GateRulesTab'
import { MatchingRulesTabBar } from './MatchingRulesTabBar'
import { PricingRulesTab } from './PricingRulesTab'
import { QualityRulesTab } from './QualityRulesTab'
import { RoutingRulesTab } from './RoutingRulesTab'
import { TimingRulesTab } from './TimingRulesTab'
import { ValueRulesTab } from './ValueRulesTab'
import { WeightsRulesTab } from './WeightsRulesTab'

export default function AdminMatchingRulesPage() {
  const [config, setConfig] = useState<MatchingRulesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<MatchingRuleTab>('routing')

  useEffect(() => {
    let cancelled = false
    getAdminMatchingRules()
      .then((data) => { if (!cancelled) { setConfig(data); setError(null) } })
      .catch((e: any) => { if (!cancelled) setError(e?.response?.data?.error || e?.message || 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const update = (updates: Partial<MatchingRulesConfig>) => {
    if (config) setConfig({ ...config, ...updates })
  }
  const showSuccess = () => {
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }
  const handleSave = async () => {
    if (!config) return
    setSaving(true); setSuccess(false); setError(null)
    try {
      await saveAdminMatchingRules(config)
      showSuccess()
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
    setSaving(true); setSuccess(false); setError(null)
    try {
      const saved = await saveAdminMatchingRules({ routingEnabled })
      setConfig((current) => current ? { ...current, routingEnabled: saved.routingEnabled } : saved)
      window.dispatchEvent(new CustomEvent('admin-routing-status-changed', { detail: { routingEnabled: saved.routingEnabled } }))
      showSuccess()
    } catch (e: any) {
      setConfig(config)
      setError(e?.response?.data?.error || e?.message || 'Failed to update routing status')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="text-slate-500">Loading matching rules…</div></div>
  if (!config) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">{error || 'Could not load matching rules.'}</div>

  const weightSum = RANKING_WEIGHT_KEYS.reduce((sum, { key }) => sum + (config[key] ?? 0), 0)
  const weightValid = Math.abs(weightSum - 1) < 0.01
  const tab = {
    routing: <RoutingRulesTab config={config} update={update} saving={saving} onToggleRouting={handleRoutingToggle} />,
    timing: <TimingRulesTab config={config} update={update} />,
    gate: <GateRulesTab config={config} update={update} />,
    quality: <QualityRulesTab config={config} update={update} />,
    value: <ValueRulesTab config={config} update={update} />,
    pricing: <PricingRulesTab config={config} update={update} />,
    weights: <WeightsRulesTab config={config} update={update} weightSum={weightSum} weightValid={weightValid} />,
  }[activeTab]

  return (
    <div className="space-y-8">
      <PageHeader title="Matching rules" description="Weights, gates, and overrides that decide which attorneys a case is routed to." actions={<button onClick={handleSave} disabled={saving || !weightValid} className="btn-primary text-ui-sm">{saving ? 'Saving…' : 'Save changes'}</button>} />
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">Matching rules saved successfully.</div>}
      <MatchingRulesTabBar activeTab={activeTab} onChange={setActiveTab} />
      {tab}
    </div>
  )
}
