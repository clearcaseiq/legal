import { BarChart3 } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatters'

export default function CaseMlOutputsPanel({ caseData }: { caseData: any }) {
  const viability = caseData.prediction?.viability || {}
  const bands = caseData.prediction?.bands || {}
  return <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><BarChart3 className="h-5 w-5" />ML outputs</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div><p className="text-xs text-slate-500">Viability</p><p>{viability.overall != null ? `${Math.round(viability.overall * 100)}%` : '—'}</p></div><div><p className="text-xs text-slate-500">Settlement estimate</p><p>{bands.median ? formatCurrency(bands.median) : '—'}</p></div><div><p className="text-xs text-slate-500">Value range</p><p>{bands.p25 && bands.p75 ? `${formatCurrency(bands.p25)} – ${formatCurrency(bands.p75)}` : '—'}</p></div></div></section>
}
