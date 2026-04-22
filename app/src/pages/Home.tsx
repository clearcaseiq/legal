import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import HomeProductPreview from '../components/HomeProductPreview'
import MarketingHeroArt from '../components/MarketingHeroArt'
import {
  FileTextIcon,
  ShieldIcon,
  BarChart3Icon,
  UsersIcon,
  CheckCircleIcon,
  StarIcon,
  QuoteIcon,
} from '../components/StartupIcons'

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

  useEffect(() => {
    if (hash === '#how-it-works') {
      const el = document.getElementById('how-it-works')
      el?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash])

  return (
    <div className="space-y-0">
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
              <Link
                to="/assessment/start"
                className="inline-flex items-center justify-center px-10 py-4 text-lg font-semibold text-white bg-accent-600 rounded-xl hover:bg-accent-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                <FileTextIcon className="h-6 w-6 mr-2" aria-hidden />
                {t('common.startAssessment')}
              </Link>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('common.heroFooter')}</p>
            </div>

            <div className="order-1 lg:order-2">
              <HomeProductPreview />
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

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[1, 2, 3].map((n) => (
              <figure
                key={n}
                className="relative rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-5 hover:shadow-md transition-shadow duration-200"
              >
                <QuoteIcon className="h-8 w-8 text-brand-200 dark:text-brand-800 mb-2" aria-hidden />
                <div className="flex gap-0.5 mb-3" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4 text-accent-500" aria-hidden />
                  ))}
                </div>
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
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50 text-center mb-2">
            {t('home.reportIncludes')}
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 text-sm mb-6">{t('home.reportIncludesDesc')}</p>
          <div className="max-w-xl mx-auto grid sm:grid-cols-2 gap-4">
            {['reportItem1', 'reportItem2', 'reportItem3', 'reportItem4', 'reportItem5'].map((key) => (
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
        </section>
      </div>
  )
}
