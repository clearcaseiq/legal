import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LocaleLink from '../components/LocaleLink'
import { BarChart3, ClipboardList, Users } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import MarketingHeroArt from '../components/MarketingHeroArt'
import FaqSection from '../components/FaqSection'
import {
  FileTextIcon,
  ShieldIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  UsersIcon,
  CheckCircleIcon,
} from '../components/StartupIcons'

// Icons for the three How-It-Works steps — mirrors the treatment on /how-it-works.
const STEP_ICONS = [ClipboardList, BarChart3, Users]

const HomeProductPreview = lazy(() => import('../components/HomeProductPreview'))

export default function Home() {
  const { t } = useLanguage()
  const { hash } = useLocation()

  // The sticky mobile CTA is redundant while the hero's own "Start" button is on
  // screen, so it only slides in once the hero CTA scrolls out of view.
  const heroCtaRef = useRef<HTMLAnchorElement>(null)
  const [heroCtaVisible, setHeroCtaVisible] = useState(true)
  useEffect(() => {
    const el = heroCtaRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setHeroCtaVisible(entry.isIntersecting),
      { rootMargin: '0px 0px -40% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
            <div className="relative text-center lg:text-left order-1">
              <MarketingHeroArt />
              <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-[3.25rem] leading-[1.1] mb-4 dark:text-slate-50">
                {t('home.heroTitlePre')}
                <span className="whitespace-nowrap bg-gradient-to-r from-accent-600 to-amber-500 bg-clip-text text-transparent">
                  {t('home.heroTitleHighlight')}
                </span>
                {t('home.heroTitlePost')}
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
                  ref={heroCtaRef}
                  to="/assessment/start"
                  className="btn-cta group px-8 py-4 text-lg shadow-xl shadow-accent-500/30 duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent-500/40 sm:px-11 sm:py-5 sm:text-xl"
                >
                  <FileTextIcon className="mr-2 h-6 w-6 transition-transform group-hover:rotate-[-4deg] sm:h-7 sm:w-7" aria-hidden />
                  {t('common.startAssessment')}
                </Link>
                <Link
                  to="/assess"
                  className="group inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-sm font-medium text-slate-500 underline-offset-4 transition-colors hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-brand-300 dark:focus-visible:ring-offset-slate-900"
                >
                  {t('common.alreadyStartedResume')}
                  <span className="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
                </Link>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('home.heroReassurance')}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-3.5 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                <ShieldCheckIcon className="h-4 w-4 flex-shrink-0" aria-hidden />
                <span>{t('home.securityBadge')}</span>
              </div>
            </div>

            <div className="order-2">
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
          {/* On phones the row wraps to one item per line; `justify-center` then
              centers each icon+label pair. Icons need `shrink-0` (a wrapping label
              like "Private, encrypted intake" was squeezing the icon and throwing
              the row out of alignment — CP-520). */}
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-8 md:gap-12 mb-8">
            <div className="flex items-center gap-3">
              <BarChart3Icon className="h-6 w-6 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="text-slate-800 dark:text-slate-100 font-medium">{t('home.trust1')}</span>
            </div>
            <div className="flex items-center gap-3">
              <UsersIcon className="h-6 w-6 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="text-slate-800 dark:text-slate-100 font-medium">{t('home.trust2')}</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldIcon className="h-6 w-6 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="text-slate-800 dark:text-slate-100 font-medium">{t('home.trust3')}</span>
            </div>
            <div className="flex items-center gap-3">
              <FileTextIcon className="h-6 w-6 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="text-slate-800 dark:text-slate-100 font-medium tabular-nums">{t('home.trust4')}</span>
            </div>
          </div>

          {/* Stats band — honest, verifiable claims about the product itself
              (replaces the former placeholder testimonials). */}
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {[1, 2, 3].map((n, i) => (
              <div
                key={n}
                className="hiw-reveal rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <p className="font-display text-3xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
                  {t(`home.stat${n}Value`)}
                </p>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{t(`home.stat${n}Label`)}</p>
              </div>
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
            {[1, 2, 3].map((n, i) => {
              const StepIcon = STEP_ICONS[i]
              return (
                <div
                  key={n}
                  className="hiw-reveal text-center rounded-2xl p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-card transition-all duration-200"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="relative inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 mb-4">
                    <StepIcon className="h-7 w-7" aria-hidden />
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-sm">
                      {n}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {t(`home.step${n}Title`)}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {n === 3 ? t('home.step3DescAlt') : t(`home.step${n}Desc`)}
                  </p>
                </div>
              )
            })}
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
        </section>

        {/* FAQ — visible counterpart to the FAQPage JSON-LD emitted above, so the
            page shows the same answers search engines are told about. */}
        <FaqSection
          className="py-10"
          title={t('home.faqTitle')}
          items={[1, 2, 3, 4].map((n) => ({ q: t(`home.faqQ${n}`), a: t(`home.faqA${n}`) }))}
        />

        {/* Final CTA banner — recaps the hero promises after objections are answered. */}
        <section className="py-6">
          <div className="rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 px-6 py-10 text-center text-white shadow-xl md:px-12">
            <h2 className="font-display text-3xl font-bold mb-4">{t('home.finalCtaTitle')}</h2>
            <ul className="mx-auto mb-7 flex max-w-2xl flex-col items-center justify-center gap-2 text-sm text-white/85 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
              {['heroItem1', 'heroItem2', 'heroItem3'].map((key) => (
                <li key={key} className="flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-emerald-300" aria-hidden />
                  {t(`home.${key}`)}
                </li>
              ))}
            </ul>
            <Link
              to="/assessment/start"
              className="group inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-accent-600 via-orange-500 to-amber-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-black/25 ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-300 sm:text-lg"
            >
              <FileTextIcon className="mr-2 h-5 w-5 transition-transform group-hover:rotate-[-4deg]" aria-hidden />
              {t('common.startAssessment')}
            </Link>
            <p className="mt-3 text-sm text-white/75">{t('home.finalCtaHelper')}</p>
            <p className="mx-auto mt-5 max-w-xl text-xs leading-relaxed text-white/60">{t('home.deadlineNote')}</p>
          </div>
        </section>

        {/* Platform identity + legal disclaimer. Leads with what ClearCaseIQ is —
            a technology company — rather than presenting the site as advertising
            for legal services. */}
        <section className="py-6">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('home.platformLabel')}
            </p>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
              {t('home.aboutTitle')}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('home.platformPositioning')}
            </p>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t('home.legalDisclaimer')}
            </p>
            <div className="flex flex-wrap gap-3">
              <LocaleLink
                to="/about"
                className="inline-block text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300"
              >
                {t('footer.about')}
              </LocaleLink>
              <LocaleLink
                to="/disclosures"
                className="inline-block text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300"
              >
                {t('home.viewDisclosures')}
              </LocaleLink>
            </div>
          </div>
        </section>

        {/* Sticky mobile CTA — hidden while the hero's own CTA is on screen to
            avoid showing two identical buttons at once. */}
        <div
          aria-hidden={heroCtaVisible}
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 md:hidden dark:border-slate-800 dark:bg-slate-900/95 ${
            heroCtaVisible ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
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
