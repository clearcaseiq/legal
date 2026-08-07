import { GitBranch } from 'lucide-react'
import { DECLINE_REASONS } from '../../../components/DeclineModal'
import { formatDate, formatEnumLabel } from '../../../lib/formatters'

export default function CaseRoutingHistoryPanel({ introductions, onDebug }: { introductions: any[]; onDebug: (email: string) => void }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><GitBranch className="h-5 w-5" />Routing history</h2>{introductions?.length ? <div className="space-y-3">{introductions.map((intro) => <div key={intro.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0"><div><p className="font-medium">{intro.attorney?.name}</p><p className="text-sm text-slate-500">Wave {intro.waveNumber} • {formatEnumLabel(intro.status)} • {formatDate(intro.createdAt)}</p>{intro.declineReason && <p className="mt-1 text-sm text-amber-600">Reason: {DECLINE_REASONS.find((reason) => reason.value === intro.declineReason)?.label ?? intro.declineReason}</p>}</div>{intro.attorney?.email && <button onClick={() => onDebug(intro.attorney.email)} className="text-xs text-amber-600 hover:text-amber-800 hover:underline" title="Debug why case doesn't show on dashboard">Debug</button>}</div>)}</div> : <p className="text-slate-500">No routing activity yet</p>}</section>
}
