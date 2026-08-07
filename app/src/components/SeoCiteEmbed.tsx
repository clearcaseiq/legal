import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { siteUrl } from '../data/seoLandingPageSchema'

type SeoCiteEmbedProps = {
  title: string
  path: string
  /** Optional tool URL to promote in the embed snippet. */
  embedToolPath?: string
  compact?: boolean
}

/**
 * Citation + optional iframe embed for educational SEO pages.
 * Copy actions are click-only so SSR markup stays hydration-safe.
 */
export default function SeoCiteEmbed({
  title,
  path,
  embedToolPath = '/tools/california-sol-checker',
  compact = false,
}: SeoCiteEmbedProps) {
  const [copied, setCopied] = useState<'cite' | 'embed' | null>(null)
  const canonical = `${siteUrl}${path === '/' ? '' : path}`
  const embedUrl = `${siteUrl}${embedToolPath}?embed=1`
  const citation = `${title}. ClearCaseIQ. ${canonical}`
  const embedCode = `<iframe src="${embedUrl}" title="ClearCaseIQ educational tool" width="100%" height="640" loading="lazy" style="border:1px solid #e2e8f0;border-radius:12px;" referrerpolicy="no-referrer-when-downgrade"></iframe>`

  const copy = async (kind: 'cite' | 'embed', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-4' : 'p-5 sm:p-6'} shadow-sm dark:border-slate-800 dark:bg-slate-900/60`}
      aria-label="Cite or embed this resource"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Cite or embed</p>
      <h2 className={`${compact ? 'mt-1 text-base' : 'mt-2 text-lg'} font-semibold text-slate-900 dark:text-slate-50`}>
        Link to this ClearCaseIQ resource
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        For journalists, clinics, and educators: copy a citation or embed an educational tool. ClearCaseIQ is not a law firm.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Citation</span>
            <button
              type="button"
              onClick={() => void copy('cite', citation)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {copied === 'cite' ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied === 'cite' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <code className="block overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {citation}
          </code>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Embed code</span>
            <button
              type="button"
              onClick={() => void copy('embed', embedCode)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {copied === 'embed' ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied === 'embed' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <code className="block overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {embedCode}
          </code>
        </div>
      </div>
    </section>
  )
}
