import { Suspense, lazy, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import MarketingHeroArt from '../components/MarketingHeroArt'
import {
  FileTextIcon,
  ShieldIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  UsersIcon,
  CheckCircleIcon,
  QuoteIcon,
  StarIcon,
} from '../components/StartupIcons'

const HomeProductPreview = lazy(() => import('../components/HomeProductPreview'))

export default function Home() {
  const { t } = useLanguage()
  const { hash } = useLocation()

  const CASE_TYPES = [
    { key: 'caseType1', href: '/assessment/start' },
    { key: 'caseType2', href: '/assessment/start' },
    { key: 'caseType3', href: '/assessment/start' },
    { key: 'caseType4', href: '/assessment/start' },
    { key: 'caseType5', href: '/assessment/start' },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [1, 2, 3, 4].map((n) => ({
      '@type': 'Question',
      name: t(`home.faqQ${n}`),
      acceptedAnswer: { '@type': 'Answer', text: t(`home.faqA${n}`) },
    })),
  }

  useEffect(() => {
    if (hash === '#how-it-works') {
      const el = document.getElementById('how-it-works')
      el?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash])

  return (
    <div className="space-y-0 pb-20 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
        {/* Hero — split layout + product preview */}
        <section className="py-8 md:py-14 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="relative text-center lg:text-left order-2 lg:order-1">
              <MarketingHeroArt />
              <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-[3.25rem] leading-[1.1] mb-4 dark:text-slate-50">
                {t('home.heroTitle')}
              </h1>
              <p className="max-w-xl mx-auto lg:mx-0 text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-6">
                {t('home.heroSubtitle')}
              </p>
              <ul className="max-w-md mx-auto lg:mx-0 text-left text-slate-700 dark:text-slate-300 space-y-2.5 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" aria-hidden />
                  {t('home.heroItem1')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" aria-hidden />
                  {t('home.heroItem2')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" aria-hidden />
                  {t('home.heroItem3')}
                </li>
              </ul>
              <div className="flex flex-col items-center lg:items-start gap-3">
                <Link
                  to="/assessment/start"
                  className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-accent-600 via-orange-500 to-amber-500 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-accent-500/30 ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent-500/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:px-11 sm:py-5 sm:text-xl"
                >
                  <FileTextIcon className="mr-2 h-6 w-6 transition-transform group-hover:rotate-[-4deg] sm:h-7 sm:w-7" aria-hidden />
                  {t('common.startAssessment')}
                </Link>
                <Link
                  to="/assess?fresh=1"
                  className="group inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white/70 px-6 py-3 text-base font-semibold text-slate-700 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                >
                  {t('common.continueAsGuest')}
                  <span className="ml-1.5 transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
                </Link>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('home.heroReassurance')}</p>
            </div>

            <div className="order-1 lg:order-2">
              <Suspense
                fallback={
                  <div
                    className="aspect-[4/3] w-full animate-pulse rounded-2xl border border-slate-200/70 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/50"
                    aria-hidden
                  />
                }
              >
                <HomeProductPreview />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="py-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 px-6 md:px-10 shadow-sm">
          <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
            {t('home.trustBar')}
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mb-10">
            <div className="flex items-center gap-3">
              <BarChart3Icon className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="text-slate-800 dark:text-slate-100 font-medium">{t('home.trust1')}</span>
            </div>
            <div className="flex items-center gap-3">
              <UsersIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="text-slate-800 dark:text-slate-100 font-medium">{t('home.trust2')}</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="text-slate-800 dark:text-slate-100 font-medium">{t('home.trust3')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-800 dark:text-slate-100 font-medium tabular-nums">{t('home.trust4')}</span>
            </div>
          </div>

          {/* Security / privacy badge */}
          <div className="mx-auto mb-10 flex max-w-xl items-center justify-center gap-2.5 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-4 py-2 text-center text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheckIcon className="h-4 w-4 flex-shrink-0" aria-hidden />
            <span>{t('home.securityBadge')}</span>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[1, 2, 3].map((n) => (
              <figure
                key={n}
                className="relative rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-5 hover:shadow-md transition-shadow duration-200"
              >
                <div className="mb-2 flex items-center gap-0.5 text-amber-400" role="img" aria-label={t('home.ratingLabel')}>
                  {[0, 1, 2, 3, 4].map((s) => (
                    <StarIcon key={s} className="h-4 w-4" aria-hidden />
                  ))}
                </div>
                <QuoteIcon className="h-8 w-8 text-brand-200 dark:text-brand-800 mb-2" aria-hidden />
                <blockquote className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  “{t(`home.testimonial${n}Quote`)}”
                </blockquote>
                <figcaption className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  — {t(`home.testimonial${n}Attribution`)}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="py-10 scroll-mt-24">
          <p className="text-center text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-4">
            {t('home.howItWorksIntro')}
          </p>
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50 text-center mb-10">
            {t('home.howItWorksTitle')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="text-center rounded-2xl p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-card transition-all duration-200"
              >
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-display font-bold text-xl mb-4">
                  {n}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {t(`home.step${n}Title`)}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {n === 3 ? t('home.step3DescAlt') : t(`home.step${n}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-8 rounded-2xl border border-slate-200/60 dark:border-slate-800 px-6 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900/30 dark:to-slate-950/30">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50 text-center mb-6">
            {t('home.commonCaseTypes')}
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-slate-600 dark:text-slate-400">
            {t('home.commonCaseTypesDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {CASE_TYPES.map((type) => (
              <Link
                key={type.key}
                to={type.href}
                className="px-5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 hover:text-brand-800 dark:hover:text-brand-300 transition-all shadow-sm hover:shadow-md"
              >
                {t(`home.${type.key}`)}
              </Link>
            ))}
          </div>
        </section>

        <section className="py-8">
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50 text-center mb-2">
            {t('home.reportIncludes')}
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 text-sm mb-6">{t('home.reportIncludesDesc')}</p>
          <div className="max-w-xl mx-auto grid sm:grid-cols-2 gap-4">
            {['reportItem1', 'reportItem2', 'reportItem3', 'reportItem4', 'reportItem5', 'reportItem6'].map((key) => (
              <div key={key} className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" aria-hidden />
                <span className="text-slate-700 dark:text-slate-300">{t(`home.${key}`)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12 rounded-2xl border border-slate-200/60 dark:border-slate-800 px-6 bg-slate-50/90 dark:bg-slate-900/50">
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50 text-center mb-2">
            {t('home.whyUse')}
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 text-sm mb-6">{t('home.whyUseDesc')}</p>
          <ul className="max-w-2xl mx-auto space-y-4">
            {['whyUseItem1', 'whyUseItem2', 'whyUseItem3', 'whyUseItem4'].map((key) => (
              <li key={key} className="flex items-start gap-3">
                <CheckCircleIcon className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden />
                <span className="text-slate-700 dark:text-slate-300">{t(`home.${key}`)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              to="/assessment/start"
              className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-accent-600 via-orange-500 to-amber-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-accent-500/25 ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent-500/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:text-lg"
            >
              <FileTextIcon className="mr-2 h-5 w-5 transition-transform group-hover:rotate-[-4deg]" aria-hidden />
              {t('common.startAssessment')}
            </Link>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {t('home.finalCtaHelper')}
            </p>
          </div>
        </section>

        {/* Legal disclaimer + attorney advertising disclosure */}
        <section className="py-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('home.attorneyAdvertising')}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t('home.legalDisclaimer')}
            </p>
          </div>
        </section>

        {/* Sticky mobile CTA */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-900/95">
          <Link
            to="/assessment/start"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 via-orange-500 to-amber-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-accent-500/25"
          >
            <FileTextIcon className="h-5 w-5" aria-hidden />
            {t('common.startAssessment')}
          </Link>
          <p className="mt-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('home.stickyCtaHelper')}
          </p>
        </div>
      </div>
  )
}
