import { Link, Navigate, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { caseTypeAssessmentHref, caseTypeHubBySlug, caseTypeHubs } from '../data/caseTypeHubDefs'
import { CASE_TYPE_HUB_DISCLAIMER, caseTypeHubContent } from '../data/caseTypeHubs'
import { allLandingPages } from '../data/seoLandingPages'

/**
 * A case-type hub: `/car-accident`, `/slip-and-fall`, and the other four.
 *
 * The page every article in the case type links up to, and the one that hands a
 * reader down to the article answering their narrower question. Rendered on the
 * server; the metadata and structured data come from `[[...slug]].tsx`.
 */
export default function CaseTypeHub() {
  const location = useLocation()
  const path = location.pathname.replace(/\/+$/, '') || '/'
  const hub = caseTypeHubBySlug.get(path)
  if (!hub) return <Navigate to="/" replace />

  const content = caseTypeHubContent[hub.caseType]
  const assessHref = caseTypeAssessmentHref(hub.caseType)
  const cityPages = allLandingPages
    .filter((page) => page.caseType === hub.caseType && page.caseSection === 'local' && !page.noindex)
    .sort((a, b) => a.title.localeCompare(b.title))
  const otherHubs = caseTypeHubs.filter((other) => other.slug !== hub.slug)

  return (
    <div className="mx-auto max-w-5xl py-8">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <li>
            <Link to="/" className="hover:text-slate-900">
              Home
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
            <span className="font-medium text-slate-900" aria-current="page">
              {hub.label}
            </span>
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{content.eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{hub.title}</h1>
        {content.intro.map((paragraph) => (
          <p key={paragraph} className="mt-3 text-base leading-7 text-slate-700">
            {paragraph}
          </p>
        ))}
        <Link
          to={assessHref}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
        >
          Assess My Case
          <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Link>
      </header>

      <nav aria-label="On this page" className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">On this page</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {content.sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="font-medium text-brand-700 hover:text-brand-800">
                {section.heading}
              </a>
            </li>
          ))}
          {cityPages.length > 0 && (
            <li>
              <a href="#near-you" className="font-medium text-brand-700 hover:text-brand-800">
                Near you
              </a>
            </li>
          )}
        </ul>
      </nav>

      <div className="mt-10 space-y-10">
        {content.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                {paragraph}
              </p>
            ))}
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
                  >
                    {link.anchor}
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {cityPages.length > 0 && (
          <section id="near-you" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{hub.label} near you</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
              Local guides cover the courts, roads and agencies that matter in each city, alongside the statewide rules above.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cityPages.map((page) => (
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
        )}
      </div>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">Common questions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {content.faqs.map((faq) => (
            <div key={faq.q} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">{faq.q}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl bg-slate-950 p-6 text-white shadow-card sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-tight">Want to understand your situation?</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Answer a few questions about what happened and get a free preliminary assessment with clear next steps.
            </p>
          </div>
          <Link
            to={assessHref}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
          >
            Assess My Case
          </Link>
        </div>
      </section>

      <p className="mt-6 text-xs leading-5 text-slate-500">{CASE_TYPE_HUB_DISCLAIMER}</p>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">Other case guides</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {otherHubs.map((other) => (
            <Link
              key={other.slug}
              to={other.slug}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
            >
              {other.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
