import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { landingPagesEsByCategory } from '../data/seoLandingPagesEs'

/**
 * The hub for the Spanish landing pages.
 *
 * Its job is discoverability. The shared footer links here — `/topics` resolves
 * to `/es/temas` for a Spanish reader — so this is the one crawlable route into
 * the Spanish topic set. Without it those pages would be reachable from the
 * sitemap alone, which is exactly how the English landing pages spent months
 * orphaned.
 */
export default function TopicsEs() {
  const groups = landingPagesEsByCategory()
  const total = groups.reduce((count, group) => count + group.pages.length, 0)

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <nav aria-label="Ruta de navegación" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <li>
            <Link to="/es" className="hover:text-slate-900">
              Inicio
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
            <span className="font-medium text-slate-900" aria-current="page">
              Temas
            </span>
          </li>
        </ol>
      </nav>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Biblioteca de temas</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Guías en español sobre reclamos por lesiones en California
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
          {total} guías escritas en español sobre el valor de un reclamo, los plazos legales, la documentación médica y
          los derechos que la ley de California reconoce a cualquier persona lesionada. Contenido informativo:
          ClearCaseIQ no es un bufete de abogados.
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{group.label}</h2>
            <ul className="mt-4 space-y-3">
              {group.pages.map((page) => (
                <li key={page.slug}>
                  <Link
                    to={page.slug}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-200"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{page.eyebrow}</p>
                    <p className="mt-1.5 text-base font-semibold text-slate-950">{page.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">{page.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-slate-600">
        ¿Prefiere leer en inglés?{' '}
        <Link to="/topics" hrefLang="en" className="font-semibold text-brand-700 hover:underline">
          Topic library
        </Link>
      </p>
    </main>
  )
}
