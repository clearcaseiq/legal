import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, ChevronDown, ChevronRight, FileText, Upload, Users, BarChart3, Shield } from 'lucide-react'
import SupportRequestForm from '../components/SupportRequestForm'
import FaqSection from '../components/FaqSection'
import { useLanguage } from '../contexts/LanguageContext'
import { useBrowserStateReady } from '../contexts/ServerRenderContext'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'

// Stable slugs so /help#attorney-matching style deep links keep working in
// every language. Each category has 2 articles keyed off its prefix.
const CATEGORY_DEFS = [
  { slug: 'getting-started', prefix: 'c1' },
  { slug: 'your-case-assessment', prefix: 'c2' },
  { slug: 'uploading-evidence', prefix: 'c3' },
  { slug: 'attorney-matching', prefix: 'c4' },
  { slug: 'case-value-estimates', prefix: 'c5' },
  { slug: 'privacy-&-security', prefix: 'c6' },
  { slug: 'contact-support', prefix: 'c7' },
]

export default function Help() {
  const { t, language } = useLanguage()
  const location = useLocation()
  const { hash } = location
  // This route is server-rendered, so the stored role is only readable once the
  // client has hydrated. Until then treat the visitor as a plaintiff, which is
  // what an anonymous crawler or first-time reader actually is.
  const browserStateReady = useBrowserStateReady()
  const isAdminArea =
    location.pathname.startsWith('/admin') ||
    (browserStateReady && localStorage.getItem('auth_role') === 'admin')
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null)

  const categories = useMemo(
    () =>
      CATEGORY_DEFS.map(({ slug, prefix }) => ({
        slug,
        title: t(`helpPage.${prefix}Title`),
        description: t(`helpPage.${prefix}Desc`),
        articles: [1, 2].map((n) => ({
          title: t(`helpPage.${prefix}a${n}Q`),
          content: t(`helpPage.${prefix}a${n}A`),
        })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  )

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1)
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        const idx = categories.findIndex((c) => c.slug === id)
        if (idx >= 0) setExpandedCategory(idx)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash])

  const searchLower = search.toLowerCase()
  const filteredCategories = categories.filter(
    (c) =>
      searchLower === '' ||
      c.title.toLowerCase().includes(searchLower) ||
      c.articles.some((a) => a.title.toLowerCase().includes(searchLower) || a.content.toLowerCase().includes(searchLower))
  )

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('helpPage.title')}</h1>
      <p className="text-slate-600 mb-6">{t('helpPage.subtitle')}</p>

      {/* Search bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder={t('helpPage.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>

      {/* Quick links — hide plaintiff-specific actions when an admin is browsing. */}
      {!isAdminArea && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          to={START_ASSESSMENT_HREF}
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <FileText className="h-6 w-6 text-brand-600 flex-shrink-0" />
          <span className="font-medium text-slate-900">{t('helpPage.quickStart')}</span>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
        <Link
          to="/dashboard"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <Upload className="h-6 w-6 text-brand-600 flex-shrink-0" />
          <span className="font-medium text-slate-900">{t('helpPage.quickUpload')}</span>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
        <Link
          to="/attorneys-enhanced"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <Users className="h-6 w-6 text-brand-600 flex-shrink-0" />
          <span className="font-medium text-slate-900">{t('helpPage.quickSubmit')}</span>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
        <Link
          to="/dashboard"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <BarChart3 className="h-6 w-6 text-brand-600 flex-shrink-0" />
          <span className="font-medium text-slate-900">{t('helpPage.quickReport')}</span>
          <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
        </Link>
      </div>
      )}

      {/* Category cards */}
      <div className="space-y-4 mb-8">
        {filteredCategories.map((cat, idx) => (
          <div
            key={cat.slug}
            id={cat.slug}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-24"
          >
            <button
              onClick={() => setExpandedCategory(expandedCategory === idx ? null : idx)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{cat.title}</h2>
                <p className="text-sm text-slate-600 mt-0.5">{cat.description}</p>
              </div>
              {expandedCategory === idx ? (
                <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
              )}
            </button>
            {expandedCategory === idx && (
              <div className="border-t border-slate-200 p-4 bg-slate-50/50 space-y-4">
                {cat.articles.map((art, i) => (
                  <div key={i}>
                    <h3 className="font-medium text-slate-900 mb-1">{art.title}</h3>
                    <p className="text-sm text-slate-600">{art.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <p className="text-slate-600 mb-8">{t('helpPage.noResults')}</p>
      )}

      {/* Help guides */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('helpPage.guidesTitle')}</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-4 bg-white border border-slate-200 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-2">{t(`helpPage.guide${n}Title`)}</h3>
              <p className="text-sm text-slate-600">{t(`helpPage.guide${n}Body`)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <FaqSection
        className="mb-8"
        title={t('helpPage.faqTitle')}
        items={[1, 2, 3, 4, 5].map((n) => ({ q: t(`helpPage.faq${n}Q`), a: t(`helpPage.faq${n}A`) }))}
      />

      {/* Trust statement */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-8">
        <p className="text-sm text-slate-600">
          <strong>{t('helpPage.trustBold')}</strong> {t('helpPage.trustRest')}
        </p>
      </div>

      {/* How we resolve issues — sets expectations for the support process so the
          footer "Support" link lands somewhere that explains how we help, not just a
          mailto. Deep-linkable via /help#how-we-resolve. */}
      <div id="how-we-resolve" className="mb-8 scroll-mt-24">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('helpPage.resolveTitle')}</h2>
        <p className="text-slate-600 mb-4">
          {t('helpPage.resolveIntro')}
        </p>
        <ol className="space-y-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{n}</span>
              <div>
                <h3 className="font-semibold text-slate-900">{t(`helpPage.r${n}Title`)}</h3>
                <p className="mt-0.5 text-sm text-slate-600">{t(`helpPage.r${n}Body`)}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <p className="text-sm text-slate-600">
            {t('helpPage.scopeNote')}
          </p>
        </div>
      </div>

      {/* Submit a support request — a real form the team can triage, instead of
          a bare mailto. Deep-linkable via /help#submit-request. */}
      <div id="submit-request" className="mb-8 scroll-mt-24">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">{t('helpPage.contactTitle')}</h2>
        <p className="text-slate-600 mb-4">
          {t('helpPage.contactIntro')}{' '}
          {t('helpPage.preferEmailPre')}{' '}
          <a href="mailto:support@clearcaseiq.com" className="font-medium text-brand-600 hover:text-brand-700">support@clearcaseiq.com</a>.
        </p>
        <SupportRequestForm />
      </div>

      {/* Legal links */}
      <p className="text-sm text-slate-600">
        {t('helpPage.visitOur')} <Link to="/terms-of-service" className="text-brand-600 hover:text-brand-700">{t('legal.termsTitle')}</Link> {t('helpPage.and')}{' '}
        <Link to="/privacy-policy" className="text-brand-600 hover:text-brand-700">{t('legal.privacyTitle')}</Link>.
      </p>
    </div>
  )
}
