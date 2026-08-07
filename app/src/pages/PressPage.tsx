import { Link } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import SeoCiteEmbed from '../components/SeoCiteEmbed'

const BOILERPLATE =
  'ClearCaseIQ is a California legal technology company that helps injury victims understand their case in plain English, organize medical records, and — only with consent — share a documented file with participating personal injury attorneys. ClearCaseIQ Corp. is not a law firm and does not provide legal advice.'

const QUOTABLE = [
  {
    quote:
      'Too many families face injury, paperwork, and insurance pressure at once — without a clear picture of their options.',
    attribution: 'Sri Reddy, Founder, ClearCaseIQ',
  },
  {
    quote:
      'We built ClearCaseIQ so people can understand a claim before they talk to a lawyer, and so attorneys receive plaintiff-chosen, documented matters — not thin leads.',
    attribution: 'Sri Reddy, Founder, ClearCaseIQ',
  },
]

export default function PressPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 py-8">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Media & partners</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          Press kit
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Brand assets, boilerplate, and founder quotes for journalists covering injury claims, legal tech, and California
          consumer tools.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Company</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Legal name</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">ClearCaseIQ Corp.</dd>
          </div>
          <div>
            <dt className="text-slate-500">Category</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">Legal technology · not a law firm</dd>
          </div>
          <div>
            <dt className="text-slate-500">Headquarters</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">Los Angeles, California</dd>
          </div>
          <div>
            <dt className="text-slate-500">Website</dt>
            <dd>
              <a href="https://www.clearcaseiq.com" className="font-medium text-brand-700 hover:text-brand-800">
                www.clearcaseiq.com
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Media contact</dt>
            <dd>
              <a href="mailto:partnerships@clearcaseiq.com" className="font-medium text-brand-700 hover:text-brand-800">
                partnerships@clearcaseiq.com
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Founder</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">Sri Reddy</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Boilerplate</h2>
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          {BOILERPLATE}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Brand assets</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Primary logo</p>
            <BrandLogo mode="header" size="md" appName="ClearCaseIQ" />
            <a
              href="/clearcaseiq-logo.png"
              download
              className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Download PNG
            </a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">On dark</p>
            <BrandLogo mode="footer" size="md" appName="ClearCaseIQ" />
            <a
              href="/clearcaseiq-logo-transparent.png"
              download
              className="mt-4 inline-block text-sm font-semibold text-brand-300 hover:text-brand-200"
            >
              Download transparent PNG
            </a>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Social / OG card:{' '}
          <a href="/clearcaseiq-og-card.png" download className="font-semibold text-brand-700 hover:text-brand-800">
            clearcaseiq-og-card.png
          </a>{' '}
          (1200×630)
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Quotable lines</h2>
        {QUOTABLE.map((item) => (
          <blockquote
            key={item.quote}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p className="text-base leading-relaxed text-slate-800 dark:text-slate-100">“{item.quote}”</p>
            <footer className="mt-2 text-sm text-slate-500">— {item.attribution}</footer>
          </blockquote>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Linkable tools for stories</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link to="/tools/california-sol-checker" className="font-semibold text-brand-700 hover:text-brand-800">
              California SOL checker
            </Link>
            <span className="text-slate-600 dark:text-slate-300"> — educational deadline estimates</span>
          </li>
          <li>
            <Link to="/tools/medical-records-checklist" className="font-semibold text-brand-700 hover:text-brand-800">
              Medical records checklist
            </Link>
            <span className="text-slate-600 dark:text-slate-300"> — printable document readiness list</span>
          </li>
          <li>
            <Link to="/insights" className="font-semibold text-brand-700 hover:text-brand-800">
              Insights
            </Link>
            <span className="text-slate-600 dark:text-slate-300"> — early case-readiness themes</span>
          </li>
          <li>
            <Link to="/about" className="font-semibold text-brand-700 hover:text-brand-800">
              About
            </Link>
            <span className="text-slate-600 dark:text-slate-300"> — founder story and company identity</span>
          </li>
        </ul>
      </section>

      <SeoCiteEmbed title="ClearCaseIQ Press Kit" path="/press" embedToolPath="/tools/california-sol-checker" />
    </div>
  )
}
