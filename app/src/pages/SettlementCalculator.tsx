import { type FormEvent, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Calculator, Info, ShieldCheck, TriangleAlert } from 'lucide-react'
import SeoCiteEmbed from '../components/SeoCiteEmbed'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'
import {
  SETTLEMENT_CALCULATOR_FAQS,
  SETTLEMENT_CALCULATOR_WHAT_TO_TRACK,
  SETTLEMENT_CALCULATOR_WHY_IT_MATTERS,
} from '../data/settlementCalculatorContent'
import { calculatorVariantBySlug } from '../data/settlementCalculatorVariants'
import {
  LIABILITY_OPTIONS,
  SEVERITY_OPTIONS,
  estimateSettlement,
  formatUsd,
  type EstimateClaimType,
  type InjurySeverity,
  type LiabilityClarity,
  type SettlementEstimate,
} from '../lib/settlementEstimate'

/** Kept as strings so the fields can be empty rather than showing a forced 0. */
type MoneyFields = {
  medicalBills: string
  futureMedical: string
  lostWages: string
  otherCosts: string
  policyLimit: string
}

const defaultRelatedTools = [
  { label: 'Check your filing deadline', to: '/tools/california-sol-checker' },
  { label: 'Settlement value by injury', to: '/topics/settlement-value' },
]

const EMPTY_MONEY: MoneyFields = {
  medicalBills: '',
  futureMedical: '',
  lostWages: '',
  otherCosts: '',
  policyLimit: '',
}

function toNumber(value: string) {
  if (!value.trim()) return 0
  // Tolerate the way people actually type money: "12,500", "$12,500".
  return Number(value.replace(/[$,\s]/g, ''))
}

export default function SettlementCalculator() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const embed = searchParams.get('embed') === '1'

  // One component serves the general calculator and the per-injury variants. The
  // engine is identical; the variant supplies the defaults and the claim-specific
  // facts, which is what keeps these from being five copies of one page.
  const variant = calculatorVariantBySlug.get(location.pathname.replace(/\/+$/, '') || '/')
  const path = variant?.slug ?? '/tools/settlement-calculator'

  const [money, setMoney] = useState<MoneyFields>(EMPTY_MONEY)
  const [severity, setSeverity] = useState<InjurySeverity>(variant?.defaultSeverity ?? 'moderate')
  const [liability, setLiability] = useState<LiabilityClarity>('clear')
  const [claimType, setClaimType] = useState<EstimateClaimType>(variant?.defaultClaimType ?? 'general')
  const [faultPercent, setFaultPercent] = useState(0)
  const [result, setResult] = useState<SettlementEstimate | null>(null)
  const [error, setError] = useState<string | null>(null)

  const faqs = variant?.faqs ?? SETTLEMENT_CALCULATOR_FAQS

  const severityDetail = useMemo(
    () => SEVERITY_OPTIONS.find((option) => option.value === severity),
    [severity],
  )
  const liabilityDetail = useMemo(
    () => LIABILITY_OPTIONS.find((option) => option.value === liability),
    [liability],
  )

  const setField = (field: keyof MoneyFields) => (value: string) =>
    setMoney((current) => ({ ...current, [field]: value }))

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const computed = estimateSettlement({
      medicalBills: toNumber(money.medicalBills),
      futureMedical: toNumber(money.futureMedical),
      lostWages: toNumber(money.lostWages),
      otherCosts: toNumber(money.otherCosts),
      policyLimit: toNumber(money.policyLimit),
      severity,
      liability,
      faultPercent,
      claimType,
    })

    if ('error' in computed) {
      setResult(null)
      setError(computed.error)
      return
    }
    setError(null)
    setResult(computed)
  }

  const reset = () => {
    setMoney(EMPTY_MONEY)
    setSeverity(variant?.defaultSeverity ?? 'moderate')
    setLiability('clear')
    setClaimType(variant?.defaultClaimType ?? 'general')
    setFaultPercent(0)
    setResult(null)
    setError(null)
  }

  return (
    <div className={`mx-auto max-w-3xl space-y-8 ${embed ? 'py-4' : 'py-8'}`}>
      {embed ? (
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900">{variant?.h1 ?? 'Settlement range calculator'}</h1>
          <p className="text-sm text-slate-600">Educational estimate only — not legal advice.</p>
        </header>
      ) : (
        <header className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {variant?.eyebrow ?? 'Free tool'}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            {variant?.h1 ?? 'Accident settlement calculator'}
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {variant?.intro ??
              'Estimate a settlement range from your documented losses using the multiplier method — the same arithmetic plaintiff firms and insurers describe publicly. Every step is shown, so you can check the math yourself.'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nothing you enter leaves your browser. ClearCaseIQ is not a law firm, this is not legal advice, and no
            calculator can predict what a specific claim will settle for.
          </p>
        </header>
      )}

      {variant?.methodWarning && (
        <p className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-relaxed text-orange-950">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{variant.methodWarning}</span>
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      >
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">Documented losses</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyInput
              label="Medical bills to date"
              hint="Total billed, before insurance adjustments."
              value={money.medicalBills}
              onChange={setField('medicalBills')}
            />
            <MoneyInput
              label="Estimated future medical care"
              hint="Optional. Surgery, injections, or ongoing therapy."
              value={money.futureMedical}
              onChange={setField('futureMedical')}
            />
            <MoneyInput
              label={variant?.wageLabel ?? 'Lost wages or income'}
              hint={variant?.wageHint ?? 'Time missed from work, documented.'}
              value={money.lostWages}
              onChange={setField('lostWages')}
            />
            <MoneyInput
              label="Other out-of-pocket costs"
              hint="Optional. Mileage, devices, household help."
              value={money.otherCosts}
              onChange={setField('otherCosts')}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">Injury and fault</legend>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Injury severity</span>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as InjurySeverity)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {severityDetail && (
              <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {severityDetail.hint} Multiplier {severityDetail.low}× to {severityDetail.high}×.
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Who was at fault</span>
            <select
              value={liability}
              onChange={(event) => setLiability(event.target.value as LiabilityClarity)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {LIABILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {liabilityDetail && (
              <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {liabilityDetail.hint}
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-200">Your own share of fault</span>
              <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{faultPercent}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={faultPercent}
              onChange={(event) => setFaultPercent(Number(event.target.value))}
              className="w-full accent-brand-700"
            />
            <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              California reduces recovery by your share of fault but never eliminates it, even above 50%.
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">Claim type</span>
            <select
              value={claimType}
              onChange={(event) => setClaimType(event.target.value as EstimateClaimType)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="general">Auto, premises, dog bite, or product</option>
              <option value="medical_malpractice">Medical malpractice</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">Insurance (optional)</legend>
          <MoneyInput
            label="Known insurance policy limit"
            hint={
              variant?.coverageHint ??
              'Leave blank if unknown. Available coverage often decides the actual recovery.'
            }
            value={money.policyLimit}
            onChange={setField('policyLimit')}
          />
        </fieldset>

        {error && (
          <p className="flex items-center gap-2 text-sm text-rose-700" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <Calculator className="h-4 w-4" aria-hidden />
            Calculate range
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Reset
          </button>
        </div>
      </form>

      {result && <EstimateResult result={result} extraCaveats={variant?.caveats ?? []} />}

      {!embed && (
        <>
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">How this is calculated</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <li>Economic loss is the sum of medical bills, future care, lost wages, and out-of-pocket costs.</li>
              <li>
                A non-economic component is medical costs multiplied by a severity multiplier between 1.5× and 10×. This
                stands in for pain and disruption, which have no invoice.
              </li>
              <li>If fault is disputed, the total is discounted, because carriers pay less when liability is contested.</li>
              <li>The result is reduced by your share of fault under California&rsquo;s pure comparative negligence rule.</li>
              <li>If you entered a policy limit, the range is capped at it.</li>
            </ol>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              The method has real limitations. Tying non-economic damages to treatment cost undervalues a serious injury
              treated cheaply and overvalues a minor injury treated expensively. It ignores venue, the specific adjuster,
              your credibility as a witness, and liens that reduce what you actually keep. Treat the output as a
              starting point for a conversation, not a target.
            </p>
          </section>

          {variant ? (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                What actually drives value in these claims
              </h2>
              <dl className="space-y-3">
                {variant.valueDrivers.map((driver) => (
                  <div
                    key={driver.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <dt className="text-sm font-semibold text-slate-900 dark:text-slate-100">{driver.label}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{driver.copy}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Why settlement value varies</h2>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {SETTLEMENT_CALCULATOR_WHY_IT_MATTERS}
              </p>
              <h3 className="pt-2 text-base font-semibold text-slate-900 dark:text-slate-100">What to document</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {SETTLEMENT_CALCULATOR_WHAT_TO_TRACK.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Common questions</h2>
            <dl className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <dt className="text-sm font-semibold text-slate-900 dark:text-slate-100">{faq.q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              to={START_ASSESSMENT_HREF}
              className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Organize your records free
            </Link>
            {(variant?.relatedTools ?? defaultRelatedTools).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <SeoCiteEmbed title={variant?.h1 ?? 'Accident Settlement Calculator'} path={path} embedToolPath={path} />
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

function MoneyInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</span>
    </label>
  )
}

function EstimateResult({
  result,
  extraCaveats,
}: {
  result: SettlementEstimate
  extraCaveats: string[]
}) {
  const notes = [...result.notes, ...extraCaveats]

  return (
    <section className="space-y-4" aria-live="polite">
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-900">Educational estimate</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-tight text-brand-950">
          {formatUsd(result.low)} – {formatUsd(result.high)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-brand-900">
          A wide range is the honest answer. Where a real claim lands inside it depends on documentation, the carrier,
          and negotiation — not on arithmetic.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <caption className="sr-only">Breakdown of the settlement range calculation</caption>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            <Row label="Economic loss (documented)" value={formatUsd(result.economicTotal)} />
            <Row
              label={`Non-economic (${result.multiplierLow}×–${result.multiplierHigh}× of ${formatUsd(result.medicalSpecials)} medical)`}
              value={`${formatUsd(result.nonEconomicLow)} – ${formatUsd(result.nonEconomicHigh)}`}
            />
            <Row
              label="Subtotal after liability discount"
              value={`${formatUsd(result.grossLow)} – ${formatUsd(result.grossHigh)}`}
            />
            {result.faultPercent > 0 && (
              <Row label={`Less your ${result.faultPercent}% share of fault`} value={`−${result.faultPercent}%`} />
            )}
            {result.cappedByPolicyLimit && <Row label="Capped at policy limit" value={formatUsd(result.high)} />}
            <Row label="Estimated range" value={`${formatUsd(result.low)} – ${formatUsd(result.high)}`} emphasis />
          </tbody>
        </table>
      </div>

      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note}
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        <span>
          This is not a settlement offer, a valuation, or legal advice, and it does not account for attorney fees,
          medical liens, or subrogation — all of which reduce what you keep. Only a licensed attorney reviewing your
          records can evaluate your claim.
        </span>
      </p>
    </section>
  )
}

function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <tr className={emphasis ? 'bg-slate-50 dark:bg-slate-900/60' : undefined}>
      <th
        scope="row"
        className={`px-4 py-3 text-left font-medium ${emphasis ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}
      >
        {label}
      </th>
      <td
        className={`px-4 py-3 text-right font-mono tabular-nums ${emphasis ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}
      >
        {value}
      </td>
    </tr>
  )
}
