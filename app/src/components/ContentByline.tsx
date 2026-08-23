import { Link } from 'react-router-dom'
import { BadgeCheck, CalendarDays, Info } from 'lucide-react'
import { reviewerFor } from '../data/contentReviewers'
import { formatContentDate } from '../data/seoLandingPageSchema'

/**
 * Authorship, dates, and review status for an educational page.
 *
 * The structured data already carried an author and dates that a reader could
 * not see, which is the weaker half of the signal: for guidance about an injury
 * claim, who wrote this and when it was last checked are things the person
 * reading it deserves on the page.
 *
 * Review status is stated either way. When nobody has reviewed a page, saying so
 * is the honest option and it lets the reader weigh the content accordingly —
 * which is more useful to them, and safer for us, than silence that implies
 * review happened.
 */
/**
 * Branching on locale rather than going through `t()`, because the Spanish
 * landing pages are written, not translated at runtime: their template holds
 * Spanish literals throughout, and a dictionary lookup here would be the only
 * thing on those pages that could silently fall back to English.
 */
const COPY = {
  en: {
    by: 'By',
    updated: 'Updated',
    published: 'Published',
    originally: 'Originally published',
    reviewedBy: 'Reviewed by',
    standardsLink: 'How we write this',
    unreviewed:
      'Educational content, not reviewed by an attorney for your situation and not legal advice. ClearCaseIQ is not a law firm.',
  },
  es: {
    by: 'Por',
    updated: 'Actualizado el',
    published: 'Publicado el',
    originally: 'Publicado originalmente el',
    reviewedBy: 'Revisado por',
    standardsLink: 'Cómo redactamos este contenido',
    unreviewed:
      'Contenido informativo. No ha sido revisado por un abogado para su situación y no constituye asesoría legal. ClearCaseIQ no es un bufete de abogados.',
  },
  zh: {
    by: '作者',
    updated: '更新于',
    published: '发布于',
    originally: '最初发布于',
    reviewedBy: '审核人',
    standardsLink: '我们如何撰写此内容',
    unreviewed:
      '仅供参考的资讯内容，未经律师针对您的具体情况审核，不构成法律建议。ClearCaseIQ 并非律师事务所。',
  },
} as const

export default function ContentByline({
  published,
  updated,
  reviewedBy,
  locale = 'en',
  standardsTo = '/editorial-standards',
  className = '',
}: {
  published: string
  updated: string
  reviewedBy?: string
  /** Language of the page this byline sits on. */
  locale?: 'en' | 'es' | 'zh'
  /** Where "how we write this" points, so a translated page can link its own. */
  standardsTo?: string
  className?: string
}) {
  const reviewer = reviewerFor(reviewedBy)
  const wasRevised = published !== updated
  const copy = COPY[locale]

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/40 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-600 dark:text-slate-300">
        <span>
          {copy.by}{' '}
          <Link to={standardsTo} className="font-semibold text-slate-900 hover:underline dark:text-slate-100">
            ClearCaseIQ
          </Link>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          <span>
            {wasRevised ? copy.updated : copy.published}{' '}
            <time dateTime={updated}>{formatContentDate(updated, locale)}</time>
          </span>
        </span>
        {wasRevised && (
          <span className="text-slate-500 dark:text-slate-400">
            {copy.originally} <time dateTime={published}>{formatContentDate(published, locale)}</time>
          </span>
        )}
      </div>

      {reviewer ? (
        <p className="mt-2 flex items-start gap-1.5 text-slate-700 dark:text-slate-200">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>
            {copy.reviewedBy}{' '}
            {reviewer.profileUrl ? (
              // A reviewer's profile may live off-site, which react-router's Link
              // cannot handle.
              /^https?:\/\//.test(reviewer.profileUrl) ? (
                <a
                  href={reviewer.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold hover:underline"
                >
                  {reviewer.name}, {reviewer.credentials}
                </a>
              ) : (
                <Link to={reviewer.profileUrl} className="font-semibold hover:underline">
                  {reviewer.name}, {reviewer.credentials}
                </Link>
              )
            ) : (
              <span className="font-semibold">
                {reviewer.name}, {reviewer.credentials}
              </span>
            )}
            {' — '}
            {reviewer.bio}
          </span>
        </p>
      ) : (
        <p className="mt-2 flex items-start gap-1.5 text-slate-500 dark:text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {copy.unreviewed}{' '}
            <Link to={standardsTo} className="font-medium underline">
              {copy.standardsLink}
            </Link>
          </span>
        </p>
      )}
    </div>
  )
}
