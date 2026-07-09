import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FolderOpen, Pin, Search } from 'lucide-react'
import { getAttorneyDashboard } from '../../lib/api'
import { Avatar, Badge, EmptyState, PageHeader, SectionCard, type BadgeTone } from '../shared/ui'
import { getPinnedCaseIds, getRecentCases, togglePinnedCase } from './recentCases'

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

const STAGE_TONE: Record<string, BadgeTone> = {
  contacted: 'brand',
  consulted: 'warning',
  retained: 'success',
}

const STAGE_ACCENT: Record<string, string> = {
  contacted: 'bg-brand-400',
  consulted: 'bg-amber-400',
  retained: 'bg-emerald-400',
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

function relativeTime(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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

function CaseTile({
  c,
  note,
  primary = false,
  pinned,
  onTogglePin,
}: {
  c: WorkspaceCase
  note?: string
  primary?: boolean
  pinned: boolean
  onTogglePin: (id: string) => void
}) {
  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl border p-4 transition hover:-translate-y-px hover:shadow-sm ${
        primary ? 'border-brand-200 bg-brand-50/40 hover:border-brand-300' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* Stretched link makes the whole tile clickable while leaving the pin button interactive. */}
      <Link
        to={`/attorney-dashboard/cases/${c.id}/overview`}
        aria-label={`Open ${c.client}'s case workspace`}
        className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      />
      <span className={`h-10 w-1 shrink-0 rounded-full ${STAGE_ACCENT[c.stageKey] ?? 'bg-slate-300'}`} />
      <Avatar name={c.client} className={primary ? 'h-9 w-9' : ''} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-900">{c.client}</span>
          <Badge tone={STAGE_TONE[c.stageKey] ?? 'neutral'}>{STAGE_LABEL[c.stageKey] ?? c.stageKey}</Badge>
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-500">
          {c.typeLabel}
          {c.jurisdiction ? ` · ${c.jurisdiction}` : ''}
          {c.value ? <span className="font-medium text-slate-700"> · {c.value}</span> : ''}
          {note ? <span className="text-slate-400"> · {note}</span> : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onTogglePin(c.id)}
        aria-label={pinned ? `Unpin ${c.client}` : `Pin ${c.client}`}
        title={pinned ? 'Unpin' : 'Pin to top'}
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
          pinned
            ? 'text-brand-600 hover:bg-brand-100'
            : 'text-slate-300 opacity-0 hover:bg-slate-100 hover:text-slate-500 focus-visible:opacity-100 group-hover:opacity-100'
        }`}
      >
        <Pin className={`h-4 w-4 ${pinned ? 'fill-brand-500' : ''}`} />
      </button>
      <span className="relative z-0 flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700">
        Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </div>
  )
}

/**
 * Launcher for the single-case workspace. Distinct from Active Cases (which is
 * the full, filterable management grid): this surface is for fast re-entry —
 * continue where you left off, jump to pinned matters, revisit recent files, or
 * search across the caseload.
 */
export default function CaseWorkspaceLanding() {
  const [cases, setCases] = useState<WorkspaceCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => getPinnedCaseIds())
  const [recents, setRecents] = useState(() => getRecentCases())

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

  const byId = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases])

  const handleTogglePin = (id: string) => setPinnedIds(togglePinnedCase(id))

  // Recents (excluding pins) with their opened-at note, only those still in the caseload.
  const recentTiles = useMemo(() => {
    return recents
      .filter((r) => byId.has(r.id) && !pinnedIds.includes(r.id))
      .map((r) => ({ c: byId.get(r.id)!, note: `Opened ${relativeTime(r.openedAt)}` }))
  }, [recents, byId, pinnedIds])

  const pinnedTiles = useMemo(
    () => pinnedIds.filter((id) => byId.has(id)).map((id) => byId.get(id)!),
    [pinnedIds, byId],
  )

  // "Continue working" = the most recently opened case if we know it, else the
  // most recently updated case in the caseload.
  const continueCase = useMemo(() => {
    const firstRecent = recents.find((r) => byId.has(r.id))
    return firstRecent ? byId.get(firstRecent.id)! : cases[0] ?? null
  }, [recents, byId, cases])

  const recentRest = useMemo(
    () => recentTiles.filter((t) => t.c.id !== continueCase?.id),
    [recentTiles, continueCase],
  )

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return cases.filter(
      (c) => c.client.toLowerCase().includes(q) || c.typeLabel.toLowerCase().includes(q) || c.jurisdiction.toLowerCase().includes(q),
    )
  }, [query, cases])

  const searching = query.trim().length > 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Case Workspace"
        description="Jump back into a retained matter's full file. Pick up where you left off, or search your caseload."
      />

      {loading ? (
        <EmptyState message="Loading your caseload…" />
      ) : error ? (
        <EmptyState message={error} />
      ) : cases.length === 0 ? (
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <FolderOpen className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No active cases yet. Accept a match to open its workspace.</p>
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
          {/* Search / jump-to-a-case */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to a case — search by client, type, or jurisdiction…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {searching ? (
            <SectionCard title={`Results (${searchResults.length})`}>
              {searchResults.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No cases match "{query}".</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((c) => (
                    <CaseTile key={c.id} c={c} pinned={pinnedIds.includes(c.id)} onTogglePin={handleTogglePin} />
                  ))}
                </div>
              )}
            </SectionCard>
          ) : (
            <>
              {continueCase && (
                <SectionCard title="Continue working">
                  <CaseTile
                    c={continueCase}
                    primary
                    note={recents.find((r) => r.id === continueCase.id) ? `Opened ${relativeTime(recents.find((r) => r.id === continueCase.id)!.openedAt)}` : `Updated ${relativeTime(continueCase.updatedAt)}`}
                    pinned={pinnedIds.includes(continueCase.id)}
                    onTogglePin={handleTogglePin}
                  />
                </SectionCard>
              )}

              {pinnedTiles.length > 0 && (
                <SectionCard title={`Pinned (${pinnedTiles.length})`}>
                  <div className="space-y-2">
                    {pinnedTiles.map((c) => (
                      <CaseTile key={c.id} c={c} pinned onTogglePin={handleTogglePin} />
                    ))}
                  </div>
                </SectionCard>
              )}

              {recentRest.length > 0 && (
                <SectionCard title="Recently opened">
                  <div className="space-y-2">
                    {recentRest.map(({ c, note }) => (
                      <CaseTile key={c.id} c={c} note={note} pinned={pinnedIds.includes(c.id)} onTogglePin={handleTogglePin} />
                    ))}
                  </div>
                </SectionCard>
              )}

              <Link
                to="/attorney-dashboard/cases/active"
                className="group flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Browse all {cases.length} active {cases.length === 1 ? 'case' : 'cases'}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </>
      )}
    </div>
  )
}
