import { type FormEvent, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CheckCircle2, ShieldAlert } from 'lucide-react'
import SeoCiteEmbed from '../components/SeoCiteEmbed'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'
import {
  CA_SOL_CLAIM_OPTIONS,
  computeCaliforniaSol,
  formatDisplayDate,
  statusLabel,
  type CaSolClaimType,
  type PublicSolResult,
} from '../lib/publicCaSol'

const statusStyles: Record<PublicSolResult['status'], string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  critical: 'border-orange-200 bg-orange-50 text-orange-950',
  expired: 'border-rose-200 bg-rose-50 text-rose-950',
}

export default function CaliforniaSolChecker() {
  const [searchParams] = useSearchParams()
  const embed = searchParams.get('embed') === '1'

  const [incidentDate, setIncidentDate] = useState('')
  const [claimType, setClaimType] = useState<CaSolClaimType>('auto')
  const [againstGovernment, setAgainstGovernment] = useState(false)
  const [result, setResult] = useState<PublicSolResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const maxDate = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const computed = computeCaliforniaSol({ incidentDate, claimType, againstGovernment })
    if ('error' in computed) {
      setResult(null)
      setError(computed.error)
      return
    }
    setError(null)
    setResult(computed)
  }

  return (
    <div className={`mx-auto max-w-3xl space-y-8 ${embed ? 'py-4' : 'py-8'}`}>
      {!embed && (
        <header className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">California tool</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            California statute of limitations checker
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Get an educational estimate of common California filing windows for injury claims — including a separate
            public-entity presentation clock when a government defendant may be involved.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ClearCaseIQ is not a law firm and this tool is not legal advice. Deadlines have exceptions; confirm with a
            licensed California attorney.
          </p>
        </header>
      )}

      {embed && (
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900">CA deadline checker</h1>
          <p className="text-sm text-slate-600">Educational estimate only — not legal advice.</p>
        </header>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Incident date</span>
            <input
              type="date"
              required
              max={maxDate}
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Claim type</span>
            <select
              value={claimType}
              onChange={(e) => setClaimType(e.target.value as CaSolClaimType)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {CA_SOL_CLAIM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/50">
          <input
            type="checkbox"
            checked={againstGovernment}
            onChange={(e) => setAgainstGovernment(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-slate-800 dark:text-slate-100">Possible government / public-entity defendant</span>
            <span className="mt-0.5 block text-slate-600 dark:text-slate-300">
              City, county, transit agency, school district, or similar. California often requires an earlier claim
              presentation (commonly about six months) before a lawsuit.
            </span>
          </span>
        </label>

        {error && (
          <p className="flex items-center gap-2 text-sm text-rose-700" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Check deadlines
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${statusStyles[result.status]}`}>
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">Typical civil filing window</p>
                <h2 className="mt-1 text-lg font-semibold">{result.claimLabel}</h2>
                <p className="mt-2 text-sm">
                  General period often cited: about <strong>{result.years} year{result.years === 1 ? '' : 's'}</strong> from
                  the incident date → deadline around <strong>{formatDisplayDate(result.filingDeadline)}</strong>.
                </p>
                <p className="mt-1 text-sm font-medium">
                  {statusLabel(result.status)}
                  {result.daysRemaining >= 0
                    ? ` · ${result.daysRemaining.toLocaleString()} day${result.daysRemaining === 1 ? '' : 's'} remaining (estimate)`
                    : ` · ${Math.abs(result.daysRemaining).toLocaleString()} days past the general estimate`}
                </p>
                {result.ruleNote && <p className="mt-2 text-sm opacity-90">{result.ruleNote}</p>}
              </div>
            </div>
          </div>

          {result.governmentDeadline && result.governmentStatus && result.governmentDaysRemaining != null && (
            <div className={`rounded-2xl border p-5 ${statusStyles[result.governmentStatus]}`}>
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide">Public-entity claim presentation</p>
                  <h2 className="mt-1 text-lg font-semibold">Earlier government clock</h2>
                  <p className="mt-2 text-sm">
                    Educational estimate: about six months from the incident → around{' '}
                    <strong>{formatDisplayDate(result.governmentDeadline)}</strong>.
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {statusLabel(result.governmentStatus)}
                    {result.governmentDaysRemaining >= 0
                      ? ` · ${result.governmentDaysRemaining.toLocaleString()} days remaining (estimate)`
                      : ` · ${Math.abs(result.governmentDaysRemaining).toLocaleString()} days past the estimate`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span>
                Tolling, minors, discovery rules, and claim classification can change these dates. Use a free ClearCaseIQ
                assessment to organize facts, then talk to counsel about your specific deadline.
              </span>
            </p>
          </div>
        </div>
      )}

      {!embed && (
        <>
          <div className="flex flex-wrap gap-3">
            <Link
              to={START_ASSESSMENT_HREF}
              className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Start free assessment
            </Link>
            <Link
              to="/california-statute-of-limitations-personal-injury"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Read SOL guide
            </Link>
          </div>
          <SeoCiteEmbed
            title="California Statute of Limitations Checker"
            path="/tools/california-sol-checker"
            embedToolPath="/tools/california-sol-checker"
          />
        </>
      )}

      {embed && (
        <p className="text-center text-xs text-slate-500">
          Powered by{' '}
          <a href="https://www.clearcaseiq.com" target="_blank" rel="noreferrer" className="font-semibold text-brand-700">
            ClearCaseIQ
          </a>{' '}
          · Not a law firm
        </p>
      )}
    </div>
  )
}
