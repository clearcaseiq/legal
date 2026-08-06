import { Link } from 'react-router-dom'
import { CheckCircle, ClipboardList, BarChart3, Users, Car, Scale, Handshake, Trophy } from 'lucide-react'

// The claimant journey, rendered as an animated timeline further down the page.
const JOURNEY = [
  { label: 'Accident', Icon: Car },
  { label: 'Case Assessment', Icon: ClipboardList },
  { label: 'Attorney Review', Icon: Scale },
  { label: 'Negotiation', Icon: Handshake },
  { label: 'Resolution', Icon: Trophy },
]

export default function HowItWorks() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Headline + intro */}
      <h1 className="text-3xl font-bold text-slate-900 text-center mb-4">How ClearCaseIQ Works</h1>
      <p className="text-slate-600 text-center mb-12">
        ClearCaseIQ helps you understand whether you may have a personal injury case before speaking with an attorney, using an AI-powered assessment that analyzes your accident details and compares them with similar injury cases.
      </p>

      {/* Steps */}
      <div className="relative grid md:grid-cols-3 gap-6 mb-12">
        {/* Connecting line behind the icon badges on desktop. */}
        <div
          className="pointer-events-none absolute inset-x-[16%] top-14 hidden h-0.5 bg-gradient-to-r from-brand-200 via-brand-300 to-emerald-200 md:block"
          aria-hidden
        />
        {[
          { Icon: ClipboardList, title: 'Tell us what happened', body: "Answer a few quick questions about your accident, your injuries, and where it happened. It takes about a minute, and you don't need an account to start." },
          { Icon: BarChart3, title: 'See what your case may look like', body: 'Get a plain-English snapshot: an estimated value range, how ready your case looks, and a typical timeline, all based on outcomes from similar injury cases.' },
          { Icon: Users, title: 'Connect with the right attorneys', body: "When you're ready, choose to securely share your case with vetted attorneys who handle cases like yours. You're never obligated to hire anyone." },
        ].map((step, i) => (
          <div
            key={step.title}
            className="hiw-reveal relative rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-4 ring-white">
              <step.Icon className="h-7 w-7" aria-hidden />
              <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-sm">{i + 1}</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h2>
            <p className="text-slate-600 text-sm">{step.body}</p>
          </div>
        ))}
      </div>

      {/* Journey timeline — animated stepper */}
      <div className="mb-12 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-brand-50/40 p-6 sm:p-8">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Your case journey</p>
        <div className="relative">
          {/* Track: a full-width base line with an animated gradient line drawn over it (desktop only). */}
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-6 hidden h-0.5 bg-slate-200 sm:block" aria-hidden />
          <div className="hiw-line-grow pointer-events-none absolute left-[10%] right-[10%] top-6 hidden h-0.5 bg-gradient-to-r from-brand-500 to-emerald-500 sm:block" aria-hidden />
          <ol className="relative grid grid-cols-2 gap-y-6 sm:grid-cols-5">
            {JOURNEY.map((stage, i) => (
              <li
                key={stage.label}
                className="hiw-reveal flex flex-col items-center text-center"
                style={{ animationDelay: `${350 + i * 140}ms` }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md ring-1 ring-brand-500/20">
                  <stage.Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-2 text-xs font-semibold text-slate-700 sm:text-sm">{stage.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">What Happens Next</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold text-sm flex-shrink-0">1</span>
            <div>
              <h3 className="font-semibold text-slate-900">Attorneys review your case summary</h3>
              <p className="text-slate-600 text-sm">Your case is sent to attorneys who specialize in your type of injury and jurisdiction.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold text-sm flex-shrink-0">2</span>
            <div>
              <h3 className="font-semibold text-slate-900">Interested attorneys contact you</h3>
              <p className="text-slate-600 text-sm">You receive outreach from attorneys who want to discuss your case.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold text-sm flex-shrink-0">3</span>
            <div>
              <h3 className="font-semibold text-slate-900">You decide whether to move forward</h3>
              <p className="text-slate-600 text-sm">There is no obligation to hire. You choose the attorney that feels right for you.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Example Case Insights */}
      <div className="mb-12 p-6 bg-white border border-slate-200 rounded-xl">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Example Case Insights</h2>
        <p className="text-center text-slate-600 text-sm mb-6">Here's what you might see after completing the assessment.</p>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-500 mb-1">Estimated Case Value</p>
            <p className="text-xl font-bold text-slate-900">$3,000 – $22,000</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-500 mb-1">Case Readiness</p>
            <p className="text-xl font-bold text-slate-900">Developing</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-500 mb-1">Estimated Timeline</p>
            <p className="text-xl font-bold text-slate-900">8–14 months</p>
          </div>
        </div>
      </div>

      {/* Trust signals */}
      <div className="mb-12">
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">Your information is secure and confidential</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">No obligation to hire an attorney</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <span className="text-slate-700 font-medium">Takes about 60 seconds</span>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Do I need a lawyer to use ClearCaseIQ?</h3>
            <p className="text-slate-600">No. ClearCaseIQ helps you understand your case before speaking with an attorney.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">How long does the assessment take?</h3>
            <p className="text-slate-600">Most users complete it in about 60 seconds.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Is my information shared automatically?</h3>
            <p className="text-slate-600">No. Your case is only shared with attorneys after you approve.</p>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Find Out If You May Have a Personal Injury Case</h2>
          <Link
            to="/assessment/start"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
          >
            Start Free Assessment
          </Link>
        </div>
      </div>
    </div>
  )
}
