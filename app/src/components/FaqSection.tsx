import { Link } from 'react-router-dom'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export type FaqItem = { q: string; a: string }

interface FaqSectionProps {
  /** Main heading (already localized by the caller). */
  title: string
  /** Optional supporting line under the title (already localized). */
  subtitle?: string
  /** Question/answer pairs (already localized). */
  items: FaqItem[]
  /** Extra classes for the outer wrapper (e.g. vertical spacing). */
  className?: string
}

/**
 * Shared FAQ block used across the public pages so every FAQ reads the same:
 * a centered header, a left "Have any questions?" intro with a Contact button,
 * and a right-hand accordion of questions. Content is passed in per page; the
 * surrounding chrome (kicker, aside copy, Contact CTA) is localized here.
 */
export default function FaqSection({ title, subtitle, items, className = '' }: FaqSectionProps) {
  const { t } = useLanguage()

  return (
    <section className={className}>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 sm:p-10">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
            {t('faqSection.kicker')}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>

        {/* Body: left intro + right accordion */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          {/* Left intro */}
          <div className="lg:pt-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {t('faqSection.asideKicker')}
            </p>
            <h3 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-slate-50">
              {t('faqSection.asideTitle')}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('faqSection.asideBody')}
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              {t('faqSection.contactCta')}
            </Link>
          </div>

          {/* Right accordion */}
          <div className="space-y-3">
            {items.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 transition-colors hover:border-slate-300 open:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:open:bg-slate-900/70 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-600 transition-colors group-open:bg-brand-600 group-open:text-white dark:bg-slate-700 dark:text-slate-300">
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">{item.q}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-3 pl-9 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
