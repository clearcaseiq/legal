/**
 * Firm Dashboard → Workflow tab. A firm-level, customizable case-lifecycle
 * pipeline: each workflow is a set of ordered stages, and each stage holds a
 * checklist of steps (with a suggested assignee role, a due offset, a
 * required flag, and an optional linked firm template).
 *
 * Firms can seed a recommended default and keep several named workflows (e.g.
 * one per practice area), marking one as the firm default. This pass defines
 * and customizes the templates; applying a workflow to a specific case and
 * tracking progress comes later.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Workflow as WorkflowIcon,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Save,
  Clock,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import {
  getFirmWorkflows,
  createFirmWorkflow,
  seedDefaultFirmWorkflow,
  updateFirmWorkflow,
  saveFirmWorkflowStructure,
  deleteFirmWorkflow,
  type FirmWorkflow,
  type FirmWorkflowStage,
  type FirmWorkflowStep,
  type FirmWorkflowsResponse,
} from '../../lib/api'
import { SectionCard, EmptyState, Badge } from '../shared/ui'

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60'
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

const emptyStep = (): FirmWorkflowStep => ({
  title: '',
  description: null,
  assigneeRole: null,
  dueOffsetDays: null,
  required: false,
  templateId: null,
})

function clone(w: FirmWorkflow): FirmWorkflow {
  return JSON.parse(JSON.stringify(w))
}

export function FirmWorkflowsTab() {
  const [data, setData] = useState<FirmWorkflowsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FirmWorkflow | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (selectId?: string) => {
    setLoading(true)
    try {
      const res = await getFirmWorkflows()
      setData(res)
      const next =
        (selectId && res.workflows.find((w) => w.id === selectId)) ||
        res.workflows.find((w) => w.id === selectedId) ||
        res.workflows[0] ||
        null
      setSelectedId(next?.id ?? null)
      setDraft(next ? clone(next) : null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const canManage = data?.canManage ?? false
  const roles = data?.roles ?? []
  const templates = data?.templates ?? []

  const select = (w: FirmWorkflow) => {
    setSelectedId(w.id)
    setDraft(clone(w))
  }

  const seed = async () => {
    setBusy(true)
    try {
      const created = await seedDefaultFirmWorkflow()
      await load(created.id)
    } finally {
      setBusy(false)
    }
  }

  const createNew = async () => {
    setBusy(true)
    try {
      const created = await createFirmWorkflow({ name: 'New workflow' })
      await load(created.id)
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!draft) return
    if (!draft.name.trim()) {
      alert('Give the workflow a name before saving.')
      return
    }
    setBusy(true)
    try {
      await updateFirmWorkflow(draft.id, {
        name: draft.name.trim(),
        description: draft.description,
        practiceArea: draft.practiceArea,
        isActive: draft.isActive,
      })
      const saved = await saveFirmWorkflowStructure(draft.id, draft.stages)
      await load(saved.id)
    } finally {
      setBusy(false)
    }
  }

  const applyWorkflow = async () => {
    if (!draft) return
    if (
      !confirm(
        `Apply "${draft.name}" as your firm's standard workflow? New matters will follow these stages, and it replaces any previously applied workflow.`
      )
    )
      return
    setBusy(true)
    try {
      // Applying makes it the firm norm and ensures it's available for use.
      await updateFirmWorkflow(draft.id, { isDefault: true, isActive: true })
      await load(draft.id)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!draft) return
    if (!confirm(`Delete the "${draft.name}" workflow? This cannot be undone.`)) return
    setBusy(true)
    try {
      await deleteFirmWorkflow(draft.id)
      await load()
    } finally {
      setBusy(false)
    }
  }

  // ---- draft mutations (immutable) ----------------------------------------

  const patchDraft = (patch: Partial<FirmWorkflow>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  const setStages = (updater: (stages: FirmWorkflowStage[]) => FirmWorkflowStage[]) =>
    setDraft((d) => (d ? { ...d, stages: updater(d.stages) } : d))

  const addStage = () =>
    setStages((s) => [...s, { name: 'New stage', description: null, steps: [] }])

  const patchStage = (si: number, patch: Partial<FirmWorkflowStage>) =>
    setStages((s) => s.map((st, i) => (i === si ? { ...st, ...patch } : st)))

  const removeStage = (si: number) => setStages((s) => s.filter((_, i) => i !== si))

  const moveStage = (si: number, dir: -1 | 1) =>
    setStages((s) => {
      const j = si + dir
      if (j < 0 || j >= s.length) return s
      const next = [...s]
      ;[next[si], next[j]] = [next[j], next[si]]
      return next
    })

  const addStep = (si: number) =>
    setStages((s) => s.map((st, i) => (i === si ? { ...st, steps: [...st.steps, emptyStep()] } : st)))

  const patchStep = (si: number, ti: number, patch: Partial<FirmWorkflowStep>) =>
    setStages((s) =>
      s.map((st, i) =>
        i === si ? { ...st, steps: st.steps.map((sp, j) => (j === ti ? { ...sp, ...patch } : sp)) } : st
      )
    )

  const removeStep = (si: number, ti: number) =>
    setStages((s) => s.map((st, i) => (i === si ? { ...st, steps: st.steps.filter((_, j) => j !== ti) } : st)))

  const moveStep = (si: number, ti: number, dir: -1 | 1) =>
    setStages((s) =>
      s.map((st, i) => {
        if (i !== si) return st
        const j = ti + dir
        if (j < 0 || j >= st.steps.length) return st
        const steps = [...st.steps]
        ;[steps[ti], steps[j]] = [steps[j], steps[ti]]
        return { ...st, steps }
      })
    )

  const stepTally = useMemo(
    () => (draft ? draft.stages.reduce((n, s) => n + s.steps.length, 0) : 0),
    [draft]
  )

  return (
    <SectionCard
      title="Workflow"
      trailing={
        canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnGhost} onClick={seed} disabled={busy}>
              <Sparkles className="h-3.5 w-3.5" /> Add default workflow
            </button>
            <button type="button" className={btnPrimary} onClick={createNew} disabled={busy}>
              <Plus className="h-3.5 w-3.5" /> New workflow
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="p-4">
        <p className="mb-4 max-w-3xl text-sm text-slate-500">
          Standardize how your firm runs a matter. Each workflow is a set of stages, and each stage has a checklist of
          steps with a suggested owner, a due target, and an optional linked document.
        </p>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading workflows…</div>
        ) : !data || data.workflows.length === 0 ? (
          <EmptyState
            message={
              canManage
                ? 'No workflows yet. Add the recommended default to get started, or create your own.'
                : 'No workflows have been set up for your firm yet.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px,1fr]">
            {/* Workflow list */}
            <div className="space-y-2">
              {data.workflows.map((w) => {
                const active = w.id === selectedId
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => select(w)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <WorkflowIcon className="h-4 w-4 shrink-0 text-indigo-600" />
                      <span className="min-w-0 truncate font-semibold text-slate-900">{w.name}</span>
                      {w.isDefault && <Badge tone="success">Applied</Badge>}
                      {!w.isActive && !w.isDefault && <Badge tone="neutral">Hidden</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {w.practiceArea ? `${w.practiceArea} · ` : ''}
                      {w.stageCount} stage{w.stageCount === 1 ? '' : 's'} · {w.stepCount} step
                      {w.stepCount === 1 ? '' : 's'}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Editor */}
            {draft ? (
              <div className="min-w-0 space-y-4">
                {/* Metadata */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Workflow name</label>
                      <input
                        className={inputCls}
                        value={draft.name}
                        disabled={!canManage}
                        onChange={(e) => patchDraft({ name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Practice area</label>
                      <input
                        className={inputCls}
                        value={draft.practiceArea ?? ''}
                        disabled={!canManage}
                        placeholder="e.g. Personal Injury"
                        onChange={(e) => patchDraft({ practiceArea: e.target.value || null })}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className={labelCls}>Description</label>
                    <textarea
                      className={`${inputCls} min-h-[60px]`}
                      value={draft.description ?? ''}
                      disabled={!canManage}
                      onChange={(e) => patchDraft({ description: e.target.value || null })}
                    />
                  </div>
                  {canManage && (
                    <div className="mt-3 space-y-3">
                      {/* Applied status — the firm's standard workflow ("the norm"). */}
                      {draft.isDefault ? (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>
                            <strong>Applied.</strong> This is your firm's standard workflow — new matters follow these
                            stages.
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                          <span className="text-sm text-slate-600">
                            Not applied. Apply it to make it your firm's standard workflow.
                          </span>
                          <button type="button" className={btnPrimary} onClick={applyWorkflow} disabled={busy}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Apply this workflow
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            disabled={draft.isDefault}
                            onChange={(e) => patchDraft({ isActive: e.target.checked })}
                          />
                          Available for use
                        </label>
                        <div className="ml-auto flex items-center gap-2">
                          <button type="button" className={btnGhost} onClick={remove} disabled={busy}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                          <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
                            <Save className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save changes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stages */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">
                      {draft.stages.length} stage{draft.stages.length === 1 ? '' : 's'} · {stepTally} step
                      {stepTally === 1 ? '' : 's'}
                    </h4>
                    {canManage && (
                      <button type="button" className={btnGhost} onClick={addStage}>
                        <Plus className="h-3.5 w-3.5" /> Add stage
                      </button>
                    )}
                  </div>

                  {draft.stages.length === 0 ? (
                    <EmptyState message="No stages yet. Add a stage to build the pipeline." />
                  ) : (
                    draft.stages.map((stage, si) => (
                      <StageCard
                        key={si}
                        stage={stage}
                        index={si}
                        total={draft.stages.length}
                        roles={roles}
                        templates={templates}
                        canManage={canManage}
                        onPatch={(patch) => patchStage(si, patch)}
                        onRemove={() => removeStage(si)}
                        onMove={(dir) => moveStage(si, dir)}
                        onAddStep={() => addStep(si)}
                        onPatchStep={(ti, patch) => patchStep(si, ti, patch)}
                        onRemoveStep={(ti) => removeStep(si, ti)}
                        onMoveStep={(ti, dir) => moveStep(si, ti, dir)}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : (
              <EmptyState message="Select a workflow to view or edit it." />
            )}
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function StageCard({
  stage,
  index,
  total,
  roles,
  templates,
  canManage,
  onPatch,
  onRemove,
  onMove,
  onAddStep,
  onPatchStep,
  onRemoveStep,
  onMoveStep,
}: {
  stage: FirmWorkflowStage
  index: number
  total: number
  roles: FirmWorkflowsResponse['roles']
  templates: FirmWorkflowsResponse['templates']
  canManage: boolean
  onPatch: (patch: Partial<FirmWorkflowStage>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onAddStep: () => void
  onPatchStep: (ti: number, patch: Partial<FirmWorkflowStep>) => void
  onRemoveStep: (ti: number) => void
  onMoveStep: (ti: number, dir: -1 | 1) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex items-start gap-2 border-b border-slate-100 bg-slate-50/70 p-3">
        <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            className={`${inputCls} font-semibold`}
            value={stage.name}
            disabled={!canManage}
            placeholder="Stage name"
            onChange={(e) => onPatch({ name: e.target.value })}
          />
          <input
            className={`${inputCls} text-xs`}
            value={stage.description ?? ''}
            disabled={!canManage}
            placeholder="Short description (optional)"
            onChange={(e) => onPatch({ description: e.target.value || null })}
          />
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 disabled:opacity-30"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              title="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 disabled:opacity-30"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-rose-400 hover:bg-rose-50"
              onClick={onRemove}
              title="Remove stage"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        {stage.steps.length === 0 ? (
          <p className="px-1 py-2 text-xs text-slate-400">No steps in this stage yet.</p>
        ) : (
          stage.steps.map((step, ti) => (
            <StepRow
              key={ti}
              step={step}
              index={ti}
              total={stage.steps.length}
              roles={roles}
              templates={templates}
              canManage={canManage}
              onPatch={(patch) => onPatchStep(ti, patch)}
              onRemove={() => onRemoveStep(ti)}
              onMove={(dir) => onMoveStep(ti, dir)}
            />
          ))
        )}
        {canManage && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
            onClick={onAddStep}
          >
            <Plus className="h-3.5 w-3.5" /> Add step
          </button>
        )}
      </div>
    </div>
  )
}

function StepRow({
  step,
  index,
  total,
  roles,
  templates,
  canManage,
  onPatch,
  onRemove,
  onMove,
}: {
  step: FirmWorkflowStep
  index: number
  total: number
  roles: FirmWorkflowsResponse['roles']
  templates: FirmWorkflowsResponse['templates']
  canManage: boolean
  onPatch: (patch: Partial<FirmWorkflowStep>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-center gap-2">
        <input
          className={`${inputCls} flex-1 py-1.5`}
          value={step.title}
          disabled={!canManage}
          placeholder="Step / task title"
          onChange={(e) => onPatch({ title: e.target.value })}
        />
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              title="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1 text-rose-400 hover:bg-rose-50"
              onClick={onRemove}
              title="Remove step"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {/* Assignee role */}
        <select
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-none disabled:opacity-60"
          value={step.assigneeRole ?? ''}
          disabled={!canManage}
          onChange={(e) => onPatch({ assigneeRole: e.target.value || null })}
        >
          <option value="">Any owner</option>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        {/* Due offset */}
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-600">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          Day
          <input
            type="number"
            min={0}
            className="w-14 rounded border border-slate-200 px-1 py-0.5 text-xs disabled:opacity-60"
            value={step.dueOffsetDays ?? ''}
            disabled={!canManage}
            placeholder="—"
            onChange={(e) => onPatch({ dueOffsetDays: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </span>

        {/* Required */}
        <label className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-slate-600">
          <input
            type="checkbox"
            checked={step.required}
            disabled={!canManage}
            onChange={(e) => onPatch({ required: e.target.checked })}
          />
          Required
        </label>

        {/* Linked template */}
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-600">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <select
            className="max-w-[180px] bg-transparent text-xs text-slate-700 focus:outline-none disabled:opacity-60"
            value={step.templateId ?? ''}
            disabled={!canManage}
            onChange={(e) => onPatch({ templateId: e.target.value || null })}
          >
            <option value="">No document</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </span>
      </div>
    </div>
  )
}
