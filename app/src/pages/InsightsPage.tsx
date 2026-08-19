import { Link } from 'react-router-dom'
import SeoCiteEmbed from '../components/SeoCiteEmbed'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'

const THEMES = [
  {
    title: 'Documentation gaps beat “average settlement” searches',
    body: 'People often arrive looking for a dollar figure. Case readiness usually hinges first on missing police reports, imaging reports, itemized bills, and wage proof — the inputs that make any range defensible.',
  },
  {
    title: 'Treatment continuity is a first-class signal',
    body: 'Gaps in care are common and sometimes explainable (referrals, insurance delays, work conflicts). Unexplained gaps are one of the fastest ways an adjuster challenges severity.',
  },
  {
    title: 'Public-entity clocks surprise claimants',
    body: 'California personal-injury filing windows are widely discussed as two years, but claims involving cities, transit agencies, or other public entities often require much earlier claim presentation. Educational tools that surface both clocks reduce avoidable deadline risk.',
  },
  {
    title: 'Consent-based matching changes attorney expectations',
    body: 'Firms evaluating ClearCaseIQ ask for pre-scored viability, liability, and document readiness — not another thin lead form. Plaintiff choice and flat platform fees are part of that trust story.',
  },
]

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 py-8">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Research notes</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          ClearCaseIQ Insights
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Early case-readiness themes from building California personal-injury assessment and attorney-matching tools.
        </p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Methodology note:</strong> This v1 page shares directional product insights, not a peer-reviewed study
          or statistically significant claim-outcome dataset. When we publish aggregate platform statistics, they will be
          labeled with sample size, time window, and limitations.
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Themes (August 2026)</h2>
        {THEMES.map((theme, index) => (
          <article
            key={theme.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Theme {index + 1}</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{theme.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{theme.body}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Tools referenced in these notes</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link to="/tools/california-sol-checker" className="font-semibold text-brand-700 hover:text-brand-800">
              California SOL checker
            </Link>
          </li>
          <li>
            <Link to="/tools/medical-records-checklist" className="font-semibold text-brand-700 hover:text-brand-800">
              Medical records checklist
            </Link>
          </li>
          <li>
            <Link to={START_ASSESSMENT_HREF} className="font-semibold text-brand-700 hover:text-brand-800">
              Free case assessment
            </Link>
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Media & research requests</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          For quotes, methodology briefings, or future data releases, email{' '}
          <a href="mailto:partnerships@clearcaseiq.com" className="font-semibold text-brand-700 hover:text-brand-800">
            partnerships@clearcaseiq.com
          </a>
          . See also the{' '}
          <Link to="/press" className="font-semibold text-brand-700 hover:text-brand-800">
            press kit
          </Link>
          .
        </p>
      </section>

      <SeoCiteEmbed title="ClearCaseIQ Insights" path="/insights" embedToolPath="/tools/california-sol-checker" />
    </div>
  )
}
