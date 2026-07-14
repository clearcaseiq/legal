/**
 * Case Workspace → Workflow tab. Shows the firm's applied workflow as a live,
 * stage-grouped checklist for this specific case: progress bar, current stage,
 * per-step owner/due-date/required badges, and check-off. If the case has no
 * workflow yet, offers to apply the firm's standard one.
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
} from 'lucide-react'
import {
  getCaseWorkflow,
  applyCaseWorkflow,
  updateCaseWorkflowStep,
  type CaseWorkflow,
  type CaseWorkflowStep,
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCaseWorkflow(leadId)
      setWorkflow(res.workflow)
      setCanApply(res.canApply)
      setAppliedName(res.appliedWorkflow?.name ?? null)
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
    const next = step.status === 'done' ? 'pending' : 'done'
    setPendingId(step.id)
    try {
      const res = await updateCaseWorkflowStep(leadId, step.id, next)
      setWorkflow(res.workflow)
    } catch {
      // ignore; reload to resync
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
              {appliedName ? ` (“${appliedName}”)` : ''} to track it stage by stage.
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
      {/* Header + progress */}
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
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {workflow.stages.map((stage) => {
          const isCurrent = stage.order === workflow.currentStageOrder
          const stageDone = stage.steps.filter((s) => s.status === 'done').length
          return (
            <div
              key={stage.order}
              className={`rounded-xl border ${isCurrent ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'}`}
            >
              <div
                className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 ${
                  isCurrent ? 'border-indigo-100 bg-indigo-50/60' : 'border-slate-100 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {stage.order + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{stage.name}</span>
                  {isCurrent && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Current
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {stageDone}/{stage.steps.length}
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {stage.steps.map((step) => {
                  const done = step.status === 'done'
                  const due = dueMeta(step.dueDate, done)
                  return (
                    <li key={step.id} className="flex items-start gap-3 px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggle(step)}
                        disabled={pendingId === step.id}
                        className="mt-0.5 shrink-0 text-slate-300 hover:text-emerald-500 disabled:opacity-50"
                        title={done ? 'Mark not done' : 'Mark done'}
                      >
                        {pendingId === step.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                        ) : done ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {step.title}
                          </span>
                          {step.required && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-600 ring-1 ring-rose-200">
                              Required
                            </span>
                          )}
                        </div>
                        {step.description && <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                          {step.assigneeRole && (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <User className="h-3.5 w-3.5 text-slate-400" />
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
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
