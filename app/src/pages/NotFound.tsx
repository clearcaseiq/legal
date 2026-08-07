import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * Rendered for URLs that match no route. The server sends a 404 status with
 * this page so both crawlers and people get a straight answer instead of a
 * blank screen.
 */
export default function NotFound() {
  const { t } = useLanguage()

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
        {t('notFound.code')}
      </p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{t('notFound.title')}</h1>
      <p className="mt-4 text-base text-slate-600">{t('notFound.body')}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/assess"
          className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {t('notFound.startAssessment')}
        </Link>
        <Link
          to="/"
          className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {t('notFound.home')}
        </Link>
      </div>
    </div>
  )
}
