import { Link, Navigate, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import {
  TOPICS_INDEX_DESCRIPTION,
  TOPICS_INDEX_SLUG,
  TOPICS_INDEX_TITLE,
  pagesInHub,
  populatedTopicHubs,
  topicHubBySlug,
} from '../data/seoTopicHubs'

/**
 * Index and per-category hubs for the SEO landing pages.
 *
 * These exist to give the landing pages a route in: every page is listed here,
 * and the footer links the index, so navigation reaches all of them instead of
 * the 7 that a hardcoded related-links list happened to mention.
 */

function Breadcrumbs({ trail }: { trail: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        {trail.map((crumb, index) => (
          <li key={crumb.label} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />}
            {crumb.to ? (
              <Link to={crumb.to} className="hover:text-slate-900">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-900" aria-current="page">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function TopicCard({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <span className="text-base font-semibold text-slate-900 group-hover:text-brand-800">{title}</span>
      <span className="mt-2 text-sm leading-6 text-slate-600">{description}</span>
    </Link>
  )
}

export default function TopicHub() {
  const location = useLocation()
  const path = location.pathname.replace(/\/+$/, '') || '/'

  if (path === TOPICS_INDEX_SLUG) {
    return (
      <div className="mx-auto max-w-5xl py-8">
        <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Topics' }]} />
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Topic library</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">{TOPICS_INDEX_TITLE}</h1>
          <p className="mt-3 text-base leading-7 text-slate-700">{TOPICS_INDEX_DESCRIPTION}</p>
        </header>

        <div className="mt-8 space-y-10">
          {populatedTopicHubs.map((hub) => {
            const pages = pagesInHub(hub)
            return (
              <section key={hub.slug}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    <Link to={hub.slug} className="hover:text-brand-800">
                      {hub.title}
                    </Link>
                  </h2>
                  <Link to={hub.slug} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                    All {pages.length} topics
                    <ChevronRight className="ml-0.5 inline h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{hub.intro}</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {pages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        to={page.slug}
                        className="block rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  const hub = topicHubBySlug.get(path)
  if (!hub) return <Navigate to={TOPICS_INDEX_SLUG} replace />

  const pages = pagesInHub(hub)
  const otherHubs = populatedTopicHubs.filter((other) => other.slug !== hub.slug)

  return (
    <div className="mx-auto max-w-5xl py-8">
      <Breadcrumbs
        trail={[{ label: 'Home', to: '/' }, { label: 'Topics', to: TOPICS_INDEX_SLUG }, { label: hub.title }]}
      />
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{hub.eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950">{hub.title}</h1>
        <p className="mt-3 text-base leading-7 text-slate-700">{hub.intro}</p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {pages.map((page) => (
          <TopicCard key={page.slug} to={page.slug} title={page.title} description={page.description} />
        ))}
      </div>

      <section className="mt-12 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">Other topics</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {otherHubs.map((other) => (
            <Link
              key={other.slug}
              to={other.slug}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
            >
              {other.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
