import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FolderOpen } from 'lucide-react'
import { getAttorneyDashboard } from '../../lib/api'
import { EmptyState, PageHeader, SectionCard } from '../shared/ui'

const CLAIM_LABELS: Record<string, string> = {
  auto: 'Auto',
  slip_and_fall: 'Slip & fall',
  dog_bite: 'Dog bite',
  medmal: 'Med mal',
  product: 'Product liability',
  nursing_home_abuse: 'Nursing home',
  wrongful_death: 'Wrongful death',
  high_severity_surgery: 'Surgical injury',
}

function claimLabel(type?: string) {
  if (!type) return 'Other'
  return CLAIM_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const ACCEPTED_STATUSES = ['contacted', 'consulted', 'retained']

const STAGE_LABEL: Record<string, string> = {
  contacted: 'Contacted',
  consulted: 'Consult scheduled',
  retained: 'Retained',
}

const STAGE_PILL: Record<string, string> = {
  contacted: 'bg-brand-50 text-brand-700',
  consulted: 'bg-amber-50 text-amber-700',
  retained: 'bg-emerald-50 text-emerald-700',
}

function compactMoney(n: number) {
  if (!Number.isFinite(n) || n <= 0) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2).replace(/\.00$/, '')}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

function readHighBand(lead: any): number {
  const preds = lead?.assessment?.predictions
  const pred = Array.isArray(preds)
    ? [...preds].sort((a, b) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime()).pop()
    : preds || {}
  let bands: any = {}
  if (pred?.bands) {
    try {
      bands = typeof pred.bands === 'string' ? JSON.parse(pred.bands) : pred.bands
    } catch {
      bands = {}
    }
  }
  return Number(bands.high ?? bands.p75 ?? bands.median ?? 0) || 0
}

interface WorkspaceCase {
  id: string
  client: string
  typeLabel: string
  stageKey: string
  jurisdiction: string
  value: string | null
  updatedAt: number
}

function CaseTile({ c, primary = false }: { c: WorkspaceCase; primary?: boolean }) {
  return (
    <Link
      to={`/attorney-dashboard/cases/${c.id}/overview`}
      className={`group flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-brand-300 hover:shadow-sm ${
        primary ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-900">{c.client}</span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_PILL[c.stageKey] ?? 'bg-slate-100 text-slate-600'}`}>
            {STAGE_LABEL[c.stageKey] ?? c.stageKey}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">
          {c.typeLabel}
          {c.jurisdiction ? ` · ${c.jurisdiction}` : ''}
          {c.value ? ` · ${c.value}` : ''}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700">
        Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/**
 * Launcher for the single-case workspace. The prototype's sidebar "Case Workspace"
 * opened the full tabbed case file; here we surface the caseload so the attorney
 * can jump straight into any retained matter's workspace (Overview · Documents ·
 * Chronology · Negotiation · Messages · Billing).
 */
export default function CaseWorkspaceLanding() {
  const [cases, setCases] = useState<WorkspaceCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttorneyDashboard()
      .then((data: any) => {
        if (cancelled) return
        const rows: WorkspaceCase[] = (Array.isArray(data?.recentLeads) ? data.recentLeads : [])
          .filter((lead: any) => ACCEPTED_STATUSES.includes(lead?.status || ''))
          .map((lead: any) => {
            const user = lead?.assessment?.user
            return {
              id: lead.id,
              client: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Client',
              typeLabel: claimLabel(lead?.assessment?.claimType),
              stageKey: lead.status,
              jurisdiction: lead?.assessment?.venueState || '',
              value: compactMoney(readHighBand(lead)),
              updatedAt: Date.parse(lead?.lastContactAt || lead?.updatedAt || lead?.submittedAt || '') || 0,
            }
          })
          .sort((a: WorkspaceCase, b: WorkspaceCase) => b.updatedAt - a.updatedAt)
        setCases(rows)
      })
      .catch((err: any) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load cases'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const [mostRecent, others] = useMemo<[WorkspaceCase | null, WorkspaceCase[]]>(
    () => (cases.length ? [cases[0], cases.slice(1)] : [null, []]),
    [cases],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Case Workspace"
        description="The full file for a retained matter — Overview, Documents, Chronology, Negotiation, Messages, and Billing in one place. Pick a case to open its workspace."
      />

      {loading ? (
        <EmptyState message="Loading your caseload…" />
      ) : error ? (
        <EmptyState message={error} />
      ) : !mostRecent ? (
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <FolderOpen className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              No active cases yet. Accept a match to open its workspace.
            </p>
            <Link
              to="/attorney-dashboard/leadgen/matches"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Go to New Matches
            </Link>
          </div>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Continue working">
            <CaseTile c={mostRecent} primary />
          </SectionCard>

          {others.length > 0 && (
            <SectionCard title={`Other active cases (${others.length})`}>
              <div className="space-y-2">
                {others.map((c) => (
                  <CaseTile key={c.id} c={c} />
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
