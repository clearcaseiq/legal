import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  SlidersHorizontal,
  X,
} from 'lucide-react'

// `info` maps to the muted `brand` navy; `blue` is a true sky-blue matching the
// prototype's accent tiles (e.g. "Consults today").
type Tone = 'neutral' | 'info' | 'brand' | 'blue' | 'success' | 'warning' | 'danger'

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-slate-900',
  info: 'text-brand-700',
  brand: 'text-brand-600',
  blue: 'text-blue-600',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
}

const TONE_ACTIVE_RING: Record<Tone, string> = {
  neutral: 'border-slate-400 ring-2 ring-slate-200',
  info: 'border-brand-400 ring-2 ring-brand-100',
  brand: 'border-brand-400 ring-2 ring-brand-100',
  blue: 'border-blue-400 ring-2 ring-blue-100',
  success: 'border-emerald-400 ring-2 ring-emerald-100',
  warning: 'border-amber-400 ring-2 ring-amber-100',
  danger: 'border-rose-400 ring-2 ring-rose-100',
}

// Whole-tile tint (background + border) used when `filled` is set, so the entire box
// carries the tone color rather than just the number.
const TONE_FILL_BG: Record<Tone, string> = {
  neutral: 'bg-slate-50',
  info: 'bg-brand-50',
  brand: 'bg-brand-50',
  blue: 'bg-blue-50',
  success: 'bg-emerald-50',
  warning: 'bg-amber-50',
  danger: 'bg-rose-50',
}

const TONE_FILL_BORDER: Record<Tone, string> = {
  neutral: 'border-slate-200',
  info: 'border-brand-200',
  brand: 'border-brand-200',
  blue: 'border-blue-200',
  success: 'border-emerald-200',
  warning: 'border-amber-200',
  danger: 'border-rose-200',
}

const TONE_LABEL: Record<Tone, string> = {
  neutral: 'text-slate-500',
  info: 'text-brand-700',
  brand: 'text-brand-700',
  blue: 'text-blue-700',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
}

/**
 * Clickable stat tile used across the case-management surfaces. Wraps the entire
 * box in a button (not just the number) so the whole tile is the filter toggle.
 */
// Shared "stat tooltips on/off" preference, persisted so the choice carries across
// New Matches, Match Quality, and Marketplace Performance. `hint(text)` returns the
// text when tips are on and `undefined` when off, for passing to FilterStat's `hint`.
const STAT_HINTS_KEY = 'clearcaseiq_show_stat_hints'

export function useStatHints() {
  const [showHints, setShowHints] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STAT_HINTS_KEY) !== 'false'
    } catch {
      return true
    }
  })
  const toggleHints = () =>
    setShowHints((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STAT_HINTS_KEY, String(next))
      } catch {
        /* storage unavailable */
      }
      return next
    })
  const hint = (text: string): string | undefined => (showHints ? text : undefined)
  return { showHints, toggleHints, hint }
}

export function StatHintsToggle({ showHints, onToggle }: { showHints: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={showHints}
      title={showHints ? 'Hide tile tooltips' : 'Show tile tooltips'}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
        showHints
          ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
      }`}
    >
      <Info className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{showHints ? 'Tips on' : 'Tips off'}</span>
    </button>
  )
}

/**
 * Draggable day-range slider used to scope time-windowed sections (e.g. the
 * acquisition funnel and match-quality breakdown). Clearly labels the metric,
 * the min/max endpoints, and the current selection.
 */
export function DayWindowSlider({
  value,
  onChange,
  min = 1,
  max = 90,
  label = 'Time window',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
}) {
  const dayLabel = (n: number) => (n === 1 ? '1 day' : `${n} days`)
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-[11px] tabular-nums text-slate-400">{min}d</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} in days`}
        aria-valuetext={dayLabel(value)}
        className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600"
      />
      <span className="text-[11px] tabular-nums text-slate-400">{max}d</span>
      <span className="whitespace-nowrap rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-700">
        Last {dayLabel(value)}
      </span>
    </div>
  )
}

export function FilterStat({
  value,
  label,
  tone = 'neutral',
  active = false,
  filled = false,
  onClick,
  hint,
}: {
  value: ReactNode
  label: string
  tone?: Tone
  active?: boolean
  /** Tint the entire tile with the tone color (not just the number). */
  filled?: boolean
  onClick?: () => void
  /** Optional explanatory text shown as a hover/focus tooltip (with an info glyph). */
  hint?: string
}) {
  const clickable = typeof onClick === 'function'
  // Non-clickable tiles render as a <div>, not a disabled <button>. Chromium
  // suppresses pointer/hover events on disabled buttons, which blocks the
  // wrapping `.group:hover` and stops the hint tooltip below from ever showing.
  const tileClassName = `flex h-full w-full flex-col items-center rounded-xl border px-4 py-3 text-center transition duration-150 ${
    filled ? TONE_FILL_BG[tone] : 'bg-white'
  } ${
    active ? TONE_ACTIVE_RING[tone] : filled ? TONE_FILL_BORDER[tone] : 'border-slate-200'
  } ${
    clickable
      ? 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:shadow-sm'
      : 'cursor-default'
  }`
  const tileInner = (
    <>
      <span className={`text-2xl font-bold leading-none ${TONE_TEXT[tone]}`}>{value}</span>
      <span className={`mt-1 flex items-center gap-1 text-xs font-medium ${filled ? TONE_LABEL[tone] : 'text-slate-500'}`}>
        {label}
        {hint && <Info className="h-3 w-3 opacity-60" aria-hidden />}
      </span>
    </>
  )
  const tile = clickable ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={tileClassName}
    >
      {tileInner}
    </button>
  ) : (
    <div className={tileClassName} tabIndex={hint ? 0 : undefined}>
      {tileInner}
    </div>
  )

  if (!hint) return tile

  return (
    <div className="group relative">
      {tile}
      <div
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-30 mt-2 w-60 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-lg shadow-slate-900/20 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <span
          className="absolute bottom-full left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1 rotate-45 bg-slate-900"
          aria-hidden
        />
        {hint}
      </div>
    </div>
  )
}

export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: number }) {
  const cols: Record<number, string> = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
  }
  return <div className={`grid grid-cols-2 gap-3 ${cols[columns] ?? cols[4]}`}>{children}</div>
}

export interface FilterOption {
  value: string
  label: string
}

export interface FilterField {
  key: string
  label: string
  options: FilterOption[]
}

/** Dropdown filter bar used on the Active Cases surface. */
export function FilterBar({
  fields,
  values,
  onChange,
  onReset,
}: {
  fields: FilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset?: () => void
}) {
  const activeCount = Object.values(values).filter((v) => v).length
  const hasActive = activeCount > 0
  return (
    <div
      id="cases-filters"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-slate-800">Filters</span>
          {hasActive && (
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
              {activeCount} active
            </span>
          )}
        </div>
        {hasActive && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {fields.map((field) => {
          const selected = Boolean(values[field.key])
          return (
            <label key={field.key} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {field.label}
              </span>
              <div className="relative">
                <select
                  value={values[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-100 ${
                    selected
                      ? 'border-brand-300 font-medium text-slate-900'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                    selected ? 'text-brand-500' : 'text-slate-400'
                  }`}
                />
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Client name rendered as a link to that case's workspace. When a leadId is
 * known we deep-link to the overview section; otherwise it renders plain text.
 */
export function ClientLink({
  name,
  leadId,
  section = 'overview',
}: {
  name: ReactNode
  leadId?: string | null
  section?: string
}) {
  if (!leadId) return <span className="font-medium text-slate-800">{name}</span>
  return (
    <Link
      to={`/attorney-dashboard/lead/${leadId}/${section}`}
      title={typeof name === 'string' ? `Open ${name}'s case` : 'Open case'}
      className="font-semibold text-brand-700 underline decoration-brand-300 decoration-dashed underline-offset-2 transition hover:text-brand-800 hover:decoration-brand-500 hover:decoration-solid"
    >
      {name}
    </Link>
  )
}

/** Generic link into a case workspace given a case/lead id and a label. */
export function CaseLink({
  caseId,
  label,
  section = 'overview',
}: {
  caseId?: string | null
  label: ReactNode
  section?: string
}) {
  return <ClientLink name={label} leadId={caseId} section={section} />
}

/**
 * Prominent, professional back-navigation control used across the app. Renders a
 * bordered white pill with a subtle arrow-slide on hover. Pass `to` for a router
 * link or `onClick` for imperative navigation (e.g. navigate(-1)).
 */
export function BackButton({
  to,
  onClick,
  label = 'Back',
  className = '',
}: {
  to?: string
  onClick?: () => void
  label?: string
  className?: string
}) {
  const cls = `group inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-100 ${className}`
  const inner = (
    <>
      <ArrowLeft className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-x-0.5 group-hover:text-slate-600" />
      {label}
    </>
  )
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export type Crumb = {
  label: string
  /** Omit on the final crumb — the current page is rendered as plain text. */
  to?: string
}

/**
 * Trail showing where a detail page sits, e.g. Admin › Cases › PI-2401.
 *
 * Complements rather than replaces `BackButton`: the button is a single hop to
 * a hardcoded parent, which is misleading when a detail page is reachable from
 * several lists. The trail states the hierarchy explicitly.
 */
export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  if (!items.length) return null
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="rounded transition-colors hover:text-slate-900 hover:underline dark:hover:text-slate-200"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'font-medium text-slate-900 dark:text-slate-100' : undefined}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Offset pager for server-paginated lists.
 *
 * Deliberately offset-based rather than "load more": admin lists are audited
 * and cross-referenced, so a stable "showing 51-100 of 1,204" is more useful
 * than an accumulating feed, and it makes a truncated list obvious instead of
 * silently capping at the first N rows.
 */
export function Pagination({
  total,
  limit,
  offset,
  onChange,
  disabled = false,
  pageSizes = [25, 50, 100],
  onLimitChange,
  className = '',
}: {
  total: number
  limit: number
  offset: number
  onChange: (nextOffset: number) => void
  disabled?: boolean
  pageSizes?: number[]
  onLimitChange?: (nextLimit: number) => void
  className?: string
}) {
  const safeLimit = Math.max(limit, 1)
  const page = Math.floor(offset / safeLimit) + 1
  const pageCount = Math.max(Math.ceil(total / safeLimit), 1)
  const first = total === 0 ? 0 : offset + 1
  const last = Math.min(offset + safeLimit, total)

  // A single page of results needs no controls at all unless the caller also
  // wants the page-size selector.
  if (total <= safeLimit && !onLimitChange) return null

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800 ${className}`}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing <span className="font-medium text-slate-700 dark:text-slate-300">{first}</span>–
            <span className="font-medium text-slate-700 dark:text-slate-300">{last}</span> of{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {total.toLocaleString()}
            </span>
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        {onLimitChange && (
          <label className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <span className="sr-only sm:not-sr-only">Rows</span>
            <select
              value={safeLimit}
              disabled={disabled}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="input w-auto py-1"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={() => onChange(Math.max(offset - safeLimit, 0))}
          disabled={disabled || offset === 0}
          className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-ui-sm disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </button>

        <span className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
          Page {page} of {pageCount}
        </span>

        <button
          type="button"
          onClick={() => onChange(offset + safeLimit)}
          disabled={disabled || last >= total}
          className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-ui-sm disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

export function SectionCard({
  title,
  trailing,
  children,
}: {
  /** ReactNode (not just string) so callers can prefix the heading with an icon. */
  title?: ReactNode
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-900/70">
      {(title || trailing) && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          {title && (
            <h2 className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">
              {title}
            </h2>
          )}
          {trailing}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

/**
 * Inline one-line message for the empty/loading/error slot *inside* a table or
 * panel (this is what DataTable renders). For a page-level zero-data state that
 * needs an icon, heading, explanation, or recovery actions, use the richer
 * `components/EmptyState` instead.
 */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
      {message}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Shared table system                                                        */
/* The single source of truth for how workspace tables look: refined uppercase */
/* header, hairline row dividers, row hover, comfortable padding, and helpers  */
/* for initials avatars + tone badges. Use <DataTable> for straightforward     */
/* column/row lists; drop to the primitives (TableScroll/THeadRow/Th/Tr/Td)    */
/* for tables that need custom row structures (grouping, selection, footers).  */
/* -------------------------------------------------------------------------- */

type Align = 'left' | 'right' | 'center'

function alignClass(align?: Align) {
  return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
}

/** Up-to-two-letter initials from a name, for row avatars. */
export function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Circular initials avatar. Pops to white on row hover (inside a `group` row). */
export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 group-hover:bg-white dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700 dark:group-hover:bg-slate-700 ${className}`}
    >
      {initials(name)}
    </span>
  )
}

export type BadgeTone = 'neutral' | 'brand' | 'blue' | 'success' | 'warning' | 'danger'

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-900',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
}

/** Pill badge used for statuses, counts, stages, and due dates across tables. */
export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      // whitespace-nowrap: a pill that breaks across two lines reads as two
      // separate badges. "Wave 1" in the routing queue was splitting into
      // "Wave" / "1" in its narrow column (CP-456).
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${BADGE_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/**
 * Horizontal-scroll wrapper + base <table> with the shared spacing model.
 *
 * When the table is wider than its container we render a *proxy* horizontal
 * scrollbar that is `position: sticky` to the bottom of the viewport, and keep
 * its scroll position in sync with the real (scrollbar-hidden) table container.
 * On a long list the attorney can drag the columns left/right at any point
 * without first scrolling to the very bottom of the page. Falls back to no bar
 * when the table fits.
 */
export function TableScroll({
  children,
  className = '',
  maxHeight,
}: {
  children: ReactNode
  className?: string
  /**
   * When set, the body scrolls vertically within this height (px or CSS length)
   * and the header sticks, so long lists don't push the page down. In this mode
   * the native scrollbars are shown inside the bounded box (no proxy bar needed).
   */
  maxHeight?: number | string
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)
  const [metrics, setMetrics] = useState({ scrollWidth: 0, clientWidth: 0 })

  // Bounded-height mode: vertical scroll box with a sticky header and visible
  // thin scrollbars. No sticky proxy bar — both bars live inside the box.
  if (maxHeight != null) {
    return (
      <div
        style={{ maxHeight }}
        className="overflow-auto rounded-lg [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5"
      >
        <table className={`w-full border-separate border-spacing-0 text-sm ${className}`}>{children}</table>
      </div>
    )
  }

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => setMetrics({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (tableRef.current) ro.observe(tableRef.current)
    return () => ro.disconnect()
  }, [children])

  // Keep the real container and the proxy bar in lockstep. The guard swallows the
  // scroll event that our own programmatic update triggers on the other element,
  // so the two never fight each other.
  const sync = (from: 'content' | 'bar') => {
    const content = contentRef.current
    const bar = barRef.current
    if (!content || !bar) return
    if (syncing.current) {
      syncing.current = false
      return
    }
    const [target, source] = from === 'content' ? [bar, content] : [content, bar]
    if (target.scrollLeft !== source.scrollLeft) {
      syncing.current = true
      target.scrollLeft = source.scrollLeft
    }
  }

  const overflowing = metrics.scrollWidth - metrics.clientWidth > 1

  return (
    <div className="relative">
      <div
        ref={contentRef}
        onScroll={() => sync('content')}
        className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <table ref={tableRef} className={`w-full border-separate border-spacing-0 text-sm ${className}`}>
          {children}
        </table>
      </div>
      {overflowing && (
        <div
          ref={barRef}
          onScroll={() => sync('bar')}
          aria-hidden="true"
          className="sticky bottom-0 z-20 h-4 overflow-x-auto overflow-y-hidden border-t border-slate-200 bg-white/90 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-2.5"
        >
          <div className="h-px" style={{ width: metrics.scrollWidth }} />
        </div>
      )}
    </div>
  )
}

/** Styled header row wrapper — place <Th> cells inside. */
export function THeadRow({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        {children}
      </tr>
    </thead>
  )
}

export function Th({ children, align = 'left', className = '' }: { children?: ReactNode; align?: Align; className?: string }) {
  return (
    <th className={`border-b border-slate-200 px-3 pb-2.5 dark:border-slate-700 ${alignClass(align)} ${className}`}>
      {children}
    </th>
  )
}

/** Body row. Adds the `group` + hover treatment so cells can react on hover. */
export function Tr({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={`group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

export function Td({ children, align = 'left', className = '' }: { children?: ReactNode; align?: Align; className?: string }) {
  return (
    <td
      className={`border-b border-slate-100 px-3 py-3 align-middle group-last:border-0 dark:border-slate-800 ${alignClass(align)} ${className}`}
    >
      {children}
    </td>
  )
}

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  align?: Align
  /** Cell renderer for this column. */
  cell: (row: T, index: number) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

/**
 * Config-driven table with the unified workspace styling. Handles loading,
 * error, and empty states so callers don't re-implement them.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading = false,
  error = null,
  emptyMessage = 'No results.',
  loadingMessage = 'Loading…',
  maxHeight,
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  loadingMessage?: string
  /** When set, the table body scrolls vertically within this height with a sticky header. */
  maxHeight?: number | string
}) {
  if (loading) return <EmptyState message={loadingMessage} />
  if (error) return <EmptyState message={error} />
  if (!rows.length) return <EmptyState message={emptyMessage} />
  // In bounded-height mode the header must stay pinned while the body scrolls.
  const stickyHeader = maxHeight != null ? 'sticky top-0 z-10 bg-white dark:bg-slate-900' : ''
  return (
    <TableScroll maxHeight={maxHeight}>
      <THeadRow>
        {columns.map((c) => (
          <Th key={c.key} align={c.align} className={`${stickyHeader} ${c.headerClassName ?? ''}`.trim()}>
            {c.header}
          </Th>
        ))}
      </THeadRow>
      <tbody>
        {rows.map((row, i) => (
          <Tr key={rowKey(row, i)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns.map((c) => (
              <Td key={c.key} align={c.align} className={c.cellClassName}>
                {c.cell(row, i)}
              </Td>
            ))}
          </Tr>
        ))}
      </tbody>
    </TableScroll>
  )
}
