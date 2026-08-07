import { FileText, User } from 'lucide-react'
import { formatDate } from '../../../lib/formatters'

export default function CasePlaintiffIntakePanel({ caseData, contactName, contactEmail, contactPhone, hasRealAccount, plaintiffContext }: any) {
  const incident = caseData.facts?.incident || {}
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><User className="h-5 w-5" />Plaintiff profile</h2>
      {(contactEmail || contactPhone || contactName) ? <div className="space-y-2 text-sm">{contactName && <p><span className="text-slate-500">Name:</span> {contactName}</p>}<p><span className="text-slate-500">Email:</span> {contactEmail || '—'}</p><p><span className="text-slate-500">Phone:</span> {contactPhone || '—'}</p>{plaintiffContext.preferredContactMethod && <p><span className="text-slate-500">Preferred contact:</span> {plaintiffContext.preferredContactMethod}</p>}{hasRealAccount ? <p><span className="text-slate-500">Account created:</span> {formatDate(caseData.user.createdAt)}</p> : <p className="text-xs text-amber-600">Contact provided during intake — no registered account yet.</p>}</div> : <p className="text-slate-500">No contact information on file</p>}
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><FileText className="h-5 w-5" />Intake responses</h2><div className="space-y-2 text-sm"><p><span className="text-slate-500">Incident summary:</span> {incident.narrative?.slice(0, 200) || '—'}{incident.narrative?.length > 200 ? '...' : ''}</p><p><span className="text-slate-500">Incident date:</span> {incident.date || '—'}</p></div></section>
  </div>
}
