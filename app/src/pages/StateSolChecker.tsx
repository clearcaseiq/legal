import { type FormEvent, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CheckCircle2, Loader2 } from 'lucide-react'
import SeoCiteEmbed from '../components/SeoCiteEmbed'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'
import { US_STATES, getStateName } from '../lib/constants'
import { calculateSOL } from '../lib/api-plaintiff'
import { CA_SOL_CLAIM_OPTIONS, formatDisplayDate, statusLabel, type CaSolClaimType } from '../lib/publicCaSol'

type Status = 'ok' | 'warning' | 'critical' | 'expired'

type StateSolResult = {
  state: string
  claimLabel: string
  years: number
  filingDeadline: Date
  daysRemaining: number
  status: Status
  note?: string
}

const statusStyles: Record<Status, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  critical: 'border-orange-200 bg-orange-50 text-orange-950',
  expired: 'border-rose-200 bg-rose-50 text-rose-950',
}

const STATE_CODES = new Set<string>(US_STATES.map((s) => s.code))

function statusFromDays(days: number): Status {
  if (days < 0) return 'expired'
  if (days <= 90) return 'critical'
  if (days <= 365) return 'warning'
  return 'ok'
}

/** The API returns a UTC timestamp; read its calendar date so the deadline does not shift a day. */
function calendarDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatYears(years: number): string {
  if (Number.isInteger(years)) return `${years} year${years === 1 ? '' : 's'}`
  const months = Math.round(years * 12)
  return months < 12 ? `${months} months` : `${years.toFixed(1)} years`
}

export default function StateSolChecker() {
  const [searchParams] = useSearchParams()
  const embed = searchParams.get('embed') === '1'
  const initialState = String(searchParams.get('state') || '').toUpperCase()

  const [state, setState] = useState(STATE_CODES.has(initialState) ? initialState : '')
  const [incidentDate, setIncidentDate] = useState('')
  const [claimType, setClaimType] = useState<CaSolClaimType>('auto')
  const [result, setResult] = useState<StateSolResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const maxDate = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!state) {
      setError('Choose the state where the injury happened.')
      return
    }
    if (!incidentDate || incidentDate > maxDate) {
      setError('Enter the date of the incident (today or earlier).')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await calculateSOL(incidentDate, { state }, claimType)
      const filingDeadline = calendarDate(String(data.expiresAt))
      const daysRemaining = Number(data.daysRemaining)
      setResult({
        state,
        claimLabel: CA_SOL_CLAIM_OPTIONS.find((o) => o.value === claimType)?.label || claimType,
        years: Number(data.rule?.years),
        filingDeadline,
        daysRemaining,
        status: statusFromDays(daysRemaining),
        note: data.rule?.notes || undefined,
      })
    } catch (err: any) {
      setResult(null)
      setError(err?.response?.data?.error || 'We could not calculate that deadline. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'

  return (
    <div className={`mx-auto max-w-3xl space-y-8 ${embed ? 'py-4' : 'py-8'}`}>
      {embed ? (
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900">Injury deadline checker</h1>
          <p className="text-sm text-slate-600">Educational estimate only — not legal advice.</p>
        </header>
      ) : (
        <header className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Free tool · All 50 states + DC</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            Statute of limitations checker
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Every state sets a deadline to file an injury claim, usually between one and six years. Pick your state and
            the date it happened for an educational estimate of your filing window.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ClearCaseIQ is not a law firm and this tool is not legal advice. Deadlines have exceptions; confirm with a
            licensed attorney in your state.
          </p>
        </header>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">State</span>
            <select required value={state} onChange={(e) => setState(e.target.value)} className={inputClass}>
              <option value="">Select a state</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Incident date</span>
            <input
              type="date"
              required
              max={maxDate}
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Claim type</span>
            <select value={claimType} onChange={(e) => setClaimType(e.target.value as CaSolClaimType)} className={inputClass}>
              {CA_SOL_CLAIM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="flex items-center gap-2 text-sm text-rose-700" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Check deadline
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${statusStyles[result.status]}`}>
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {getStateName(result.state)} · typical filing window
                </p>
                <h2 className="mt-1 text-lg font-semibold">{result.claimLabel}</h2>
                <p className="mt-2 text-sm">
                  General period often cited: about <strong>{formatYears(result.years)}</strong> from the incident date →
                  deadline around <strong>{formatDisplayDate(result.filingDeadline)}</strong>.
                </p>
                <p className="mt-1 text-sm font-medium">
                  {statusLabel(result.status)}
                  {result.daysRemaining >= 0
                    ? ` · ${result.daysRemaining.toLocaleString()} day${result.daysRemaining === 1 ? '' : 's'} remaining (estimate)`
                    : ` · ${Math.abs(result.daysRemaining).toLocaleString()} days past the general estimate`}
                </p>
                {result.note && <p className="mt-2 text-sm opacity-90">{result.note}</p>}
              </div>
            </div>
          </div>

          {result.state === 'CA' && !embed && (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Injured by a city, county, transit agency or school district? California usually needs a claim within about
              six months.{' '}
              <Link to="/tools/california-sol-checker" className="font-semibold text-brand-700 underline underline-offset-4">
                Use the California checker
              </Link>{' '}
              for that earlier clock.
            </p>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span>
                Claims against a government agency, injuries to minors, late-discovered injuries and how the claim is
                classified can all change these dates. Use a free ClearCaseIQ assessment to organize the facts, then talk
                to counsel about your specific deadline.
              </span>
            </p>
          </div>
        </div>
      )}

      {embed ? (
        <p className="text-center text-xs text-slate-500">
          Powered by{' '}
          <a href="https://www.clearcaseiq.com" target="_blank" rel="noreferrer" className="font-semibold text-brand-700">
            ClearCaseIQ
          </a>{' '}
          · Not a law firm
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Link
              to={START_ASSESSMENT_HREF}
              className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Start free assessment
            </Link>
          </div>
          <SeoCiteEmbed title="Statute of Limitations Checker" path="/tools/sol-checker" embedToolPath="/tools/sol-checker" />
        </>
      )}
    </div>
  )
}
