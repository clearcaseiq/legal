import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { outboundRel, usePageLinks } from '../lib/pageLinks'

/** Editor-managed links for a public page (Admin → Page links). Renders nothing when there are none. */
export default function PageFurtherReading({ path, className = '' }: { path: string; className?: string }) {
  const links = usePageLinks(path)
  if (links.length === 0) return null

  return (
    <section aria-labelledby="further-reading-heading" className={className}>
      <h2 id="further-reading-heading" className="text-xl font-semibold text-slate-900 dark:text-slate-50">
        Further reading
      </h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.id}>
            {link.kind === 'internal' ? (
              <Link
                to={link.url}
                className="block rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-700 hover:border-brand-300 hover:text-brand-800 dark:border-slate-700 dark:bg-slate-900 dark:text-brand-300"
              >
                {link.anchor}
              </Link>
            ) : (
              <a
                href={link.url}
                target="_blank"
                rel={outboundRel(link.rel)}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-brand-700 hover:border-brand-300 hover:text-brand-800 dark:border-slate-700 dark:bg-slate-900 dark:text-brand-300"
              >
                <span>{link.anchor}</span>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
