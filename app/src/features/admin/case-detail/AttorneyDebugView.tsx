import type { ReactNode } from 'react'

export default function AttorneyDebugView({ debug }: { debug: any }) {
  if (!debug) return null
  if (debug.error) return <p className="text-sm text-red-700">Could not load attorney details: {debug.error}</p>
  const attorney = debug.attorney
  const user = debug.user
  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() : ''
  const leads: any[] = Array.isArray(debug.sampleLeads) ? debug.sampleLeads : []
  const row = (label: string, value: ReactNode) => <div className="flex items-start justify-between gap-3 py-1"><span className="text-slate-500">{label}</span><span className="break-all text-right font-medium text-slate-800">{value}</span></div>
  return <div className="space-y-3 text-sm text-slate-700">
    <div className={`rounded-md border px-3 py-2 text-xs font-medium ${debug.message === 'OK' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{debug.message}</div>
    <div className="divide-y divide-slate-100 rounded-md border border-slate-200 px-3">
      {row('Attorney', attorney ? `${attorney.name || '—'} · ${attorney.email || '—'}` : 'Not found')}
      {row('User account', user ? `${userName || '—'} · ${user.email || '—'}${user.role ? ` (${user.role})` : ''}` : 'No user with this email')}
      {debug.emailMatch != null && row('Email match', debug.emailMatch ? 'Yes' : 'No')}
      {row('Introductions', debug.introCount ?? 0)}{row('Assigned leads', debug.assignedCount ?? 0)}{row('Leads via intro path', debug.totalLeadsFromIntroPath ?? 0)}
    </div>
    {leads.length > 0 && <div><p className="mb-1 text-slate-500">Recent leads ({leads.length})</p><div className="divide-y divide-slate-100 rounded-md border border-slate-200">{leads.map((lead) => <div key={lead.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs"><span className="truncate font-mono text-slate-500">{lead.id}</span><span className="capitalize">{String(lead.status || 'unknown').replace(/_/g, ' ')}</span><span className="text-slate-500">{lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString() : '—'}</span></div>)}</div></div>}
  </div>
}
