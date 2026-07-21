/**
 * Case Workspace → Workflow tab. Renders the firm's applied workflow as a live
 * VISUAL PIPELINE for this case: a horizontal phase strip (with per-phase
 * progress and current-phase highlight), then each phase's stages and typed
 * steps. Regular steps can be checked off; AI milestones are read-only and
 * derived automatically. If the case has no workflow yet, offers to apply the
 * firm's standard one.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  User,
  Loader2,
  Sparkles,
  ListChecks,
  Flag,
  MapPin,
  AlarmClock,
  ClipboardList,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  getCaseWorkflow,
  applyCaseWorkflow,
  updateCaseWorkflowStep,
  assignCaseWorkflowStep,
  addCaseWorkflowStep,
  deleteCaseWorkflowStep,
  type CaseWorkflow,
  type CaseWorkflowPhase,
  type CaseWorkflowStep,
  type FirmMemberOption,
  type WorkflowStepType,
} from '../../lib/api'

const ROLE_LABELS: Record<string, string> = {
  attorney: 'Attorney',
  paralegal: 'Paralegal',
  case_manager: 'Case manager',
  intake_specialist: 'Intake',
  legal_assistant: 'Legal assistant',
  demand_writer: 'Demand writer',
  billing_admin: 'Billing',
  firm_admin: 'Firm admin',
}

const STEP_ICON: Record<WorkflowStepType, React.ComponentType<{ className?: string }>> = {
  task: ClipboardList,
  milestone: Flag,
  checkpoint: MapPin,
  deadline: AlarmClock,
  document: FileText,
  ai_milestone: Sparkles,
}
const STEP_TONE: Record<WorkflowStepType, string> = {
  task: 'text-slate-400',
  milestone: 'text-amber-500',
  checkpoint: 'text-sky-500',
  deadline: 'text-rose-500',
  document: 'text-indigo-500',
  ai_milestone: 'text-violet-500',
}

function dueMeta(dueDate: string | null, done: boolean) {
  if (!dueDate) return null
  const ts = Date.parse(dueDate)
  if (Number.isNaN(ts)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = Math.round((new Date(ts).setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000)
  const label = new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (done) return { label, cls: 'text-slate-400' }
  if (d < 0) return { label: `${label} · ${Math.abs(d)}d overdue`, cls: 'text-rose-600' }
  if (d === 0) return { label: `${label} · today`, cls: 'text-amber-600' }
  if (d <= 7) return { label: `${label} · in ${d}d`, cls: 'text-amber-600' }
  return { label, cls: 'text-slate-500' }
}

export default function CaseWorkflowPanel({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(true)
  const [workflow, setWorkflow] = useState<CaseWorkflow | null>(null)
  const [canApply, setCanApply] = useState(false)
  const [appliedName, setAppliedName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [members, setMembers] = useState<FirmMemberOption[]>([])
  const [canAssign, setCanAssign] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCaseWorkflow(leadId)
      setWorkflow(res.workflow)
      setCanApply(res.canApply)
      setAppliedName(res.appliedWorkflow?.name ?? null)
      setMembers(res.members ?? [])
      setCanAssign(res.canAssign ?? false)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    load()
  }, [load])

  const apply = async () => {
    setBusy(true)
    try {
      const res = await applyCaseWorkflow(leadId)
      setWorkflow(res.workflow)
      setCanApply(false)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to apply workflow')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (step: CaseWorkflowStep) => {
    if (step.readOnly) return
    const next = step.status === 'done' ? 'pending' : 'done'
    setPendingId(step.id)
    try {
      const res = await updateCaseWorkflowStep(leadId, step.id, next)
      setWorkflow(res.workflow)
    } catch {
      load()
    } finally {
      setPendingId(null)
    }
  }

  const assign = async (step: CaseWorkflowStep, firmMemberId: string | null) => {
    if (step.readOnly) return
    setPendingId(step.id)
    try {
      const res = await assignCaseWorkflowStep(leadId, step.id, firmMemberId)
      setWorkflow(res.workflow)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to assign step')
      load()
    } finally {
      setPendingId(null)
    }
  }

  const addTask = async (payload: Parameters<typeof addCaseWorkflowStep>[1]) => {
    const res = await addCaseWorkflowStep(leadId, payload)
    setWorkflow(res.workflow)
  }

  const removeTask = async (step: CaseWorkflowStep) => {
    if (!window.confirm(`Delete task "${step.title}"?`)) return
    setPendingId(step.id)
    try {
      const res = await deleteCaseWorkflowStep(leadId, step.id)
      setWorkflow(res.workflow)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to delete task')
      load()
    } finally {
      setPendingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading workflow…
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <ListChecks className="mx-auto h-8 w-8 text-slate-300" />
        {canApply ? (
          <>
            <p className="mt-3 text-sm text-slate-600">
              This case doesn't have a workflow yet. Apply your firm's standard workflow
              {appliedName ? ` (“${appliedName}”)` : ''} to track it through the pipeline.
            </p>
            <button
              type="button"
              onClick={apply}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" /> {busy ? 'Applying…' : `Apply workflow`}
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No workflow is available. A firm admin needs to create and apply a standard workflow from the Firm
            Dashboard → Workflow tab.
          </p>
        )}
      </div>
    )
  }

  const pct = workflow.totalSteps ? Math.round((workflow.completedSteps / workflow.totalSteps) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header + overall progress */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">{workflow.name}</h3>
            {workflow.description && <p className="mt-0.5 text-xs text-slate-500">{workflow.description}</p>}
          </div>
          <span className="text-sm font-semibold text-slate-700">
            {workflow.completedSteps}/{workflow.totalSteps} done · {pct}%
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>

        {/* Visual pipeline strip */}
        <PipelineStrip phases={workflow.phases} currentOrder={workflow.currentPhaseOrder} />
      </div>

      {/* Phases → stages → steps */}
      <div className="space-y-4">
        {workflow.phases.map((phase) => {
          const isCurrent = phase.order === workflow.currentPhaseOrder
          const phasePct = phase.totalSteps ? Math.round((phase.completedSteps / phase.totalSteps) * 100) : 0
          return (
            <div
              key={phase.order}
              className={`overflow-hidden rounded-xl border ${
                isCurrent ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'
              }`}
            >
              <div
                className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 ${
                  isCurrent ? 'border-indigo-100 bg-indigo-50/60' : 'border-slate-100 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {phase.order + 1}
                  </span>
                  <span className="font-semibold text-slate-900">{phase.name}</span>
                  {isCurrent && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Current
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {phase.completedSteps}/{phase.totalSteps} · {phasePct}%
                </span>
              </div>

              <div className="space-y-3 p-3">
                {phase.stages.map((stage) => {
                  const stageDone = stage.steps.filter((s) => s.status === 'done' || s.status === 'skipped').length
                  return (
                    <div key={stage.order} className="rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2">
                        <span className="text-sm font-semibold text-slate-700">{stage.name}</span>
                        <span className="text-xs text-slate-400">
                          {stageDone}/{stage.steps.length}
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {stage.steps.map((step) => (
                          <StepItem
                            key={step.id}
                            step={step}
                            pending={pendingId === step.id}
                            members={members}
                            canAssign={canAssign}
                            onToggle={() => toggle(step)}
                            onAssign={(firmMemberId) => assign(step, firmMemberId)}
                            onDelete={() => removeTask(step)}
                          />
                        ))}
                      </ul>
                      <AddTaskRow
                        members={members}
                        canAssign={canAssign}
                        onAdd={(payload) =>
                          addTask({
                            ...payload,
                            phaseName: phase.name,
                            phaseOrder: phase.order,
                            stageName: stage.name,
                            stageOrder: stage.order,
                          })
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PipelineStrip({
  phases,
  currentOrder,
}: {
  phases: CaseWorkflowPhase[]
  currentOrder: number | null
}) {
  if (phases.length === 0) return null
  return (
    <div className="mt-4 flex items-stretch gap-1 overflow-x-auto">
      {phases.map((phase) => {
        const pct = phase.totalSteps ? Math.round((phase.completedSteps / phase.totalSteps) * 100) : 0
        const complete = phase.totalSteps > 0 && phase.completedSteps >= phase.totalSteps
        const isCurrent = phase.order === currentOrder
        return (
          <div
            key={phase.order}
            className={`min-w-[120px] flex-1 rounded-lg border px-3 py-2 ${
              isCurrent
                ? 'border-indigo-300 bg-indigo-50'
                : complete
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50'
            }`}
            title={`${phase.name} — ${phase.completedSteps}/${phase.totalSteps}`}
          >
            <div className="flex items-center gap-1.5">
              {complete ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full ${isCurrent ? 'bg-indigo-500' : 'bg-slate-300'}`}
                />
              )}
              <span className="min-w-0 truncate text-xs font-semibold text-slate-700">{phase.name}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
              <div
                className={`h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StepItem({
  step,
  pending,
  members,
  canAssign,
  onToggle,
  onAssign,
  onDelete,
}: {
  step: CaseWorkflowStep
  pending: boolean
  members: FirmMemberOption[]
  canAssign: boolean
  onToggle: () => void
  onAssign: (firmMemberId: string | null) => void
  onDelete: () => void
}) {
  const done = step.status === 'done'
  const due = dueMeta(step.dueDate, done)
  const TypeIcon = STEP_ICON[step.stepType] || ClipboardList

  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      {step.readOnly ? (
        /* AI milestone: read-only, derived status. */
        <span className="mt-0.5 shrink-0" title="Tracked automatically">
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-violet-500" />
          ) : (
            <Sparkles className="h-5 w-5 text-violet-300" />
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          disabled={pending}
          className="mt-0.5 shrink-0 text-slate-300 hover:text-emerald-500 disabled:opacity-50"
          title={done ? 'Mark not done' : 'Mark done'}
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          ) : done ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TypeIcon className={`h-3.5 w-3.5 shrink-0 ${STEP_TONE[step.stepType] || 'text-slate-400'}`} />
          <span className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {step.title}
          </span>
          {step.readOnly && (
            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-600 ring-1 ring-violet-200">
              {done ? 'Auto · done' : 'Auto'}
            </span>
          )}
          {step.required && !step.readOnly && (
            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-600 ring-1 ring-rose-200">
              Required
            </span>
          )}
          {step.custom && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-600 ring-1 ring-emerald-200">
              Added
            </span>
          )}
        </div>
        {step.description && <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
          {!step.readOnly && canAssign ? (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                step.assignedFirmMemberId
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                  : 'text-slate-500'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <select
                className="max-w-[160px] truncate bg-transparent pr-4 text-xs focus:outline-none disabled:opacity-60"
                value={step.assignedFirmMemberId ?? ''}
                disabled={pending}
                onChange={(e) => onAssign(e.target.value || null)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.firmMemberId} value={m.firmMemberId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </span>
          ) : (
            step.assignedName && (
              <span className="inline-flex items-center gap-1 text-indigo-700">
                <User className="h-3.5 w-3.5" />
                {step.assignedName}
              </span>
            )
          )}
          {step.assigneeRole && !step.assignedFirmMemberId && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              {ROLE_LABELS[step.assigneeRole] || step.assigneeRole}
            </span>
          )}
          {due && (
            <span className={`inline-flex items-center gap-1 ${due.cls}`}>
              <Clock className="h-3.5 w-3.5" />
              {due.label}
            </span>
          )}
          {step.templateId && (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <FileText className="h-3.5 w-3.5" /> Linked doc
            </span>
          )}
        </div>
      </div>
      {step.custom && (
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="mt-0.5 shrink-0 text-slate-300 transition hover:text-rose-600 disabled:opacity-50"
          title="Delete task"
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  )
}

/** Inline "add an ad-hoc task" control shown at the bottom of every stage. */
function AddTaskRow({
  members,
  canAssign,
  onAdd,
}: {
  members: FirmMemberOption[]
  canAssign: boolean
  onAdd: (payload: {
    title: string
    firmMemberId?: string | null
    dueDate?: string | null
    required?: boolean
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [firmMemberId, setFirmMemberId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [required, setRequired] = useState(false)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle('')
    setFirmMemberId('')
    setDueDate('')
    setRequired(false)
  }

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await onAdd({
        title: title.trim(),
        firmMemberId: firmMemberId || null,
        dueDate: dueDate || null,
        required,
      })
      reset()
      setOpen(false)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to add task')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <div className="border-t border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 transition hover:text-brand-800"
        >
          <Plus className="h-3.5 w-3.5" /> Add task
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">New task</span>
        <button
          type="button"
          onClick={() => {
            reset()
            setOpen(false)
          }}
          className="grid h-6 w-6 place-items-center rounded text-slate-400 transition hover:bg-white hover:text-slate-600"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 space-y-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="e.g. Follow up with adjuster"
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
        <div className="flex flex-wrap items-center gap-2">
          {canAssign && (
            <select
              value={firmMemberId}
              onChange={(e) => setFirmMemberId(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.firmMemberId} value={m.firmMemberId}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Required
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || saving}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
