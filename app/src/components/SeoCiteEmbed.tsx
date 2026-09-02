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

type SnippetKind = 'cite' | 'citeHtml' | 'embed'

/**
 * Embeddable tools: the name to attribute, and how tall the frame needs to be.
 *
 * Height matters more than it looks. An iframe does not grow to fit its content,
 * so a frame sized for the deadline checker cuts the calculators off mid-form and
 * strands the visitor inside a nested scrollbar.
 */
const EMBEDDABLE_TOOLS: Record<string, { label: string; height: number }> = {
  '/tools/california-sol-checker': { label: 'California statute of limitations checker', height: 640 },
  '/tools/medical-records-checklist': { label: 'Medical records checklist', height: 900 },
  '/tools/settlement-calculator': { label: 'Accident settlement calculator', height: 1180 },
  '/tools/whiplash-settlement-calculator': { label: 'Whiplash settlement calculator', height: 1180 },
  '/tools/herniated-disc-calculator': { label: 'Herniated disc settlement calculator', height: 1180 },
  '/tools/tbi-settlement-calculator': { label: 'Traumatic brain injury settlement calculator', height: 1280 },
  '/tools/truck-accident-calculator': { label: 'Truck accident settlement calculator', height: 1180 },
  '/tools/uber-accident-calculator': { label: 'Rideshare accident settlement calculator', height: 1180 },
}

const FALLBACK_TOOL = { label: 'Case readiness tools', height: 640 }

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Citation + optional iframe embed for educational SEO pages.
 * Copy actions are click-only so SSR markup stays hydration-safe.
 *
 * Both snippets carry a real anchor on purpose. The plain-text citation left
 * whoever pasted it to build the link themselves, and the embed was a bare
 * iframe — search engines treat an iframe as an embed, not a link, so it passed
 * no credit to the page being embedded no matter how many sites used it.
 */
export default function SeoCiteEmbed({
  title,
  path,
  embedToolPath = '/tools/california-sol-checker',
  compact = false,
}: SeoCiteEmbedProps) {
  const [copied, setCopied] = useState<SnippetKind | null>(null)
  const canonical = `${siteUrl}${path === '/' ? '' : path}`
  const toolUrl = `${siteUrl}${embedToolPath}`
  const embedUrl = `${toolUrl}?embed=1`
  const tool = EMBEDDABLE_TOOLS[embedToolPath] || FALLBACK_TOOL
  const toolLabel = tool.label

  const citation = `${title}. ClearCaseIQ. ${canonical}`
  const citationHtml = `<a href="${canonical}">${escapeHtml(title)}</a>. ClearCaseIQ.`
  const embedCode = `<!-- ClearCaseIQ educational tool -->
<figure style="margin:0">
  <iframe src="${embedUrl}" title="${escapeHtml(toolLabel)} — ClearCaseIQ" width="100%" height="${tool.height}" loading="lazy" style="border:1px solid #e2e8f0;border-radius:12px;" referrerpolicy="no-referrer-when-downgrade"></iframe>
  <figcaption style="margin-top:8px;font:13px/1.5 system-ui,sans-serif;color:#64748b;">
    Source: <a href="${toolUrl}" style="color:#1d4ed8;">${escapeHtml(toolLabel)}</a> by ClearCaseIQ. Not a law firm.
  </figcaption>
</figure>`

  const copy = async (kind: SnippetKind, value: string) => {
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
      {/* Names the resource rather than saying "this resource". The component is
          embedded on every landing page, so a fixed string here was one more
          heading repeated site-wide. */}
      <h2 className={`${compact ? 'mt-1 text-base' : 'mt-2 text-lg'} font-semibold text-slate-900 dark:text-slate-50`}>
        Link to {title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        For journalists, clinics, and educators: copy a citation or embed an educational tool. Attribution is required —
        the embed includes it. ClearCaseIQ is not a law firm.
      </p>

      <div className="mt-4 space-y-3">
        <Snippet
          label="Citation (plain text)"
          value={citation}
          copied={copied === 'cite'}
          onCopy={() => void copy('cite', citation)}
        />
        <Snippet
          label="Citation (HTML, linked)"
          value={citationHtml}
          copied={copied === 'citeHtml'}
          onCopy={() => void copy('citeHtml', citationHtml)}
        />
        <Snippet
          label="Embed code"
          value={embedCode}
          copied={copied === 'embed'}
          onCopy={() => void copy('embed', embedCode)}
        />
      </div>
    </section>
  )
}

function Snippet({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <code className="block overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        {value}
      </code>
    </div>
  )
}
