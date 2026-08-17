import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LocaleLink from '../components/LocaleLink'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * Public platform disclosures. Every section is reachable by anchor so the footer
 * and any in-flow link can point at the specific disclosure it relates to
 * (e.g. /disclosures#ai from an AI-generated result).
 */
export default function Disclosures() {
  const { t } = useLanguage()
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  const sections = [
    {
      id: 'about',
      title: t('disclosures.aboutTitle'),
      paragraphs: [t('disclosures.aboutBody')],
    },
    {
      id: 'attorney-network',
      title: t('disclosures.attorneyNetworkTitle'),
      paragraphs: [t('disclosures.attorneyNetworkBody'), t('disclosures.attorneyNetworkHow')],
    },
    {
      id: 'how-it-works',
      title: t('disclosures.howItWorksTitle'),
      paragraphs: [t('disclosures.howItWorksBody'), t('disclosures.howItWorksNoInfluence')],
    },
    {
      id: 'settlement-estimates',
      title: t('disclosures.settlementTitle'),
      paragraphs: [t('disclosures.settlementBody')],
    },
    {
      id: 'ai',
      title: t('disclosures.aiTitle'),
      paragraphs: [t('disclosures.aiBody')],
    },
    {
      id: 'california',
      title: t('disclosures.californiaTitle'),
      paragraphs: [
        t('disclosures.californiaBody'),
        t('disclosures.californiaOptOut'),
        t('disclosures.californiaHow'),
      ],
      // The CPRA opt-out has to be actionable from the surface that describes it,
      // not from a contact section further down the page.
      action: {
        href: 'mailto:legal@clearcaseiq.com?subject=California%20privacy%20request',
        label: t('footer.doNotSell'),
      },
    },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('footer.platformLabel')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t('disclosures.pageTitle')}
        </h1>
        <p className="text-slate-600 dark:text-slate-300">{t('disclosures.pageIntro')}</p>
      </header>

      <nav aria-label={t('disclosures.pageTitle')} className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{section.title}</h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {'action' in section && section.action && (
              <a
                href={section.action.href}
                className="mt-4 inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
              >
                {section.action.label}
              </a>
            )}
          </section>
        ))}
      </div>

      <section className="space-y-2 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          {t('disclosures.questionsTitle')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('disclosures.questionsBody')}{' '}
          <a
            href="mailto:legal@clearcaseiq.com?subject=Platform%20disclosures"
            className="font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300"
          >
            legal@clearcaseiq.com
          </a>
        </p>
        <p className="pt-2 text-sm text-slate-500 dark:text-slate-400">
          {t('footer.entityName')} · {t('footer.platformLabel')} · {t('footer.locationCity')}
        </p>
        <div className="flex flex-wrap gap-3 pt-1 text-sm">
          <LocaleLink to="/about" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            {t('footer.about')}
          </LocaleLink>
          <Link to="/terms-of-service" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            {t('footer.termsOfService')}
          </Link>
          <Link to="/privacy-policy" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            {t('footer.privacyPolicy')}
          </Link>
        </div>
      </section>
    </div>
  )
}
