import { Link } from 'react-router-dom'
import { CheckCircle, ClipboardList, BarChart3, Users, Car, Scale, Handshake, Trophy, UserCheck, ArrowRight } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import LocaleLink from '../components/LocaleLink'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'
import FaqSection from '../components/FaqSection'

// The claimant journey, rendered as an animated timeline further down the page.
// The claimant chooses which attorneys receive the case (jSelect) before any
// attorney review — the platform never routes without the consumer's choice.
const JOURNEY = [
  { key: 'j1', Icon: Car },
  { key: 'j2', Icon: ClipboardList },
  { key: 'jSelect', Icon: UserCheck },
  { key: 'j3', Icon: Scale },
  { key: 'j4', Icon: Handshake },
  { key: 'j5', Icon: Trophy },
]

const STEP_ICONS = [ClipboardList, BarChart3, Users]

export default function HowItWorks() {
  const { t } = useLanguage()
  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Headline + intro */}
      <h1 className="text-3xl font-bold text-slate-900 text-center mb-4">{t('hiw.title')}</h1>
      <p className="text-slate-600 text-center mb-12">
        {t('hiw.intro')}
      </p>

      {/* Steps */}
      <div className="relative grid md:grid-cols-3 gap-6 mb-12">
        {/* Connecting line behind the icon badges on desktop. */}
        <div
          className="pointer-events-none absolute inset-x-[16%] top-14 hidden h-0.5 bg-gradient-to-r from-brand-200 via-brand-300 to-emerald-200 md:block"
          aria-hidden
        />
        {[1, 2, 3].map((n, i) => {
          const StepIcon = STEP_ICONS[i]
          return (
            <div
              key={n}
              className="hiw-reveal relative rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-4 ring-white">
                <StepIcon className="h-7 w-7" aria-hidden />
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-sm">{n}</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{t(`hiw.step${n}Title`)}</h2>
              <p className="text-slate-600 text-sm">{t(`hiw.step${n}Body`)}</p>
            </div>
          )
        })}
      </div>

      {/* Journey timeline — animated stepper */}
      <div className="mb-12 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-brand-50/40 p-6 sm:p-8">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{t('hiw.journeyLabel')}</p>
        <div className="relative">
          {/* Track: a full-width base line with an animated gradient line drawn over it (desktop only). */}
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-6 hidden h-0.5 bg-slate-200 sm:block" aria-hidden />
          <div className="hiw-line-grow pointer-events-none absolute left-[10%] right-[10%] top-6 hidden h-0.5 bg-gradient-to-r from-brand-500 to-emerald-500 sm:block" aria-hidden />
          <ol className="relative grid grid-cols-2 gap-y-6 sm:grid-cols-6">
            {JOURNEY.map((stage, i) => (
              <li
                key={stage.key}
                className="hiw-reveal flex flex-col items-center text-center"
                style={{ animationDelay: `${350 + i * 140}ms` }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md ring-1 ring-brand-500/20">
                  <stage.Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-2 text-xs font-semibold text-slate-700 sm:text-sm">{t(`hiw.${stage.key}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">{t('hiw.nextTitle')}</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand-100 text-brand-600 font-bold text-sm flex-shrink-0">{n}</span>
              <div>
                <h3 className="font-semibold text-slate-900">{t(`hiw.next${n}Title`)}</h3>
                <p className="text-slate-600 text-sm">{t(`hiw.next${n}Desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example Case Insights */}
      <div className="mb-12 p-6 bg-white border border-slate-200 rounded-xl">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">{t('hiw.exampleTitle')}</h2>
        <p className="text-center text-slate-600 text-sm mb-6">{t('hiw.exampleDesc')}</p>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-500 mb-1">{t('hiw.exValueLabel')}</p>
            <p className="text-xl font-bold text-slate-900">$3,000 – $22,000</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-500 mb-1">{t('hiw.exReadinessLabel')}</p>
            <p className="text-xl font-bold text-slate-900">{t('hiw.exReadinessValue')}</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-500 mb-1">{t('hiw.exTimelineLabel')}</p>
            <p className="text-xl font-bold text-slate-900">{t('hiw.exTimelineValue')}</p>
          </div>
        </div>
      </div>

      {/* Trust signals */}
      <div className="mb-12">
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <span className="text-slate-700 font-medium">{t(`hiw.trust${n}`)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <FaqSection
        className="mb-12"
        title={t('hiw.faqTitle')}
        items={[1, 2, 3].map((n) => ({ q: t(`hiw.q${n}`), a: t(`hiw.a${n}`) }))}
      />

      {/* Explore topics — contextual links into the injury claim knowledge base */}
      <div className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('hiw.exploreTitle')}</h2>
        <p className="text-slate-600 text-sm mb-4">{t('hiw.exploreDesc')}</p>
        <LocaleLink
          to="/topics"
          className="inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          {t('hiw.exploreLink')}
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
        </LocaleLink>
      </div>

      {/* CTAs */}
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('hiw.ctaTitle')}</h2>
          <Link
            to={START_ASSESSMENT_HREF}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
          >
            {t('hiw.ctaButton')}
          </Link>
        </div>
      </div>
    </div>
  )
}
