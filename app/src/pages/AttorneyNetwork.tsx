import { Link } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

const benefits = [
  'Receive qualified PI cases',
  'Review AI-powered case intelligence',
  'Plaintiffs choose their preferred attorneys',
  'Import and manage existing firm cases',
  'Increase retained cases and improve intake ROI',
]

const socialProof = [
  'Trusted by PI Attorneys',
  'Average attorney response time: 4.2 hours',
  'Average retained rate: 31%',
]

const howItWorks = [
  'Plaintiffs submit injury cases',
  'ClearCaseIQ builds a case assessment',
  'Plaintiffs choose their preferred attorneys',
  'Attorneys review case intelligence',
  'Accepted cases move into your workflow',
]

const differentiators = [
  {
    traditional: 'Buys leads',
    clearcase: 'Plaintiffs choose attorneys',
  },
  {
    traditional: 'Limited information',
    clearcase: 'AI case assessment included',
  },
  {
    traditional: 'One-time lead',
    clearcase: 'Full case management',
  },
  {
    traditional: 'Unknown quality',
    clearcase: 'Readiness scoring',
  },
]

const idealFor = [
  'Personal Injury',
  'Auto Accident',
  'Slip & Fall',
  'Wrongful Death',
  'Product Liability',
  'Dog Bite',
  'Medical Malpractice',
]

const proofPoints = [
  {
    title: 'Qualified injury cases',
    detail: 'Review plaintiff-submitted case facts, documents, venue, and valuation signals before deciding.',
  },
  {
    title: 'Actionable firm dashboard',
    detail: 'Prioritize new matches, consults, records gaps, and demand-ready opportunities from one workspace.',
  },
  {
    title: 'Built for PI firms',
    detail: 'Import existing matters and organize retained cases around attorneys, intake, records, and demand work.',
  },
]

export default function AttorneyNetwork() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/" className="rounded-xl bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
          <BrandLogo size="md" />
        </Link>
        <Link to="/attorney-login" className="text-sm font-semibold text-slate-200 hover:text-white">
          Attorney Login
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">Attorney Network</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-extrabold tracking-tight sm:text-6xl">
              Receive Qualified PI Cases With AI-Powered Case Intelligence
            </h1>
            <p className="mt-5 max-w-2xl text-xl text-slate-200">
              Receive qualified injury cases from plaintiffs who are actively choosing counsel.
            </p>

            <div className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 sm:grid-cols-2">
              {socialProof.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-950/40 px-4 py-3 text-sm font-semibold text-slate-50">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-50">
                  {benefit}
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/attorney-register"
                className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-400"
              >
                Join Attorney Network
              </Link>
              <Link
                to="/attorney-login"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-base font-semibold text-white hover:bg-white/10"
              >
                Attorney Login
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Why Attorneys Join</p>
            <div className="mt-5 space-y-4">
              {[
                'Receive qualified PI cases',
                'Review AI-powered case intelligence',
                'Plaintiffs choose their preferred attorneys',
                'Import and manage existing firm cases',
                'Increase retained cases and improve intake ROI',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                  {item}
                </div>
              ))}
            </div>
            <Link
              to="/attorney-register"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Join Attorney Network
            </Link>
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-white/10 bg-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">How It Works</p>
              <h2 className="mt-2 text-3xl font-extrabold text-white">From plaintiff case to attorney workflow</h2>
            </div>
            <Link to="/attorney-register" className="text-sm font-semibold text-brand-200 hover:text-white">
              Join Attorney Network -&gt;
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {howItWorks.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-50">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Why ClearCaseIQ Is Different</p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-2 bg-slate-950 text-sm font-semibold text-white">
                <div className="px-4 py-3">Traditional Lead Vendor</div>
                <div className="px-4 py-3">ClearCaseIQ</div>
              </div>
              {differentiators.map((row) => (
                <div key={row.traditional} className="grid grid-cols-2 border-t border-slate-200 text-sm">
                  <div className="px-4 py-3 text-slate-500">{row.traditional}</div>
                  <div className="bg-brand-50 px-4 py-3 font-semibold text-brand-900">{row.clearcase}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">Ideal For</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">PI attorneys and firms that want better intake ROI</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {idealFor.map((type) => (
                <div key={type} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-slate-50">
                  {type}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {proofPoints.map((point) => (
            <div key={point.title} className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-lg font-bold text-white">{point.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-200">{point.detail}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 rounded-3xl border border-brand-300/30 bg-brand-500 p-8 text-center shadow-2xl shadow-brand-950/30">
          <h2 className="text-3xl font-extrabold text-white">Ready to Review Qualified Injury Cases?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-brand-50">
            Receive cases, review AI case intelligence, and manage retained clients in one platform.
          </p>
          <Link
            to="/attorney-register"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-semibold text-brand-900 hover:bg-brand-50"
          >
            Join Attorney Network
          </Link>
        </section>
      </main>
    </div>
  )
}
