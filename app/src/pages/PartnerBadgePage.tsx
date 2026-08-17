import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import { siteUrl } from '../data/seoLandingPageSchema'

const BADGE_PAGE = `${siteUrl}/partners/badge`
const HOME = siteUrl

/**
 * Who is placing the badge decides how the link has to be marked.
 *
 * Participating firms have a paid relationship with ClearCaseIQ, so a followed
 * link from their site is a link within a commercial arrangement and has to say
 * so with `rel="sponsored"`. Clinics, educators, and nonprofits link on the merit
 * of the free tools, and those links stay ordinary. Getting this wrong risks the
 * whole domain, which for a platform in a regulated space is not a trade worth
 * making for a handful of links.
 */
type Audience = 'educational' | 'firm'

const AUDIENCES: Array<{
  id: Audience
  label: string
  hint: string
  rel: string
  utmSource: string
}> = [
  {
    id: 'educational',
    label: 'Clinic, educator, or nonprofit',
    hint: 'No commercial relationship with ClearCaseIQ. A normal link.',
    rel: 'noopener noreferrer',
    utmSource: 'partner_badge',
  },
  {
    id: 'firm',
    label: 'Participating law firm',
    hint: 'Paid relationship with ClearCaseIQ, so the link is marked sponsored.',
    rel: 'sponsored noopener noreferrer',
    utmSource: 'firm_badge',
  },
]

function badgeHtmlFor(audience: (typeof AUDIENCES)[number]) {
  return `<!-- ClearCaseIQ partner badge: educational case-readiness tools -->
<a href="${HOME}/?utm_source=${audience.utmSource}&utm_medium=referral" rel="${audience.rel}" style="display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;text-decoration:none;font-family:system-ui,sans-serif;">
  <img src="${siteUrl}/cciq-mark.svg" alt="" width="28" height="28" />
  <span style="display:flex;flex-direction:column;gap:2px;">
    <span style="font-size:12px;font-weight:700;color:#0f172a;">ClearCaseIQ</span>
    <span style="font-size:11px;color:#64748b;">Case readiness tools</span>
  </span>
</a>`
}

function badgeMarkdownFor(audience: (typeof AUDIENCES)[number]) {
  return `[![ClearCaseIQ case readiness tools](${siteUrl}/cciq-mark.svg)](${HOME}/?utm_source=${audience.utmSource}&utm_medium=referral)`
}

export default function PartnerBadgePage() {
  const [copied, setCopied] = useState<'html' | 'md' | null>(null)
  const [audienceId, setAudienceId] = useState<Audience>('educational')
  const audience = AUDIENCES.find((entry) => entry.id === audienceId) || AUDIENCES[0]
  const badgeHtml = badgeHtmlFor(audience)
  const badgeMarkdown = badgeMarkdownFor(audience)

  const copy = async (kind: 'html' | 'md', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Partners</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          Partner badge
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Clinics, educators, and participating firms can link to ClearCaseIQ’s educational tools. This badge is not an
          endorsement of any attorney and does not create a referral relationship by itself.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Who is placing the badge?</p>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setAudienceId(entry.id)}
              aria-pressed={entry.id === audienceId}
              className={`rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
                entry.id === audienceId
                  ? 'border-brand-300 bg-brand-50 text-brand-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{audience.hint}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
        <a
          href={`${HOME}/?utm_source=${audience.utmSource}&utm_medium=referral`}
          className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 no-underline shadow-sm transition-colors hover:border-brand-200"
        >
          <img src="/cciq-mark.svg" alt="" width={28} height={28} />
          <span className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-slate-900">ClearCaseIQ</span>
            <span className="text-[11px] text-slate-500">Case readiness tools</span>
          </span>
        </a>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">HTML embed</h2>
          <button
            type="button"
            onClick={() => void copy('html', badgeHtml)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            {copied === 'html' ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied === 'html' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
          {badgeHtml}
        </pre>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Markdown</h2>
          {audienceId === 'educational' && (
            <button
              type="button"
              onClick={() => void copy('md', badgeMarkdown)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              {copied === 'md' ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied === 'md' ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
        {audienceId === 'educational' ? (
          <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
            {badgeMarkdown}
          </pre>
        ) : (
          // Markdown image links cannot carry a rel attribute, so this variant
          // would quietly publish the followed link the HTML one avoids.
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
            Markdown cannot express the <code className="font-mono">rel</code> attribute, so participating firms should
            use the HTML embed above. It carries the required <code className="font-mono">sponsored</code> marking.
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Usage guidelines</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not alter the badge to imply ClearCaseIQ is a law firm or endorses a specific attorney.</li>
          <li>Link should resolve to ClearCaseIQ (this page or the homepage), not a competitor or lead mill.</li>
          <li>
            Keep the <code className="font-mono">rel</code> attribute as generated. Participating firms have a paid
            relationship with ClearCaseIQ, so those links are marked <code className="font-mono">sponsored</code> —
            required by search engine guidelines and removing it helps neither of us.
          </li>
          <li>Placing the badge is voluntary and is never a condition of participating in the attorney network.</li>
          <li>
            Prefer linking educational tools such as the{' '}
            <Link to="/tools/california-sol-checker" className="font-semibold text-brand-700">
              SOL checker
            </Link>{' '}
            or{' '}
            <Link to="/tools/medical-records-checklist" className="font-semibold text-brand-700">
              records checklist
            </Link>{' '}
            when relevant.
          </li>
          <li>
            Questions:{' '}
            <a href="mailto:partnerships@clearcaseiq.com" className="font-semibold text-brand-700">
              partnerships@clearcaseiq.com
            </a>
          </li>
        </ul>
        <p className="pt-2 text-xs text-slate-500">Badge explainer URL: {BADGE_PAGE}</p>
      </section>
    </div>
  )
}
