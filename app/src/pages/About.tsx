import { Link, useLocation } from 'react-router-dom'
import LocaleLink from '../components/LocaleLink'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'
import { organizationSchema } from '../data/organizationSchema'
import { useEffect } from 'react'
import { Building2, FileCheck2, HeartHandshake, Scale, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * Substantive About page for YMYL / E-E-A-T signals: who operates the platform,
 * why it exists, how educational content is produced, and how to reach us.
 * Anchors match the in-page nav so footer and SEO links can deep-link.
 */
const SECTIONS = [
  { id: 'mission', titleKey: 'aboutPage.navMission' },
  { id: 'story', titleKey: 'aboutPage.navStory' },
  { id: 'what-we-do', titleKey: 'aboutPage.navWhat' },
  { id: 'people', titleKey: 'aboutPage.navPeople' },
  { id: 'editorial', titleKey: 'aboutPage.navEditorial' },
  { id: 'company', titleKey: 'aboutPage.navCompany' },
] as const

const PRINCIPLES = [
  { titleKey: 'aboutPage.principleClarityTitle', bodyKey: 'aboutPage.principleClarityBody', Icon: Scale },
  { titleKey: 'aboutPage.principleControlTitle', bodyKey: 'aboutPage.principleControlBody', Icon: HeartHandshake },
  { titleKey: 'aboutPage.principleHonestyTitle', bodyKey: 'aboutPage.principleHonestyBody', Icon: ShieldCheck },
  { titleKey: 'aboutPage.principleCareTitle', bodyKey: 'aboutPage.principleCareBody', Icon: FileCheck2 },
] as const

export default function About() {
  const { t } = useLanguage()
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  const aboutPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: t('aboutPage.pageTitle'),
    description: t('aboutPage.metaDescription'),
    url: 'https://www.clearcaseiq.com/about',
    isPartOf: {
      '@type': 'WebSite',
      name: 'ClearCaseIQ',
      url: 'https://www.clearcaseiq.com',
    },
    about: organizationSchema({ nested: true }),
    mainEntity: {
      '@type': 'Person',
      name: 'Sri Reddy',
      jobTitle: 'Founder',
      worksFor: {
        '@type': 'Organization',
        name: 'ClearCaseIQ Corp.',
      },
    },
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }}
      />

      <header className="space-y-3 text-center sm:text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('footer.platformLabel')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          {t('aboutPage.pageTitle')}
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
          {t('aboutPage.pageIntro')}
        </p>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {t('aboutPage.notLawFirm')}
        </p>
      </header>

      <nav aria-label={t('aboutPage.pageTitle')} className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
          >
            {t(section.titleKey)}
          </a>
        ))}
      </nav>

      <section id="mission" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {t('aboutPage.missionTitle')}
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          {t('aboutPage.missionBody')}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRINCIPLES.map(({ titleKey, bodyKey, Icon }) => (
            <div
              key={titleKey}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {t(titleKey)}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {t(bodyKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="story"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-brand-50/40 p-5 sm:p-7 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/80"
      >
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {t('aboutPage.storyTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          {t('aboutPage.storyBody1')}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          {t('aboutPage.storyBody2')}
        </p>
      </section>

      <section id="what-we-do" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {t('aboutPage.whatTitle')}
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          {t('aboutPage.whatIntro')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {t('aboutPage.forClaimantsTitle')}
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <li>{t('aboutPage.forClaimants1')}</li>
              <li>{t('aboutPage.forClaimants2')}</li>
              <li>{t('aboutPage.forClaimants3')}</li>
              <li>{t('aboutPage.forClaimants4')}</li>
            </ul>
            <LocaleLink
              to="/how-it-works"
              className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300"
            >
              {t('aboutPage.forClaimantsLink')}
            </LocaleLink>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {t('aboutPage.forAttorneysTitle')}
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <li>{t('aboutPage.forAttorneys1')}</li>
              <li>{t('aboutPage.forAttorneys2')}</li>
              <li>{t('aboutPage.forAttorneys3')}</li>
              <li>{t('aboutPage.forAttorneys4')}</li>
            </ul>
            <LocaleLink
              to="/attorney-network"
              className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300"
            >
              {t('aboutPage.forAttorneysLink')}
            </LocaleLink>
          </div>
        </div>
      </section>

      <section id="people" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {t('aboutPage.peopleTitle')}
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {t('aboutPage.peopleIntro')}
        </p>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {t('aboutPage.founderName')}
              </h3>
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                {t('aboutPage.founderRole')}
              </p>
            </div>
            <a
              href={`mailto:${t('aboutPage.founderEmail')}`}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {t('aboutPage.founderEmail')}
            </a>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t('aboutPage.founderBio')}
          </p>
        </article>
      </section>

      <section id="editorial" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {t('aboutPage.editorialTitle')}
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          {t('aboutPage.editorialIntro')}
        </p>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {t('aboutPage.editorialAuthorshipTitle')}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('aboutPage.editorialAuthorshipBody')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {t('aboutPage.editorialReviewTitle')}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('aboutPage.editorialReviewBody')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {t('aboutPage.editorialUpdatesTitle')}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('aboutPage.editorialUpdatesBody')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {t('aboutPage.editorialLimitsTitle')}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('aboutPage.editorialLimitsBody')}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('aboutPage.editorialUpdated')}
        </p>
      </section>

      <section id="company" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {t('aboutPage.companyTitle')}
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
              <Building2 className="h-5 w-5" aria-hidden />
            </div>
            <address className="not-italic">
              <p className="font-semibold text-slate-900 dark:text-slate-50">
                {t('footer.entityName')}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t('footer.platformLabel')}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t('footer.locationCity')}
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {t('aboutPage.companyServiceArea')}
              </p>
              <div className="mt-4 space-y-1 text-sm">
                <p>
                  <span className="text-slate-500">{t('footer.supportLabel')} </span>
                  <a
                    href={`mailto:${t('footer.supportEmail')}`}
                    className="font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300"
                  >
                    {t('footer.supportEmail')}
                  </a>
                </p>
                <p>
                  <span className="text-slate-500">{t('footer.businessLabel')} </span>
                  <a
                    href={`mailto:${t('footer.businessEmail')}`}
                    className="font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300"
                  >
                    {t('footer.businessEmail')}
                  </a>
                </p>
                <p>
                  <span className="text-slate-500">{t('aboutPage.legalLabel')} </span>
                  <a
                    href="mailto:legal@clearcaseiq.com"
                    className="font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300"
                  >
                    legal@clearcaseiq.com
                  </a>
                </p>
              </div>
            </address>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-8 text-center dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {t('aboutPage.ctaTitle')}
        </h2>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-300">
          {t('aboutPage.ctaBody')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to={START_ASSESSMENT_HREF}
            className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            {t('common.startAssessment')}
          </Link>
          <LocaleLink
            to="/contact"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('footer.contact')}
          </LocaleLink>
        </div>
        <div className="flex flex-wrap justify-center gap-4 pt-2 text-sm">
          <LocaleLink to="/disclosures" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            {t('footer.disclosures')}
          </LocaleLink>
          <Link to="/privacy-policy" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            {t('footer.privacyPolicy')}
          </Link>
          <Link to="/terms-of-service" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            {t('footer.termsOfService')}
          </Link>
        </div>
      </section>
    </div>
  )
}
