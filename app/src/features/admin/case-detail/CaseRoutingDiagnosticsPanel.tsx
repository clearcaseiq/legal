import { BarChart3 } from 'lucide-react'
import { formatDate, formatEnumLabel } from '../../../lib/formatters'

// Fall back to a shortened ID for legacy rows the backend couldn't resolve to a
// name (e.g. the attorney record was since deleted). Shows the first/last few
// characters so it's still traceable without dumping a full CUID on the admin.
function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id
}

function attorneyLabel(entry: any): string {
  if (!entry.attorneyId) return 'System event'
  if (entry.attorneyName) {
    return entry.attorneyFirm ? `${entry.attorneyName} — ${entry.attorneyFirm}` : entry.attorneyName
  }
  return `Attorney ${shortId(String(entry.attorneyId))}`
}

export default function CaseRoutingDiagnosticsPanel({ entries }: { entries: any[] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><BarChart3 className="h-5 w-5" />Routing decision diagnostics</h2>{entries?.length ? <div className="space-y-3">{entries.slice(0, 10).map((entry) => <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-slate-900">{formatEnumLabel(entry.eventType)}</p><p className="mt-1 text-xs text-slate-500" title={entry.attorneyId || undefined}>{attorneyLabel(entry)}</p></div><p className="text-xs text-slate-500">{formatDate(entry.createdAt)}</p></div>{entry.eventData?.routingScore != null && <div className="mt-3 grid gap-2 sm:grid-cols-3">{[['Routing score', entry.eventData.routingScore], ['Match score', entry.eventData.matchScore || 0], ['Accept probability', entry.eventData.acceptanceProbability || 0]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white px-3 py-2"><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-900">{Math.round(Number(value) * 100)}%</p></div>)}</div>}{entry.eventData?.failureReason && <p className="mt-2 text-xs text-red-700">Failure: {entry.eventData.failureReason}</p>}</div>)}</div> : <p className="text-sm text-slate-500">No routing diagnostics recorded yet. Run a simulation or route the case to populate score explanations.</p>}</section>
}
