import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  FileSearch,
  FileSignature,
  Gauge,
  MapPin,
  Scale,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import AttorneyProductTour from '../components/AttorneyProductTour'
import { getPlatformPricing } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

const VALUE_PROP_ICONS = [ShieldCheck, Gauge, Users, Clock]
const BENEFIT_ICONS = [FileSearch, Sparkles, Stethoscope, Scale, ScrollText, TrendingUp]
const FREE_ICONS = [Wallet, FileSearch, Briefcase, Users]

// Capability groups: icon + how many bullet items each group has in the locale files.
const CAPABILITY_GROUPS = [
  { icon: FileSearch, prefix: 'cap1', count: 8 },
  { icon: Bot, prefix: 'cap2', count: 6 },
  { icon: ScrollText, prefix: 'cap3', count: 6 },
  { icon: CalendarClock, prefix: 'cap4', count: 6 },
  { icon: FileSignature, prefix: 'cap5', count: 5 },
  { icon: Building2, prefix: 'cap6', count: 5 },
  { icon: Smartphone, prefix: 'cap7', count: 4 },
]

function formatFee(priceCents: number): string {
  return (priceCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

/**
 * The case fee is administrator-editable, so the page quotes the live value.
 * While it loads — or if the request fails — the surrounding copy still reads
 * correctly without a number, which is the safe way for a page making pricing
 * claims to degrade.
 */
function useCaseFee(): string | null {
  const [fee, setFee] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getPlatformPricing()
      .then(({ caseFee }) => {
        if (active && caseFee) setFee(formatFee(caseFee.priceCents))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return fee
}

export default function AttorneyNetwork() {
  const { t } = useLanguage()
  const caseFee = useCaseFee()

  return (
    <div className="space-y-14 pb-6 sm:space-y-20">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 px-6 py-12 text-white shadow-xl shadow-slate-900/20 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
              <Scale className="h-3.5 w-3.5" />
              {t('attorneyNet.badge')}
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {t('attorneyNet.heroTitle')}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              {t('attorneyNet.heroSub')}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/attorney-register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-900/40 transition hover:bg-brand-400"
              >
                {t('auth.joinAttorneyNetwork')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/attorney-login"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
              >
                {t('auth.attorneyLoginLabel')}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
              {[1, 2, 3].map((n) => (
                <span key={n} className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-brand-300" />
                  {t(`attorneyNet.chip${n}`)}
                </span>
              ))}
            </div>
          </div>

          {/* Product preview card */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t('attorneyNet.newMatch')}
                  </span>
                  <p className="mt-2 text-base font-bold text-slate-900">{t('attorneyNet.previewCase')}</p>
                  <p className="text-xs text-slate-500">Los Angeles County, CA</p>
                </div>
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                  <span className="text-lg font-extrabold leading-none">87</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-brand-500">{t('attorneyNet.scoreLabel')}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('attorneyNet.estValue')}</p>
                  <p className="font-semibold text-slate-900">$180k–$240k</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('attorneyNet.liability')}</p>
                  <p className="font-semibold text-emerald-600">{t('attorneyNet.liabilityClear')}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('attorneyNet.treatment')}</p>
                  <p className="font-semibold text-slate-900">{t('attorneyNet.treatmentValue')}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('attorneyNet.evidence')}</p>
                  <p className="font-semibold text-slate-900">{t('attorneyNet.evidenceValue')}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs font-medium text-brand-800">
                <Sparkles className="h-4 w-4 text-brand-500" />
                {t('attorneyNet.aiReady')}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white">{t('attorneyNet.accept')}</div>
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-600">{t('attorneyNet.review')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROP BAND */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROP_ICONS.map((Icon, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-extrabold text-slate-900">{t(`attorneyNet.vp${i + 1}Value`)}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t(`attorneyNet.vp${i + 1}Label`)}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t(`attorneyNet.vp${i + 1}Detail`)}</p>
          </div>
        ))}
      </section>

      {/* WHAT'S FREE + PRICING */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{t('attorneyNet.pricingLabel')}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t('attorneyNet.pricingTitle')}
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            {t('attorneyNet.pricingSub')}
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {FREE_ICONS.map((Icon, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{t(`attorneyNet.free${i + 1}Title`)}</h3>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    {t('attorneyNet.freeBadge')}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t(`attorneyNet.free${i + 1}Detail`)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-brand-200 bg-brand-50/60">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">{t('attorneyNet.onlyFee')}</p>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-slate-900">{caseFee ?? t('attorneyNet.flatFallback')}</span>
                {caseFee && <span className="text-lg font-semibold text-slate-500">{t('attorneyNet.perAccepted')}</span>}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {t('attorneyNet.feeNote')}
              </p>
            </div>
            <ul className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <span>{t(`attorneyNet.feeLine${n}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{t('auth.whyAttorneysJoin')}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t('attorneyNet.benefitsTitle')}
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            {t('attorneyNet.benefitsSub')}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BENEFIT_ICONS.map((Icon, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{t(`attorneyNet.b${i + 1}Title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t(`attorneyNet.b${i + 1}Detail`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT YOU GET — CAPABILITY INVENTORY */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{t('attorneyNet.includedLabel')}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t('attorneyNet.includedTitle')}
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            {t('attorneyNet.includedSub')}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITY_GROUPS.map(({ icon: Icon, prefix, count }) => (
            <div key={prefix} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t(`attorneyNet.${prefix}Title`)}</h3>
              </div>
              <ul className="mt-5 space-y-2.5">
                {Array.from({ length: count }, (_, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-6 text-slate-600">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                    <span>{t(`attorneyNet.${prefix}i${i + 1}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-slate-500">
          {t('attorneyNet.aiDisclaimer')}
        </p>
      </section>

      {/* HOW IT WORKS — INTERACTIVE WALKTHROUGH */}
      <section className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 sm:px-10">
        <AttorneyProductTour caseFee={caseFee} />
      </section>

      {/* COMPARISON */}
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{t('attorneyNet.diffLabel')}</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{t('attorneyNet.diffTitle')}</h2>
          <p className="mt-3 text-lg text-slate-600">
            {t('attorneyNet.diffSub')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <span
                key={n}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {t(`attorneyNet.pa${n}`)}
              </span>
            ))}
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm">
            <MapPin className="h-4 w-4 text-brand-600" />
            {t('attorneyNet.servingNote')}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-2 bg-slate-900 text-sm font-semibold text-white">
            <div className="px-4 py-3">{t('attorneyNet.tradCol')}</div>
            <div className="px-4 py-3 bg-brand-600">ClearCaseIQ</div>
          </div>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="grid grid-cols-2 border-t border-slate-200 bg-white text-sm">
              <div className="px-4 py-3 text-slate-500">{t(`attorneyNet.d${n}Trad`)}</div>
              <div className="flex items-start gap-2 bg-brand-50/50 px-4 py-3 font-semibold text-brand-900">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {t(`attorneyNet.d${n}Ours`)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* REQUIREMENTS + FAQ */}
      <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900">{t('attorneyNet.reqTitle')}</h2>
          <p className="mt-2 text-sm text-slate-600">{t('attorneyNet.reqSub')}</p>
          <ul className="mt-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex items-center gap-3 text-slate-700">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="text-sm font-medium">{t(`attorneyNet.req${n}`)}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/attorney-register"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t('attorneyNet.startApp')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{t('attorneyNet.faqLabel')}</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{t('attorneyNet.faqTitle')}</h2>
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <details
                key={n}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-slate-900">
                  {t(`attorneyNet.fq${n}`)}
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{t(`attorneyNet.fa${n}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-12 text-center shadow-xl shadow-brand-900/20 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-white">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {t('attorneyNet.ctaTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-brand-50">
            {t('attorneyNet.ctaSub')}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/attorney-register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
            >
              {t('auth.joinAttorneyNetwork')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/attorney-login"
              className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {t('auth.attorneyLoginLabel')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
