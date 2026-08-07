import { formatCurrency } from '../../../lib/formatters'
import { formatCaseId } from '../../../lib/caseId'
import { formatClaimType } from '../../../lib/claimTypes'
import { Badge } from '../../shared/ui'
import { deriveCaseStatus } from './deriveCaseStatus'

export default function CaseSummaryHeader({ caseData, contactName }: { caseData: any; contactName: string }) {
  const incident = caseData.facts?.incident || {}
  const viability = caseData.prediction?.viability || {}
  const bands = caseData.prediction?.bands || {}
  const status = deriveCaseStatus(caseData)
  const item = (label: string, value: any) => <div><p className="text-xs text-slate-500">{label}</p><div>{value}</div></div>
  return <section className="rounded-xl border border-slate-200 bg-white p-6"><h1 className="mb-4 text-xl font-bold text-slate-900">Case summary</h1><div className="grid grid-cols-2 gap-4 md:grid-cols-4">
    {item('Case ID', <><p className="font-mono text-sm">{formatCaseId({ id: caseData.id, claimType: caseData.claimType, createdAt: caseData.createdAt })}</p><p className="break-all font-mono text-[10px] text-slate-400">{caseData.id}</p></>)}
    {item('Plaintiff', <p className="font-medium">{contactName || '—'}</p>)}{item('Claim type', formatClaimType(caseData.claimType))}{item('Location', <>{caseData.venueCounty ? `${caseData.venueCounty}, ` : ''}{caseData.venueState}</>)}
    {item('Incident date', incident.date || '—')}{item('Status', <span title={status.raw && status.raw.toLowerCase() !== status.label.toLowerCase() ? `Raw status: ${status.raw}` : undefined}><Badge tone="neutral">{status.label}</Badge></span>)}{item('Case score', viability.overall != null ? `${Math.round(viability.overall * 100)}%` : '—')}{item('Estimated value', bands.median ? formatCurrency(bands.median) : '—')}
  </div></section>
}
