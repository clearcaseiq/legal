export default function RoutingStateView({ state }: { state: any }) {
  if (!state) return null
  if (state.error) return <p className="text-sm text-red-700">Could not load routing state: {state.error}</p>
  const introductions: any[] = Array.isArray(state.introductions) ? state.introductions : []
  const statusBadge = (status: string) => <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${({ accepted: 'bg-green-100 text-green-800', pending: 'bg-amber-100 text-amber-800', declined: 'bg-red-100 text-red-800', expired: 'bg-slate-100 text-slate-600' } as Record<string, string>)[status] || 'bg-slate-100 text-slate-600'}`}>{String(status || 'unknown').replace(/_/g, ' ')}</span>
  const lead = state.leadSubmission
  const lookup = state.attorneyLookupByEmail
  return <div className="space-y-3 text-sm text-slate-700">
    <div className="flex items-center gap-2"><span className="text-slate-500">Assignment:</span>{state.hasLeadSubmission ? <span>{lead?.assignedAttorneyId ? <>Assigned (<span className="font-medium">{lead.assignmentType || 'manual'}</span>)</> : 'Not yet assigned'}</span> : <span className="text-slate-500">No lead submission recorded</span>}</div>
    <div><p className="mb-1 text-slate-500">Introductions ({introductions.length})</p>{introductions.length === 0 ? <p className="text-slate-500">No attorney introductions yet.</p> : <ul className="space-y-1">{introductions.map((intro) => <li key={intro.id} className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-900">{intro.attorneyName || 'Unknown attorney'}</span><span className="break-all text-slate-500">{intro.attorneyEmail || '—'}</span>{statusBadge(intro.status)}</li>)}</ul>}</div>
    {lookup && <div className="flex items-center gap-2"><span className="text-slate-500">Email lookup:</span>{lookup.error ? <span className="text-red-700">Not found: attorney must log in with this exact email</span> : <span>Matched <span className="font-medium">{lookup.name}</span> ({lookup.email})</span>}</div>}
  </div>
}
