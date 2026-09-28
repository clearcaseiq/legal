import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, CheckCircle, Clock, HelpCircle, Scale, ShieldCheck, Route as RouteIcon, Lock } from 'lucide-react'
import FaqSection from '../components/FaqSection'
import {
  caseAssessmentPages,
  caseAssessmentPagesByPath,
  caseAssessmentStartHref,
} from '../data/caseAssessmentPages'

const TRUST_POINTS = [
  { Icon: CheckCircle, label: 'Free, no obligation' },
  { Icon: Clock, label: 'Takes about 5 minutes' },
  { Icon: Lock, label: 'Private — no attorney contact unless you choose' },
]

const STEPS = [
  { title: 'Answer a few questions', body: 'What happened, how you were hurt, and the treatment you have had.' },
  { title: 'See your assessment', body: 'A preliminary view of your claim, a possible value range, and your deadline.' },
  { title: 'Decide what is next', body: 'Keep it for yourself, or choose attorneys to review your case.' },
]

export default function CaseAssessmentLanding() {
  const { pathname } = useLocation()
  const page = caseAssessmentPagesByPath.get(pathname) ?? caseAssessmentPages[0]
  const startHref = caseAssessmentStartHref(page)

  const questions = [
    { Icon: HelpCircle, title: 'Do I have a case?', body: page.haveCase },
    { Icon: Scale, title: 'What could it be worth?', body: page.worth },
    { Icon: RouteIcon, title: 'What should I do next?', body: page.nextSteps },
  ]

  return (
    <div className="mx-auto max-w-4xl py-8">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-brand-50/60 px-6 py-10 text-center shadow-sm sm:px-10 sm:py-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{page.eyebrow}</p>
        <h1 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{page.headline}</h1>
        <p className="mx-auto mb-8 max-w-2xl text-slate-600 sm:text-lg">{page.intro}</p>
        <Link
          to={startHref}
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Start my free assessment
          <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
        </Link>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
          {TRUST_POINTS.map(({ Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-green-600" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </section>

      <section className="my-12 grid gap-6 md:grid-cols-3">
        {questions.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600">{body}</p>
          </div>
        ))}
      </section>

      <section className="mb-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">What your assessment looks at</h2>
          <ul className="space-y-3">
            {page.factors.map((factor) => (
              <li key={factor} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" aria-hidden />
                {factor}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Clock className="h-5 w-5 text-amber-600" aria-hidden />
            Deadlines matter
          </h2>
          <p className="text-sm text-slate-700">{page.deadline}</p>
          <p className="mt-3 text-xs text-slate-500">
            Your assessment estimates the deadline for your situation. Exceptions apply, so confirm it with an attorney.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">How it works</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-600">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <FaqSection className="mb-12" title="Common questions" items={page.faq} />

      <section className="mb-10 rounded-2xl bg-slate-900 px-6 py-10 text-center text-white">
        <h2 className="mb-2 text-2xl font-bold">Find out where you stand</h2>
        <p className="mx-auto mb-6 max-w-xl text-slate-300">
          It is free, takes a few minutes, and nothing is shared with an attorney unless you choose to.
        </p>
        <Link
          to={startHref}
          className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-lg font-semibold text-slate-900 transition-colors hover:bg-slate-100"
        >
          Start my free assessment
          <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
        </Link>
      </section>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
        <span>
          ClearCaseIQ is a legal technology platform, not a law firm, and does not provide legal advice. Assessments and
          value ranges are preliminary estimates based on the information you provide, not a guarantee of any outcome.
          Attorney review happens only with your consent. See our{' '}
          <Link to="/disclosures" className="underline hover:text-slate-700">platform disclosures</Link>.
        </span>
      </p>
    </div>
  )
}
