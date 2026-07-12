import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  FileSearch,
  Gauge,
  MapPin,
  Scale,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react'

const trustChips = [
  'No pay-per-lead',
  'Review before you accept',
  'AI case intelligence included',
]

const valueProps = [
  { icon: ShieldCheck, label: 'Pay-per-lead', value: '$0', detail: 'Review cases free — no cost until you accept.' },
  { icon: Gauge, label: 'Every case', value: 'Pre-scored', detail: 'Viability, liability, and value signals up front.' },
  { icon: Users, label: 'Plaintiffs', value: 'Choose you', detail: 'Matches come from clients selecting counsel.' },
  { icon: Clock, label: 'Case review', value: 'Minutes', detail: 'Attorney-ready packages, not raw leads.' },
]

const benefits = [
  {
    icon: FileSearch,
    title: 'Qualified, structured cases',
    detail: 'Review plaintiff-submitted facts, documents, venue, and valuation signals before you decide.',
  },
  {
    icon: Sparkles,
    title: 'AI case intelligence',
    detail: 'Viability scoring, liability indicators, and a settlement range on every match.',
  },
  {
    icon: Stethoscope,
    title: 'Medical chronology',
    detail: 'Extracted treatment timelines and records gaps so you can assess damages fast.',
  },
  {
    icon: Scale,
    title: 'Plaintiffs choose you',
    detail: 'Clients actively select their preferred attorneys — not resold, shared leads.',
  },
  {
    icon: ScrollText,
    title: 'Full case management',
    detail: 'Evidence, demand prep, negotiation, and e-signature — all in one workspace.',
  },
  {
    icon: TrendingUp,
    title: 'Better intake ROI',
    detail: 'Increase retained cases and cut hours of manual review per matter.',
  },
]

const howItWorks = [
  { title: 'Plaintiff submits a case', detail: 'Injury cases come in with structured intake details and documents.' },
  { title: 'AI builds an assessment', detail: 'ClearCaseIQ scores viability, liability, damages, and evidence.' },
  { title: 'You receive matched cases', detail: 'Cases are routed by practice area, jurisdiction, and fit.' },
  { title: 'Review and accept', detail: 'Open the case package, review intelligence, accept selectively.' },
  { title: 'Work it end to end', detail: 'Accepted cases move into your firm workflow and dashboard.' },
]

const differentiators = [
  { traditional: 'Buys and resells leads', clearcase: 'Plaintiffs choose their attorneys' },
  { traditional: 'Limited, unverified information', clearcase: 'Full AI case assessment included' },
  { traditional: 'One-time lead handoff', clearcase: 'End-to-end case management' },
  { traditional: 'Unknown case quality', clearcase: 'Viability and readiness scoring' },
  { traditional: 'Pay for every lead', clearcase: 'Review free — commit when you accept' },
]

const practiceAreas = [
  'Personal Injury',
  'Auto Accident',
  'Slip & Fall',
  'Wrongful Death',
  'Product Liability',
  'Dog Bite',
  'Medical Malpractice',
]

const requirements = ['Licensed, practicing attorney', 'Personal injury practice', 'Good standing with the state bar']

const faqs = [
  { q: 'How are cases matched?', a: 'Cases are routed based on jurisdiction, practice area, and case attributes so you only see relevant matters.' },
  { q: 'Do I have to accept every case?', a: 'No. You review each case and its AI assessment, then accept selectively — there is no obligation.' },
  { q: 'Is this pay-per-lead?', a: 'No. Reviewing matched cases is free. You only commit once you choose to accept a case.' },
  { q: 'How quickly do I receive case details?', a: 'Immediately after a match is made, with the full case package and intelligence ready to review.' },
]

export default function AttorneyNetwork() {
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
              For Personal Injury Attorneys
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Receive qualified PI cases with AI‑powered intelligence
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              Qualified injury cases from plaintiffs actively choosing counsel — every match pre‑scored,
              documented, and ready to review. No pay‑per‑lead.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/attorney-register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-900/40 transition hover:bg-brand-400"
              >
                Join the Attorney Network
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/attorney-login"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Attorney Login
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
              {trustChips.map((chip) => (
                <span key={chip} className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-brand-300" />
                  {chip}
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
                    New match
                  </span>
                  <p className="mt-2 text-base font-bold text-slate-900">Auto accident &middot; rear‑end collision</p>
                  <p className="text-xs text-slate-500">Los Angeles County, CA</p>
                </div>
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                  <span className="text-lg font-extrabold leading-none">87</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-brand-500">score</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Est. value</p>
                  <p className="font-semibold text-slate-900">$180k–$240k</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Liability</p>
                  <p className="font-semibold text-emerald-600">Clear</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Treatment</p>
                  <p className="font-semibold text-slate-900">6 providers</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Evidence</p>
                  <p className="font-semibold text-slate-900">12 items</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs font-medium text-brand-800">
                <Sparkles className="h-4 w-4 text-brand-500" />
                AI case assessment ready to review
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white">Accept</div>
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-600">Review</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROP BAND */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {valueProps.map(({ icon: Icon, label, value, detail }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
          </div>
        ))}
      </section>

      {/* BENEFITS */}
      <section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Why attorneys join</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            More than leads — a complete case pipeline
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Everything you need to evaluate, accept, and work personal injury cases in one place.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, detail }) => (
            <div
              key={title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">From plaintiff case to your workflow</h2>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
          {howItWorks.map((step, index) => (
            <li key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {index + 1}
              </div>
              <h3 className="mt-4 text-sm font-bold leading-5 text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* COMPARISON */}
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Why ClearCaseIQ is different</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Not another lead vendor</h2>
          <p className="mt-3 text-lg text-slate-600">
            Traditional vendors sell you contact information. ClearCaseIQ delivers qualified, scored cases from
            plaintiffs who chose you — with the intelligence to work them.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {practiceAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                {area}
              </span>
            ))}
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm">
            <MapPin className="h-4 w-4 text-brand-600" />
            Currently serving California &middot; expanding nationwide
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-2 bg-slate-900 text-sm font-semibold text-white">
            <div className="px-4 py-3">Traditional lead vendor</div>
            <div className="px-4 py-3 bg-brand-600">ClearCaseIQ</div>
          </div>
          {differentiators.map((row) => (
            <div key={row.traditional} className="grid grid-cols-2 border-t border-slate-200 bg-white text-sm">
              <div className="px-4 py-3 text-slate-500">{row.traditional}</div>
              <div className="flex items-start gap-2 bg-brand-50/50 px-4 py-3 font-semibold text-brand-900">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {row.clearcase}
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
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Membership requirements</h2>
          <p className="mt-2 text-sm text-slate-600">A quick verification keeps the network trusted for plaintiffs.</p>
          <ul className="mt-6 space-y-3">
            {requirements.map((req) => (
              <li key={req} className="flex items-center gap-3 text-slate-700">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="text-sm font-medium">{req}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/attorney-register"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Start your application
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">FAQ</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-slate-900">
                  {faq.q}
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.a}</p>
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
            Ready to review qualified injury cases?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-brand-50">
            Join the network, review AI case intelligence, and manage retained clients — all in one platform.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/attorney-register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
            >
              Join the Attorney Network
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/attorney-login"
              className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Attorney Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
