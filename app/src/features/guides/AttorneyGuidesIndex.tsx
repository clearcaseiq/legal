import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, Clock, PlayCircle, Search } from 'lucide-react'
import { attorneyGuides } from '../../data/attorneyGuides'
import {
  ATTORNEY_GUIDES_OVERVIEW_CAPTIONS_URL,
  ATTORNEY_GUIDES_OVERVIEW_POSTER_URL,
  ATTORNEY_GUIDES_OVERVIEW_VIDEO_URL,
  guideHref,
  type GuideMode,
} from './guideLinks'

/**
 * Hidden when the video cannot be played. `src` sits on the element rather than
 * in a `<source>` child because a failed source fires its error on the child,
 * not the video. With `preload="none"` nothing is fetched until play, so a HEAD
 * request also hides the card up front when the file is not deployed.
 */
function OverviewVideoCard() {
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    if (typeof fetch !== 'function') return
    let active = true
    fetch(ATTORNEY_GUIDES_OVERVIEW_VIDEO_URL, { method: 'HEAD' })
      .then((response) => {
        if (active && !response.ok) setAvailable(false)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  if (!available) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
        <video
          controls
          preload="none"
          poster={ATTORNEY_GUIDES_OVERVIEW_POSTER_URL}
          src={ATTORNEY_GUIDES_OVERVIEW_VIDEO_URL}
          onError={() => setAvailable(false)}
          className="aspect-video w-full bg-slate-900"
        >
          <track kind="captions" src={ATTORNEY_GUIDES_OVERVIEW_CAPTIONS_URL} srcLang="en" label="English" default />
        </video>
        <div className="flex flex-col justify-center gap-2 p-5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
            <PlayCircle className="h-4 w-4" aria-hidden />
            Watch the overview
          </p>
          <h2 className="text-lg font-semibold text-slate-900">A quick tour of the attorney workspace</h2>
          <p className="text-sm leading-6 text-slate-600">
            See how new matches, the case workspace, client messaging and billing fit together, then dive into the guide
            for the part you need.
          </p>
        </div>
      </div>
    </section>
  )
}

export default function AttorneyGuidesIndex({ mode }: { mode: GuideMode }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return attorneyGuides
    return attorneyGuides.filter((guide) =>
      `${guide.title} ${guide.summary}`.toLowerCase().includes(needle)
    )
  }, [query])

  const isApp = mode === 'app'

  return (
    <div className={isApp ? 'space-y-5' : 'mx-auto max-w-5xl space-y-6 py-8'}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          {isApp ? (
            <h1 className="text-xl font-bold text-slate-900">Guides</h1>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">For attorneys and firm staff</p>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Attorney guides
              </h1>
            </>
          )}
          <p className={isApp ? 'mt-1 text-sm text-slate-500' : 'mt-3 text-base leading-7 text-slate-700'}>
            Step-by-step help for every part of ClearCaseIQ, from setting up your account to settling a case and sending
            the invoice.
          </p>
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Filter guides</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter guides"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </header>

      {isApp && <OverviewVideoCard />}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No guides match “{query.trim()}”.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((guide) => (
            <li key={guide.slug}>
              <Link
                to={guideHref(mode, guide.slug)}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <BookOpen className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-base font-semibold text-slate-900 group-hover:text-brand-800">{guide.title}</span>
                </span>
                <span className="mt-3 flex-1 text-sm leading-6 text-slate-600">{guide.summary}</span>
                <span className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  {guide.readMinutes ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {guide.readMinutes} min read
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
                    Read guide
                    <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isApp && (
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-card sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-semibold tracking-tight">Not on ClearCaseIQ yet?</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Join the attorney network to receive pre-screened injury cases, or sign in to open these screens.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link
                to="/attorney-register"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
              >
                Join the network
              </Link>
              <Link
                to="/attorney-login"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Attorney sign in
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
