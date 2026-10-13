import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronRight, Clock, ExternalLink, Lightbulb, LogIn, Monitor } from 'lucide-react'
import { attorneyGuides, getAttorneyGuide, type AttorneyGuideSection } from '../../data/attorneyGuides'
import { guideHref, guidesIndexHref, sectionAnchor, type GuideMode } from './guideLinks'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Spelled out from parts so the server render and hydration agree exactly. */
function formatUpdated(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return `${MONTHS[month - 1]} ${day}, ${year}`
}

function ScreenLink({ link, mode }: { link: NonNullable<AttorneyGuideSection['appLink']>; mode: GuideMode }) {
  if (mode === 'app') {
    return (
      <Link
        to={link.to}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
      >
        <ExternalLink className="h-4 w-4" aria-hidden />
        Open this screen: {link.label}
      </Link>
    )
  }
  return (
    <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
      <Monitor className="h-4 w-4 text-slate-500" aria-hidden />
      <span>
        In the app: <span className="font-semibold text-slate-900">{link.label}</span>
      </span>
      <Link to="/attorney-login" className="font-semibold text-brand-700 hover:text-brand-800">
        Sign in to open it
      </Link>
    </p>
  )
}

export default function AttorneyGuideArticle({ mode, slug }: { mode: GuideMode; slug?: string }) {
  const params = useParams()
  const guide = getAttorneyGuide(slug ?? params.slug ?? '')
  if (!guide) return <Navigate to={guidesIndexHref(mode)} replace />

  const index = attorneyGuides.findIndex((entry) => entry.slug === guide.slug)
  const previous = index > 0 ? attorneyGuides[index - 1] : undefined
  const next = index < attorneyGuides.length - 1 ? attorneyGuides[index + 1] : undefined
  const isApp = mode === 'app'

  return (
    <article className={isApp ? 'mx-auto max-w-3xl space-y-6' : 'mx-auto max-w-3xl space-y-8 py-8'}>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          {!isApp && (
            <li className="flex items-center gap-1.5">
              <Link to="/" className="hover:text-slate-900">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <Link to={guidesIndexHref(mode)} className="hover:text-slate-900">
              {isApp ? 'Guides' : 'Attorney guides'}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
          </li>
          <li className="font-medium text-slate-900" aria-current="page">
            {guide.title}
          </li>
        </ol>
      </nav>

      <header>
        <h1
          className={
            isApp
              ? 'text-2xl font-bold text-slate-900'
              : 'font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl'
          }
        >
          {guide.title}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-700">{guide.summary}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {guide.readMinutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {guide.readMinutes} min read
            </span>
          ) : null}
          <span>Updated {formatUpdated(guide.updated)}</span>
        </p>
      </header>

      <nav aria-label="On this page" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">On this page</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {guide.sections.map((section) => (
            <li key={section.heading}>
              <a href={`#${sectionAnchor(section.heading)}`} className="font-medium text-brand-700 hover:text-brand-800">
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {guide.sections.map((section) => (
          <section key={section.heading} id={sectionAnchor(section.heading)} className="scroll-mt-24">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{section.heading}</h2>
            {section.body && <p className="mt-3 text-base leading-7 text-slate-700">{section.body}</p>}
            {section.steps && section.steps.length > 0 && (
              <ol className="mt-4 space-y-3">
                {section.steps.map((step, stepIndex) => (
                  <li key={step} className="flex gap-3 text-base leading-7 text-slate-700">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {stepIndex + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}
            {section.tips && section.tips.length > 0 && (
              <aside className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <Lightbulb className="h-4 w-4" aria-hidden />
                  {section.tips.length === 1 ? 'Tip' : 'Tips'}
                </p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-amber-950">
                  {section.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </aside>
            )}
            {section.appLink && <ScreenLink link={section.appLink} mode={mode} />}
          </section>
        ))}
      </div>

      {!isApp && (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            Already in the network? Sign in to follow along in your own workspace.
          </p>
          <Link
            to="/attorney-login"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Attorney sign in
          </Link>
        </section>
      )}

      <nav aria-label="More guides" className="grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
        {previous ? (
          <Link
            to={guideHref(mode, previous.slug)}
            className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:bg-brand-50"
          >
            <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Previous guide
            </span>
            <span className="mt-1 block text-sm font-semibold text-slate-900 group-hover:text-brand-800">
              {previous.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            to={guideHref(mode, next.slug)}
            className="group rounded-xl border border-slate-200 bg-white p-4 text-right transition hover:border-brand-200 hover:bg-brand-50"
          >
            <span className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Next guide
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="mt-1 block text-sm font-semibold text-slate-900 group-hover:text-brand-800">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  )
}
