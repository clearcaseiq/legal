import { useState, type ReactNode } from 'react'
import type { MatchingRulesConfig } from '../../../lib/api'
import { CLAIM_TYPE_OPTIONS, formatClaimType } from '../../../lib/claimTypes'
import { US_STATES } from '../../../lib/constants'
import { GATE_ACTION_OPTIONS, GATE_PRESETS, type MatchingRulesTabProps } from './constants'

export function GateRulesTab({ config, update }: MatchingRulesTabProps) {
  const [customJurisdiction, setCustomJurisdiction] = useState('')
  const [customClaimType, setCustomClaimType] = useState('')
  const custom = config.preRoutingGateMode === 'custom'
  const updateCustom = (updates: Partial<MatchingRulesConfig>) => update({ preRoutingGateMode: 'custom', ...updates })
  const toggleListValue = (field: 'supportedJurisdictions' | 'supportedClaimTypes', value: string) => {
    const current = config[field] || []
    update({ [field]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] } as Partial<MatchingRulesConfig>)
  }
  const addCustomJurisdiction = () => {
    const value = customJurisdiction.trim().toUpperCase()
    if (!value || config.supportedJurisdictions.includes(value)) return
    update({ supportedJurisdictions: [...config.supportedJurisdictions, value] })
    setCustomJurisdiction('')
  }
  const addCustomClaimType = () => {
    const value = customClaimType.trim().toLowerCase().replace(/\s+/g, '_')
    if (!value || config.supportedClaimTypes.includes(value)) return
    update({ supportedClaimTypes: [...config.supportedClaimTypes, value] })
    setCustomClaimType('')
  }
  const applyPreset = (mode: keyof typeof GATE_PRESETS) => {
    const preset = GATE_PRESETS[mode]
    update({ preRoutingGateMode: mode, minCaseScore: preset.minCaseScore, minEvidenceScore: preset.minEvidenceScore, gateFailureAction: preset.gateFailureAction })
  }
  const stateOverrides = config.stateGateOverrides || []
  const jurisdictionOverrides = config.jurisdictionGateOverrides || []
  const claimOverrides = config.claimTypeGateOverrides || []
  const updateOverride = <T,>(overrides: T[], index: number, updates: Partial<T>, field: keyof MatchingRulesConfig) => {
    const next = [...overrides]
    next[index] = { ...next[index], ...updates }
    updateCustom({ [field]: next } as Partial<MatchingRulesConfig>)
  }
  const actionOptions = GATE_ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)
  const scoreInput = (value: number, onChange: (value: number) => void, clamp = false) => <input type="number" min={0} max={100} step={5} value={Math.round((value || 0) * 100)} onChange={(e) => onChange((clamp ? Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) : parseFloat(e.target.value) || 0) / 100)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5"><h2 className="text-lg font-semibold text-slate-800">Pre-routing gate</h2><p className="mt-1 text-sm text-slate-600">Control which cases route automatically, which cases are held, and which claim types need stricter rules.</p></div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-800">Rule preset</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {Object.entries(GATE_PRESETS).map(([mode, preset]) => <button key={mode} type="button" onClick={() => applyPreset(mode as keyof typeof GATE_PRESETS)} className={`rounded-lg border p-3 text-left transition ${config.preRoutingGateMode === mode ? 'border-brand-300 bg-white ring-2 ring-brand-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}><span className="text-sm font-semibold text-slate-900">{preset.label}</span><span className="mt-1 block text-xs leading-relaxed text-slate-600">{preset.description}</span></button>)}
          <button type="button" onClick={() => update({ preRoutingGateMode: 'custom' })} className={`rounded-lg border p-3 text-left transition ${custom ? 'border-brand-300 bg-white ring-2 ring-brand-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}><span className="text-sm font-semibold text-slate-900">Custom</span><span className="mt-1 block text-xs leading-relaxed text-slate-600">Keep the current values and manage thresholds, states, claim types, and overrides manually.</span></button>
        </div>
        <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${custom ? 'border-brand-200 bg-brand-50 text-brand-900' : 'border-slate-200 bg-white text-slate-600'}`}>{custom ? 'Custom rules are active. Adjust the fields below, then click Save changes to apply them.' : 'Editing any field below switches this section to Custom.'}</div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="text-sm font-medium text-slate-700">Min case score</span><div className="mt-1 flex items-center gap-2">{scoreInput(config.minCaseScore, (minCaseScore) => updateCustom({ minCaseScore }), true)}<span className="text-sm text-slate-500">%</span></div></label>
        <label className="block"><span className="text-sm font-medium text-slate-700">Min evidence score</span><div className="mt-1 flex items-center gap-2">{scoreInput(config.minEvidenceScore, (minEvidenceScore) => updateCustom({ minEvidenceScore }), true)}<span className="text-sm text-slate-500">%</span></div></label>
        <label className="block"><span className="text-sm font-medium text-slate-700">If case does not qualify</span><select value={config.gateFailureAction} onChange={(e) => updateCustom({ gateFailureAction: e.target.value as MatchingRulesConfig['gateFailureAction'] })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm">{actionOptions}</select></label>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-800">Supported jurisdictions</h3><span className="text-xs text-slate-500">{config.supportedJurisdictions.length} selected</span></div><div className="mt-3 flex flex-wrap gap-2">{US_STATES.map(({ code, name }) => <button key={code} type="button" onClick={() => toggleListValue('supportedJurisdictions', code)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${config.supportedJurisdictions.includes(code) ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{name} ({code})</button>)}</div><div className="mt-3 flex gap-2"><input type="text" value={customJurisdiction} onChange={(e) => setCustomJurisdiction(e.target.value)} placeholder="Add state code" maxLength={4} className="block w-40 rounded-md border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={addCustomJurisdiction} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Add</button></div></div>
        <div><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-800">Supported claim types</h3><span className="text-xs text-slate-500">{config.supportedClaimTypes.length} selected</span></div><div className="mt-3 flex flex-wrap gap-2">{CLAIM_TYPE_OPTIONS.map(({ value, label }) => <button key={value} type="button" onClick={() => toggleListValue('supportedClaimTypes', value)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${config.supportedClaimTypes.includes(value) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}</div><div className="mt-3 flex gap-2"><input type="text" value={customClaimType} onChange={(e) => setCustomClaimType(e.target.value)} placeholder="Add claim type" className="block w-48 rounded-md border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={addCustomClaimType} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Add</button></div></div>
      </div>
      <OverridePanel title="State-specific overrides" description="Use when attorney coverage or routing standards differ by state." addLabel="Add state" onAdd={() => { const existing = new Set(stateOverrides.map((o) => o.state)); updateCustom({ stateGateOverrides: [...stateOverrides, { state: config.supportedJurisdictions.find((state) => !existing.has(state)) || 'CA', minCaseScore: config.minCaseScore, minEvidenceScore: config.minEvidenceScore, action: config.gateFailureAction }] }) }}>
        {stateOverrides.length === 0 ? <EmptyOverrides>No state-specific overrides yet.</EmptyOverrides> : stateOverrides.map((override, index) => <div key={`${override.state}-${index}`} className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4"><label><span className="text-xs font-medium text-slate-600">State</span><select value={override.state} onChange={(e) => updateOverride(stateOverrides, index, { state: e.target.value }, 'stateGateOverrides')} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm">{[...new Set([...config.supportedJurisdictions, override.state].filter(Boolean))].map((state) => <option key={state}>{state}</option>)}</select></label><label><span className="text-xs font-medium text-slate-600">Min case</span>{scoreInput(override.minCaseScore ?? config.minCaseScore, (minCaseScore) => updateOverride(stateOverrides, index, { minCaseScore }, 'stateGateOverrides'))}</label><label><span className="text-xs font-medium text-slate-600">Min evidence</span>{scoreInput(override.minEvidenceScore ?? config.minEvidenceScore, (minEvidenceScore) => updateOverride(stateOverrides, index, { minEvidenceScore }, 'stateGateOverrides'))}</label><label><span className="text-xs font-medium text-slate-600">Hold action</span><select value={override.action || config.gateFailureAction} onChange={(e) => updateOverride(stateOverrides, index, { action: e.target.value as MatchingRulesConfig['gateFailureAction'] }, 'stateGateOverrides')} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm">{actionOptions}</select></label><RemoveButton onClick={() => updateCustom({ stateGateOverrides: stateOverrides.filter((_, itemIndex) => itemIndex !== index) })} /></div>)}
      </OverridePanel>
      <OverridePanel title="County / jurisdiction overrides" description="Most specific rule. Example: CA + Los Angeles County." addLabel="Add jurisdiction" onAdd={() => updateCustom({ jurisdictionGateOverrides: [...jurisdictionOverrides, { state: config.supportedJurisdictions[0] || 'CA', jurisdiction: '', minCaseScore: config.minCaseScore, minEvidenceScore: config.minEvidenceScore, action: config.gateFailureAction }] })}>
        {jurisdictionOverrides.length === 0 ? <EmptyOverrides>No county or jurisdiction overrides yet.</EmptyOverrides> : jurisdictionOverrides.map((override, index) => <div key={`${override.state}-${override.jurisdiction}-${index}`} className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-5"><label><span className="text-xs font-medium text-slate-600">State</span><select value={override.state} onChange={(e) => updateOverride(jurisdictionOverrides, index, { state: e.target.value }, 'jurisdictionGateOverrides')} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm">{[...new Set([...config.supportedJurisdictions, override.state].filter(Boolean))].map((state) => <option key={state}>{state}</option>)}</select></label><label><span className="text-xs font-medium text-slate-600">Jurisdiction</span><input type="text" value={override.jurisdiction} onChange={(e) => updateOverride(jurisdictionOverrides, index, { jurisdiction: e.target.value }, 'jurisdictionGateOverrides')} placeholder="Los Angeles County" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label><label><span className="text-xs font-medium text-slate-600">Min case</span>{scoreInput(override.minCaseScore ?? config.minCaseScore, (minCaseScore) => updateOverride(jurisdictionOverrides, index, { minCaseScore }, 'jurisdictionGateOverrides'))}</label><label><span className="text-xs font-medium text-slate-600">Min evidence</span>{scoreInput(override.minEvidenceScore ?? config.minEvidenceScore, (minEvidenceScore) => updateOverride(jurisdictionOverrides, index, { minEvidenceScore }, 'jurisdictionGateOverrides'))}</label><label><span className="text-xs font-medium text-slate-600">Hold action</span><select value={override.action || config.gateFailureAction} onChange={(e) => updateOverride(jurisdictionOverrides, index, { action: e.target.value as MatchingRulesConfig['gateFailureAction'] }, 'jurisdictionGateOverrides')} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm">{actionOptions}</select></label><RemoveButton onClick={() => updateCustom({ jurisdictionGateOverrides: jurisdictionOverrides.filter((_, itemIndex) => itemIndex !== index) })} /></div>)}
      </OverridePanel>
      <OverridePanel title="Claim-specific overrides" description="Use stricter or looser thresholds for specific claim types." addLabel="Add override" onAdd={() => { const existing = new Set(claimOverrides.map((o) => o.claimType)); updateCustom({ claimTypeGateOverrides: [...claimOverrides, { claimType: config.supportedClaimTypes.find((claim) => !existing.has(claim)) || '', minCaseScore: config.minCaseScore, minEvidenceScore: config.minEvidenceScore, action: config.gateFailureAction }] }) }}>
        {claimOverrides.length === 0 ? <EmptyOverrides>No claim-specific overrides yet.</EmptyOverrides> : claimOverrides.map((override, index) => <div key={`${override.claimType}-${index}`} className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4"><label><span className="text-xs font-medium text-slate-600">Claim type</span><select value={override.claimType} onChange={(e) => updateOverride(claimOverrides, index, { claimType: e.target.value }, 'claimTypeGateOverrides')} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm">{[...new Set([...config.supportedClaimTypes, override.claimType].filter(Boolean))].map((claim) => <option key={claim} value={claim}>{formatClaimType(claim)}</option>)}</select></label><label><span className="text-xs font-medium text-slate-600">Min case</span>{scoreInput(override.minCaseScore ?? config.minCaseScore, (minCaseScore) => updateOverride(claimOverrides, index, { minCaseScore }, 'claimTypeGateOverrides'))}</label><label><span className="text-xs font-medium text-slate-600">Min evidence</span>{scoreInput(override.minEvidenceScore ?? config.minEvidenceScore, (minEvidenceScore) => updateOverride(claimOverrides, index, { minEvidenceScore }, 'claimTypeGateOverrides'))}</label><label><span className="text-xs font-medium text-slate-600">Hold action</span><select value={override.action || config.gateFailureAction} onChange={(e) => updateOverride(claimOverrides, index, { action: e.target.value as MatchingRulesConfig['gateFailureAction'] }, 'claimTypeGateOverrides')} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm">{actionOptions}</select></label><RemoveButton onClick={() => update({ claimTypeGateOverrides: claimOverrides.filter((_, itemIndex) => itemIndex !== index) })} /></div>)}
      </OverridePanel>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">{[['Mode', config.preRoutingGateMode], ['Global thresholds', `${Math.round(config.minCaseScore * 100)}% / ${Math.round(config.minEvidenceScore * 100)}%`], ['Supported surface', `${config.supportedJurisdictions.length} states, ${config.supportedClaimTypes.length} claims`], ['Overrides', `${stateOverrides.length + jurisdictionOverrides.length + claimOverrides.length} configured`]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold capitalize text-slate-900">{value}</p></div>)}</div>
    </section>
  )
}

function OverridePanel({ title, description, addLabel, onAdd, children }: { title: string; description: string; addLabel: string; onAdd: () => void; children: ReactNode }) {
  return <div className="mt-6 rounded-xl border border-slate-200"><div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="text-sm font-semibold text-slate-800">{title}</h3><p className="text-xs text-slate-500">{description}</p></div><button type="button" onClick={onAdd} className="w-full shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:w-fit">{addLabel}</button></div><div className="divide-y divide-slate-100">{children}</div></div>
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:col-span-2 lg:col-span-4 xl:col-span-5">Remove</button>
}

function EmptyOverrides({ children }: { children: ReactNode }) {
  return <div className="px-4 py-5 text-sm text-slate-500">{children}</div>
}
