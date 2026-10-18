/**
 * Firm Dashboard → Firm Templates → Demand letter templates. Each template is a
 * house style for the Super Demand: letterhead, tone, section order/headings,
 * standing opening and closing paragraphs, and the response window. Figures
 * still come from the case record; a template only shapes how they're presented.
 */

import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, FileSignature, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import {
  createFirmDemandStyle,
  deleteFirmDemandStyle,
  getFirmDemandStyles,
  updateFirmDemandStyle,
  type DemandStyle,
  type DemandStyleConfig,
  type DemandStylesResponse,
} from '../../lib/api'
import { SectionCard, EmptyState, Badge } from '../shared/ui'
import ConfirmDialog from '../../components/ConfirmDialog'

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60'
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

const TONES: Array<{ value: DemandStyleConfig['tone']; label: string; hint: string }> = [
  { value: 'measured', label: 'Measured', hint: 'Understated and professional; the facts carry the letter.' },
  { value: 'firm', label: 'Firm', hint: 'Confident and direct, without overstatement.' },
  { value: 'assertive', label: 'Assertive', hint: 'Pointed advocacy that presses liability and exposure.' },
]

function errorText(e: any, fallback: string): string {
  return e?.response?.data?.error || e?.response?.data?.detail || fallback
}

export function DemandStylesSection() {
  const [data, setData] = useState<DemandStylesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<DemandStyle | 'new' | null>(null)
  const [deleting, setDeleting] = useState<DemandStyle | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getFirmDemandStyles()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const canManage = data?.canManage ?? false

  const makeDefault = async (style: DemandStyle) => {
    setBusy(true)
    setError(null)
    try {
      await updateFirmDemandStyle(style.id, { isDefault: true })
      load()
    } catch (e) {
      setError(errorText(e, 'Could not set the default template.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    setError(null)
    try {
      await deleteFirmDemandStyle(deleting.id)
      setDeleting(null)
      load()
    } catch (e) {
      setError(errorText(e, 'Could not delete the template.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard
      title="Demand letter templates"
      trailing={
        canManage && !editing ? (
          <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> New demand template
          </button>
        ) : undefined
      }
    >
      <p className="mb-4 text-sm text-slate-500">
        Your firm&rsquo;s house style for Super Demand letters: letterhead, tone, section order and headings, standing
        opening and closing paragraphs, and the response window. The default template is used for every new demand
        unless the attorney picks another; figures always come from the case record.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
      )}

      {editing && data ? (
        <DemandStyleForm
          key={editing === 'new' ? 'new' : editing.id}
          value={editing === 'new' ? null : editing}
          meta={data}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      ) : loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
      ) : !data || data.styles.length === 0 ? (
        <EmptyState message="No demand templates yet. New demands use the ClearCaseIQ standard Super Demand package." />
      ) : (
        <div className="space-y-2">
          {data.styles.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span className="font-semibold text-slate-900">{s.name}</span>
                  {s.isDefault && <Badge tone="success">Firm default</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {s.config.letterhead === 'firm' ? 'Firm letterhead' : 'ClearCaseIQ heading'} ·{' '}
                  {TONES.find((t) => t.value === s.config.tone)?.label ?? s.config.tone} tone ·{' '}
                  {s.config.responseDays}-day response ·{' '}
                  {s.config.sections.filter((x) => x.include).length} sections
                  {s.updatedByName ? ` · Updated by ${s.updatedByName}` : ''}
                </p>
              </div>
              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  {!s.isDefault && (
                    <button type="button" className={btnGhost} onClick={() => makeDefault(s)} disabled={busy}>
                      <Star className="h-3.5 w-3.5" /> Make default
                    </button>
                  )}
                  <button type="button" className={btnGhost} onClick={() => setEditing(s)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    className={`${btnGhost} text-rose-600 hover:bg-rose-50`}
                    onClick={() => setDeleting(s)}
                    disabled={busy}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting != null}
        busy={busy}
        title="Delete this demand template?"
        message={
          <>
            &ldquo;{deleting?.name}&rdquo; will be removed for everyone at your firm. Letters already drafted with it keep
            their text; redrafting them uses the ClearCaseIQ standard package unless the attorney picks another template.
          </>
        }
        confirmLabel="Delete template"
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </SectionCard>
  )
}

function DemandStyleForm({
  value,
  meta,
  onCancel,
  onSaved,
}: {
  value: DemandStyle | null
  meta: DemandStylesResponse
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(value?.name ?? '')
  const [isDefault, setIsDefault] = useState(value?.isDefault ?? meta.styles.length === 0)
  const [config, setConfig] = useState<DemandStyleConfig>(() => structuredClone(value?.config ?? meta.defaults))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof DemandStyleConfig>(key: K, v: DemandStyleConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: v }))

  // Enclosures always close the letter, so it sits outside the reorderable list.
  const movable = config.sections.filter((s) => s.key !== 'enclosures')
  const enclosures = config.sections.find((s) => s.key === 'enclosures')

  const updateSections = (next: DemandStyleConfig['sections']) =>
    set('sections', enclosures ? [...next, enclosures] : next)

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= movable.length) return
    const next = [...movable]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateSections(next)
  }

  const patchSection = (index: number, patch: Partial<DemandStyleConfig['sections'][number]>) =>
    updateSections(movable.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  const save = async () => {
    if (!name.trim()) {
      setError('Give the template a name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = { name: name.trim(), config, isDefault }
      if (value) await updateFirmDemandStyle(value.id, body)
      else await createFirmDemandStyle(body)
      onSaved()
    } catch (e) {
      setError(errorText(e, 'Could not save the template.'))
    } finally {
      setSaving(false)
    }
  }

  const tokenList = meta.mergeTokens.map((t) => `{{${t}}}`).join('  ')
  const letterheadPreview = [meta.letterhead.name, meta.letterhead.address, meta.letterhead.phone].filter(Boolean).join(' · ')

  return (
    <div className="space-y-5 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Template name</label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard auto demand"
            maxLength={80}
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Use as the firm default for new demands
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Letterhead</label>
          <select
            className={inputCls}
            value={config.letterhead}
            onChange={(e) => set('letterhead', e.target.value as DemandStyleConfig['letterhead'])}
          >
            <option value="firm">Firm letterhead</option>
            <option value="clearcaseiq">ClearCaseIQ Super Demand heading</option>
          </select>
          {config.letterhead === 'firm' && (
            <p className="mt-1 text-xs text-slate-500">
              {letterheadPreview || 'Add your firm name, address, and phone under Firm Settings.'}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Tone</label>
          <select
            className={inputCls}
            value={config.tone}
            onChange={(e) => set('tone', e.target.value as DemandStyleConfig['tone'])}
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{TONES.find((t) => t.value === config.tone)?.hint}</p>
        </div>
        <div>
          <label className={labelCls}>Response window (days)</label>
          <input
            type="number"
            min={10}
            max={90}
            className={inputCls}
            value={config.responseDays}
            onChange={(e) => set('responseDays', Math.max(10, Math.min(90, Number(e.target.value) || 30)))}
          />
          <p className="mt-1 text-xs text-slate-500">Sets the good-faith settlement deadline (10–90 days).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Subtitle (optional)</label>
          <input
            className={inputCls}
            value={config.subtitle ?? ''}
            onChange={(e) => set('subtitle', e.target.value || null)}
            placeholder="e.g. Policy Limits Demand"
            maxLength={120}
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={config.confidentiality}
            onChange={(e) => set('confidentiality', e.target.checked)}
          />
          Include the settlement-communication confidentiality notice (Fed. R. Evid. 408; Cal. Evid. Code §§ 1152, 1154)
        </label>
      </div>

      <div>
        <label className={labelCls}>Sections</label>
        <p className="mb-2 text-xs text-slate-500">
          Reorder, rename, or switch off optional sections. Roman numerals are assigned automatically, and sections
          marked &ldquo;when claimed&rdquo; only appear if the case has those damages.
        </p>
        <ol className="space-y-1.5">
          {movable.map((s, i) => {
            const optional = meta.optionalSections.includes(s.key)
            const conditional = meta.shownWhenClaimed.includes(s.key)
            return (
              <li
                key={s.key}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                  s.include ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Move up"
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                    onClick={() => move(i, 1)}
                    disabled={i === movable.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <input
                  className={`${inputCls} py-1.5 ${s.include ? '' : 'text-slate-400'}`}
                  value={s.heading}
                  onChange={(e) => patchSection(i, { heading: e.target.value })}
                  onBlur={(e) => {
                    if (!e.target.value.trim()) patchSection(i, { heading: meta.sectionTitles[s.key] })
                  }}
                  maxLength={80}
                  aria-label={`Heading for ${meta.sectionTitles[s.key]}`}
                />
                {conditional && <Badge tone="neutral">When claimed</Badge>}
                {optional ? (
                  <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={s.include}
                      onChange={(e) => patchSection(i, { include: e.target.checked })}
                    />
                    Include
                  </label>
                ) : (
                  <span className="shrink-0 text-xs text-slate-400">Required</span>
                )}
              </li>
            )
          })}
          {enclosures && (
            <li className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              {enclosures.heading}
              <span className="ml-auto text-xs text-slate-400">Always last</span>
            </li>
          )}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div>
          <label className={labelCls}>Opening paragraph (optional)</label>
          <textarea
            className={inputCls}
            rows={4}
            value={config.openingText ?? ''}
            onChange={(e) => set('openingText', e.target.value || null)}
            placeholder="As you know, this firm represents {{client_name}} for injuries sustained on {{date_of_loss}}…"
            maxLength={2000}
          />
        </div>
        <div>
          <label className={labelCls}>Closing paragraph (optional)</label>
          <textarea
            className={inputCls}
            rows={4}
            value={config.closingText ?? ''}
            onChange={(e) => set('closingText', e.target.value || null)}
            placeholder="Please respond within {{response_days}} days. — {{attorney_name}}, {{firm_name}}"
            maxLength={2000}
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-slate-500">
        Merge fields: <code className="text-[11px] text-slate-600">{tokenList}</code>
      </p>

      <div>
        <label className={labelCls}>House style notes for the drafter (optional)</label>
        <textarea
          className={inputCls}
          rows={3}
          value={config.houseStyle ?? ''}
          onChange={(e) => set('houseStyle', e.target.value || null)}
          placeholder="e.g. Refer to our client as Ms./Mr. surname. Avoid the word 'accident'; say 'collision'."
          maxLength={1000}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : value ? 'Save template' : 'Create template'}
        </button>
      </div>
    </div>
  )
}
