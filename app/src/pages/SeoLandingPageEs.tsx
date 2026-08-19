import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ChevronRight, ClipboardList, Search } from 'lucide-react'
import ContentByline from '../components/ContentByline'
import { NOT_A_LAW_FIRM, landingPagesEsBySlug, relatedPagesEs } from '../data/seoLandingPagesEs'
import { landingPageFirstPublished, landingPageLastModified } from '../data/seoLandingPageSchema'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'

/**
 * The Spanish landing pages.
 *
 * A separate template from `SeoLandingPage`, on purpose. That one assembles a
 * page at render time from `getDiagramCopy`, `buildPlaintiffGuidance`, and
 * `buildTopicDeepDive`, each of which composes English sentences, and every
 * content block it reads has an `|| englishDefault` behind it. Reusing it for
 * Spanish would mean either localizing three prose generators or shipping pages
 * that render English in the middle — and the second failure mode is invisible
 * in a screenshot.
 *
 * This template has nothing to fall back to. Every string is either a Spanish
 * literal here or a written field on the page, so a missing field renders
 * nothing rather than rendering English. `seoLandingPagesEs.test.ts` rejects
 * empty fields, so "renders nothing" stays hypothetical.
 */
export default function SeoLandingPageEs() {
  const location = useLocation()
  const page = landingPagesEsBySlug.get(location.pathname)

  if (!page) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold text-slate-950">Página no encontrada</h1>
        <p className="mt-3 text-slate-700">
          Esta página no existe.{' '}
          <Link to="/es/temas" className="font-medium text-brand-700 underline">
            Ver todos los temas
          </Link>
        </p>
      </main>
    )
  }

  const related = relatedPagesEs(page.slug, 4)

  return (
    <main className="mx-auto w-full max-w-4xl overflow-x-clip px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <nav aria-label="Ruta de navegación" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <li>
            <Link to="/es" className="hover:text-slate-900">
              Inicio
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
            <Link to="/es/temas" className="hover:text-slate-900">
              Temas
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
            <span className="font-medium text-slate-900" aria-current="page">
              {page.title}
            </span>
          </li>
        </ol>
      </nav>

      <header className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-card sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-800 opacity-80">{page.eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">{page.description}</p>

        <ContentByline
          className="mt-5 max-w-2xl bg-white/70"
          locale="es"
          standardsTo="/es/divulgaciones"
          published={landingPageFirstPublished(page)}
          updated={landingPageLastModified(page)}
          reviewedBy={page.reviewedBy}
        />

        <div className="mt-6">
          <Link
            to={START_ASSESSMENT_HREF}
            className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
          >
            {page.cta}
            <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </div>
      </header>

      <section className="mt-8">
        <p className="text-lg leading-8 text-slate-800">{page.intro}</p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">Por qué esto importa</h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">{page.sections.whyItMatters}</p>
      </section>

      {page.body.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{section.heading}</h2>
          <p className="mt-3 leading-7 text-slate-700">{section.body}</p>
          {section.bullets?.length ? (
            <ul className="mt-4 space-y-2">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2 text-sm leading-6 text-slate-700">
                  <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      {page.timeline ? (
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">{page.timeline.heading}</h2>
          {page.timeline.intro ? (
            <p className="mt-2 text-sm leading-7 text-slate-700">{page.timeline.intro}</p>
          ) : null}
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[130px_1fr] bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid-cols-[220px_1fr]">
              <div className="border-r border-slate-200 px-3 py-3 sm:px-4">{page.timeline.columns[0]}</div>
              <div className="px-3 py-3 sm:px-4">{page.timeline.columns[1]}</div>
            </div>
            {page.timeline.rows.map(([label, detail]) => (
              <div
                key={label}
                className="grid grid-cols-[130px_1fr] border-t border-slate-200 text-sm sm:grid-cols-[220px_1fr]"
              >
                <div className="border-r border-slate-200 px-3 py-3 font-semibold text-slate-900 sm:px-4">{label}</div>
                <div className="px-3 py-3 leading-6 text-slate-700 sm:px-4">{detail}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {page.checklist ? (
        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white p-2 text-brand-700 shadow-sm">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{page.checklist.heading}</h2>
              {page.checklist.intro ? (
                <p className="mt-2 text-sm leading-7 text-slate-700">{page.checklist.intro}</p>
              ) : null}
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {page.checklist.items.map((item) => (
              <li
                key={item}
                className="flex gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-700"
              >
                <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {page.warning ? (
        <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-amber-950">{page.warning.heading}</h2>
              <p className="mt-2 text-sm leading-7 text-amber-900">{page.warning.body}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">Qué conviene documentar</h2>
          <ul className="mt-3 space-y-2">
            {page.sections.whatToTrack.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-brand-950">Cómo ayuda ClearCaseIQ</h2>
          <p className="mt-3 text-sm leading-7 text-brand-900">{page.sections.howClearCaseHelps}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              to={START_ASSESSMENT_HREF}
              className="inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Comenzar una evaluación gratuita
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/es/como-funciona"
              className="inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Ver cómo funciona ClearCaseIQ
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Preguntas frecuentes</h2>
        <div className="mt-4 space-y-3">
          {page.faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm open:bg-slate-50"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
                {faq.q}
              </summary>
              <p className="mt-2 text-sm leading-7 text-slate-700">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-brand-700" aria-hidden />
          <h2 className="text-lg font-semibold text-slate-950">Temas relacionados</h2>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {related.map((sibling) => (
            <li key={sibling.slug}>
              <Link
                to={sibling.slug}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-200 hover:text-brand-800"
              >
                <span>{sibling.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">
          <Link to="/es/temas" className="font-semibold text-brand-700 hover:underline">
            Ver todos los temas en español
          </Link>
        </p>
      </section>

      <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
        {NOT_A_LAW_FIRM}
      </p>
    </main>
  )
}
