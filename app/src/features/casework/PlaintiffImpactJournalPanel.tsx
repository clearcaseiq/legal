/**
 * Read-only plaintiff "Impact on Your Life" journal for the attorney Medical tab.
 * Entries are persisted on assessment.facts.painJournal when the plaintiff logs them.
 */
import { Activity } from 'lucide-react'

export type PainJournalEntry = {
  date: string
  level: number
  note: string
  days?: number
  dailyWage?: number
}

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatEntryDate(raw: string) {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PlaintiffImpactJournalPanel({ entries }: { entries: PainJournalEntry[] }) {
  const list = Array.isArray(entries) ? [...entries].reverse() : []

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Activity className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">Plaintiff impact journal</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Daily life impact and wage notes the client logged from their Journal tab.
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No journal entries yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((entry, i) => {
            const wage =
              typeof entry.days === 'number' &&
              entry.days > 0 &&
              typeof entry.dailyWage === 'number' &&
              entry.dailyWage > 0
                ? entry.days * entry.dailyWage
                : null
            return (
              <li key={`${entry.date}-${i}`} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{formatEntryDate(entry.date)}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-slate-700">
                    Pain {entry.level}/10
                  </span>
                  {wage != null && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                      Wage loss {money(wage)}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-slate-800 whitespace-pre-wrap">{entry.note}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
