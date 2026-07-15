/**
 * Firm Dashboard → Workflow tab. A firm-level, customizable case pipeline:
 * each workflow is a practice-area "program" made of ordered PHASES (e.g.
 * Intake → Medical → Settlement → Litigation → Closing). Each phase holds one
 * or more STAGES, and each stage a checklist of typed STEPS (task, milestone,
 * checkpoint, deadline, document, or read-only AI milestone). Steps can carry a
 * suggested owner, a due offset, a required flag, a linked firm template, and an
 * optional apply-time condition.
 *
 * Firms seed a recommended default and keep several named workflows, marking one
 * as the firm default ("Applied"). Applying to a specific case + progress
 * tracking happens on the case workspace.
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
  Layers,
  Sparkle,
  Filter,
  User,
} from 'lucide-react'
import {
  getFirmWorkflows,
  createFirmWorkflow,
  seedDefaultFirmWorkflow,
  updateFirmWorkflow,
  saveFirmWorkflowStructure,
  deleteFirmWorkflow,
  type FirmWorkflow,
  type FirmWorkflowPhase,
  type FirmWorkflowStage,
  type FirmWorkflowStep,
  type FirmWorkflowsResponse,
  type WorkflowStepType,
} from '../../lib/api'
import { SectionCard, EmptyState, Badge } from '../shared/ui'

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60'
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'
const miniSelect =
  'rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-none disabled:opacity-60'

const emptyStep = (): FirmWorkflowStep => ({
  title: '',
  description: null,
  stepType: 'task',
  aiSignal: null,
  assigneeRole: null,
  assigneeFirmMemberId: null,
  dueOffsetDays: null,
  required: false,
  templateId: null,
  conditionField: null,
  conditionOp: null,
  conditionValue: null,
})

const emptyStage = (): FirmWorkflowStage => ({ name: 'New stage', description: null, steps: [] })
const emptyPhase = (): FirmWorkflowPhase => ({ name: 'New phase', key: null, description: null, stages: [emptyStage()] })

function clone(w: FirmWorkflow): FirmWorkflow {
  return JSON.parse(JSON.stringify(w))
}

const STEP_TONE: Record<WorkflowStepType, string> = {
  task: 'text-slate-500',
  milestone: 'text-amber-600',
  checkpoint: 'text-sky-600',
  deadline: 'text-rose-600',
  document: 'text-indigo-600',
  ai_milestone: 'text-violet-600',
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
  const stepTypes = data?.stepTypes ?? []
  const aiSignals = data?.aiSignals ?? []
  const conditionFields = data?.conditionFields ?? []
  const conditionOps = data?.conditionOps ?? []
  const members = data?.members ?? []

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
      const saved = await saveFirmWorkflowStructure(draft.id, draft.phases)
      await load(saved.id)
    } finally {
      setBusy(false)
    }
  }

  const applyWorkflow = async () => {
    if (!draft) return
    if (
      !confirm(
        `Apply "${draft.name}" as your firm's standard workflow? New matters will follow this pipeline, and it replaces any previously applied workflow.`
      )
    )
      return
    setBusy(true)
    try {
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

  const setPhases = (updater: (phases: FirmWorkflowPhase[]) => FirmWorkflowPhase[]) =>
    setDraft((d) => (d ? { ...d, phases: updater(d.phases) } : d))

  const mapPhase = (pi: number, fn: (p: FirmWorkflowPhase) => FirmWorkflowPhase) =>
    setPhases((phases) => phases.map((p, i) => (i === pi ? fn(p) : p)))
  const mapStage = (pi: number, si: number, fn: (s: FirmWorkflowStage) => FirmWorkflowStage) =>
    mapPhase(pi, (p) => ({ ...p, stages: p.stages.map((s, i) => (i === si ? fn(s) : s)) }))

  const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir
    if (j < 0 || j >= arr.length) return arr
    const next = [...arr]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  }

  const addPhase = () => setPhases((p) => [...p, emptyPhase()])
  const patchPhase = (pi: number, patch: Partial<FirmWorkflowPhase>) => mapPhase(pi, (p) => ({ ...p, ...patch }))
  const removePhase = (pi: number) => setPhases((p) => p.filter((_, i) => i !== pi))
  const movePhase = (pi: number, dir: -1 | 1) => setPhases((p) => move(p, pi, dir))

  const addStage = (pi: number) => mapPhase(pi, (p) => ({ ...p, stages: [...p.stages, emptyStage()] }))
  const patchStage = (pi: number, si: number, patch: Partial<FirmWorkflowStage>) =>
    mapStage(pi, si, (s) => ({ ...s, ...patch }))
  const removeStage = (pi: number, si: number) =>
    mapPhase(pi, (p) => ({ ...p, stages: p.stages.filter((_, i) => i !== si) }))
  const moveStage = (pi: number, si: number, dir: -1 | 1) =>
    mapPhase(pi, (p) => ({ ...p, stages: move(p.stages, si, dir) }))

  const addStep = (pi: number, si: number) => mapStage(pi, si, (s) => ({ ...s, steps: [...s.steps, emptyStep()] }))
  const patchStep = (pi: number, si: number, ti: number, patch: Partial<FirmWorkflowStep>) =>
    mapStage(pi, si, (s) => ({ ...s, steps: s.steps.map((sp, j) => (j === ti ? { ...sp, ...patch } : sp)) }))
  const removeStep = (pi: number, si: number, ti: number) =>
    mapStage(pi, si, (s) => ({ ...s, steps: s.steps.filter((_, j) => j !== ti) }))
  const moveStep = (pi: number, si: number, ti: number, dir: -1 | 1) =>
    mapStage(pi, si, (s) => ({ ...s, steps: move(s.steps, ti, dir) }))

  const tally = useMemo(() => {
    if (!draft) return { phases: 0, stages: 0, steps: 0 }
    const phases = draft.phases.length
    const stages = draft.phases.reduce((n, p) => n + p.stages.length, 0)
    const steps = draft.phases.reduce((n, p) => n + p.stages.reduce((m, s) => m + s.steps.length, 0), 0)
    return { phases, stages, steps }
  }, [draft])

  const editor = { roles, templates, stepTypes, aiSignals, conditionFields, conditionOps, members, canManage }

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
          Standardize how your firm runs a matter. A workflow is a pipeline of phases (Intake → Closing); each phase has
          stages, and each stage a checklist of typed steps. AI milestones update automatically; conditional steps only
          apply to matching cases.
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
                      {w.phaseCount} phase{w.phaseCount === 1 ? '' : 's'} · {w.stepCount} step
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
                      {draft.isDefault ? (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>
                            <strong>Applied.</strong> This is your firm's standard workflow — new matters follow this
                            pipeline.
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

                {/* Phases */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">
                      {tally.phases} phase{tally.phases === 1 ? '' : 's'} · {tally.stages} stage
                      {tally.stages === 1 ? '' : 's'} · {tally.steps} step{tally.steps === 1 ? '' : 's'}
                    </h4>
                    {canManage && (
                      <button type="button" className={btnGhost} onClick={addPhase}>
                        <Plus className="h-3.5 w-3.5" /> Add phase
                      </button>
                    )}
                  </div>

                  {draft.phases.length === 0 ? (
                    <EmptyState message="No phases yet. Add a phase to build the pipeline." />
                  ) : (
                    draft.phases.map((phase, pi) => (
                      <PhaseCard
                        key={pi}
                        phase={phase}
                        index={pi}
                        total={draft.phases.length}
                        editor={editor}
                        onPatch={(patch) => patchPhase(pi, patch)}
                        onRemove={() => removePhase(pi)}
                        onMove={(dir) => movePhase(pi, dir)}
                        onAddStage={() => addStage(pi)}
                        onPatchStage={(si, patch) => patchStage(pi, si, patch)}
                        onRemoveStage={(si) => removeStage(pi, si)}
                        onMoveStage={(si, dir) => moveStage(pi, si, dir)}
                        onAddStep={(si) => addStep(pi, si)}
                        onPatchStep={(si, ti, patch) => patchStep(pi, si, ti, patch)}
                        onRemoveStep={(si, ti) => removeStep(pi, si, ti)}
                        onMoveStep={(si, ti, dir) => moveStep(pi, si, ti, dir)}
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

interface EditorMeta {
  roles: FirmWorkflowsResponse['roles']
  templates: FirmWorkflowsResponse['templates']
  stepTypes: FirmWorkflowsResponse['stepTypes']
  aiSignals: FirmWorkflowsResponse['aiSignals']
  conditionFields: FirmWorkflowsResponse['conditionFields']
  conditionOps: FirmWorkflowsResponse['conditionOps']
  members: FirmWorkflowsResponse['members']
  canManage: boolean
}

function PhaseCard({
  phase,
  index,
  total,
  editor,
  onPatch,
  onRemove,
  onMove,
  onAddStage,
  onPatchStage,
  onRemoveStage,
  onMoveStage,
  onAddStep,
  onPatchStep,
  onRemoveStep,
  onMoveStep,
}: {
  phase: FirmWorkflowPhase
  index: number
  total: number
  editor: EditorMeta
  onPatch: (patch: Partial<FirmWorkflowPhase>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onAddStage: () => void
  onPatchStage: (si: number, patch: Partial<FirmWorkflowStage>) => void
  onRemoveStage: (si: number) => void
  onMoveStage: (si: number, dir: -1 | 1) => void
  onAddStep: (si: number) => void
  onPatchStep: (si: number, ti: number, patch: Partial<FirmWorkflowStep>) => void
  onRemoveStep: (si: number, ti: number) => void
  onMoveStep: (si: number, ti: number, dir: -1 | 1) => void
}) {
  const { canManage } = editor
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/30">
      <div className="flex items-start gap-2 rounded-t-xl border-b border-indigo-100 bg-indigo-50/70 p-3">
        <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 shrink-0 text-indigo-600" />
            <input
              className={`${inputCls} font-semibold`}
              value={phase.name}
              disabled={!canManage}
              placeholder="Phase name (e.g. Intake)"
              onChange={(e) => onPatch({ name: e.target.value })}
            />
          </div>
          <input
            className={`${inputCls} text-xs`}
            value={phase.description ?? ''}
            disabled={!canManage}
            placeholder="Phase description (optional)"
            onChange={(e) => onPatch({ description: e.target.value || null })}
          />
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <IconBtn title="Move up" onClick={() => onMove(-1)} disabled={index === 0}>
              <ChevronUp className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Move down" onClick={() => onMove(1)} disabled={index === total - 1}>
              <ChevronDown className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Remove phase" onClick={onRemove} tone="danger">
              <Trash2 className="h-4 w-4" />
            </IconBtn>
          </div>
        )}
      </div>

      <div className="space-y-3 p-3">
        {phase.stages.length === 0 ? (
          <p className="px-1 py-2 text-xs text-slate-400">No stages in this phase yet.</p>
        ) : (
          phase.stages.map((stage, si) => (
            <StageCard
              key={si}
              stage={stage}
              index={si}
              total={phase.stages.length}
              editor={editor}
              onPatch={(patch) => onPatchStage(si, patch)}
              onRemove={() => onRemoveStage(si)}
              onMove={(dir) => onMoveStage(si, dir)}
              onAddStep={() => onAddStep(si)}
              onPatchStep={(ti, patch) => onPatchStep(si, ti, patch)}
              onRemoveStep={(ti) => onRemoveStep(si, ti)}
              onMoveStep={(ti, dir) => onMoveStep(si, ti, dir)}
            />
          ))
        )}
        {canManage && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            onClick={onAddStage}
          >
            <Plus className="h-3.5 w-3.5" /> Add stage
          </button>
        )}
      </div>
    </div>
  )
}

function StageCard({
  stage,
  index,
  total,
  editor,
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
  editor: EditorMeta
  onPatch: (patch: Partial<FirmWorkflowStage>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onAddStep: () => void
  onPatchStep: (ti: number, patch: Partial<FirmWorkflowStep>) => void
  onRemoveStep: (ti: number) => void
  onMoveStep: (ti: number, dir: -1 | 1) => void
}) {
  const { canManage } = editor
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-2 border-b border-slate-100 bg-slate-50/70 p-3">
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
            <IconBtn title="Move up" onClick={() => onMove(-1)} disabled={index === 0}>
              <ChevronUp className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Move down" onClick={() => onMove(1)} disabled={index === total - 1}>
              <ChevronDown className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Remove stage" onClick={onRemove} tone="danger">
              <Trash2 className="h-4 w-4" />
            </IconBtn>
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
              editor={editor}
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
  editor,
  onPatch,
  onRemove,
  onMove,
}: {
  step: FirmWorkflowStep
  index: number
  total: number
  editor: EditorMeta
  onPatch: (patch: Partial<FirmWorkflowStep>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const { roles, templates, stepTypes, aiSignals, conditionFields, conditionOps, members, canManage } = editor
  const isAi = step.stepType === 'ai_milestone'
  const hasCondition = Boolean(step.conditionField)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-center gap-2">
        <Sparkle className={`h-3.5 w-3.5 shrink-0 ${STEP_TONE[step.stepType] || 'text-slate-400'}`} />
        <input
          className={`${inputCls} flex-1 py-1.5`}
          value={step.title}
          disabled={!canManage}
          placeholder={isAi ? 'AI milestone label' : 'Step / task title'}
          onChange={(e) => onPatch({ title: e.target.value })}
        />
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <IconBtn title="Move up" onClick={() => onMove(-1)} disabled={index === 0} size="sm">
              <ChevronUp className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Move down" onClick={() => onMove(1)} disabled={index === total - 1} size="sm">
              <ChevronDown className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Remove step" onClick={onRemove} tone="danger" size="sm">
              <Trash2 className="h-4 w-4" />
            </IconBtn>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {/* Step type */}
        <select
          className={miniSelect}
          value={step.stepType}
          disabled={!canManage}
          onChange={(e) => {
            const stepType = e.target.value as WorkflowStepType
            onPatch({
              stepType,
              // Switching to/from AI clears fields that don't apply.
              ...(stepType === 'ai_milestone'
                ? { assigneeRole: null, dueOffsetDays: null, required: false }
                : { aiSignal: null }),
            })
          }}
        >
          {stepTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {isAi ? (
          /* AI signal picker (read-only milestone) */
          <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            <select
              className="max-w-[200px] bg-transparent text-xs text-violet-700 focus:outline-none disabled:opacity-60"
              value={step.aiSignal ?? ''}
              disabled={!canManage}
              onChange={(e) => onPatch({ aiSignal: e.target.value || null })}
            >
              <option value="">Choose signal…</option>
              {aiSignals.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </span>
        ) : (
          <>
            {/* Assignee role */}
            <select
              className={miniSelect}
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

            {/* Default assignee (specific person) */}
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-600">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <select
                className="max-w-[160px] bg-transparent text-xs text-slate-700 focus:outline-none disabled:opacity-60"
                value={step.assigneeFirmMemberId ?? ''}
                disabled={!canManage}
                onChange={(e) => onPatch({ assigneeFirmMemberId: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.firmMemberId} value={m.firmMemberId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </span>

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
          </>
        )}
      </div>

      {/* Condition (apply-time) */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-slate-500">
          <Filter className="h-3.5 w-3.5" /> Only if
        </span>
        <select
          className={miniSelect}
          value={step.conditionField ?? ''}
          disabled={!canManage}
          onChange={(e) => {
            const conditionField = e.target.value || null
            onPatch(
              conditionField
                ? { conditionField, conditionOp: step.conditionOp || conditionOps[0]?.value || 'eq' }
                : { conditionField: null, conditionOp: null, conditionValue: null }
            )
          }}
        >
          <option value="">Always</option>
          {conditionFields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {hasCondition && (
          <>
            <select
              className={miniSelect}
              value={step.conditionOp ?? ''}
              disabled={!canManage}
              onChange={(e) => onPatch({ conditionOp: e.target.value || null })}
            >
              {conditionOps.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              className="w-40 rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-60"
              value={step.conditionValue ?? ''}
              disabled={!canManage}
              placeholder="value(s), comma-separated"
              onChange={(e) => onPatch({ conditionValue: e.target.value || null })}
            />
          </>
        )}
      </div>
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
  tone,
  size,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  title: string
  tone?: 'danger'
  size?: 'sm'
}) {
  const pad = size === 'sm' ? 'p-1' : 'p-1.5'
  const color = tone === 'danger' ? 'text-rose-400 hover:bg-rose-50' : 'text-slate-400 hover:bg-slate-200'
  return (
    <button
      type="button"
      className={`rounded-md ${pad} ${color} disabled:opacity-30`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )
}
