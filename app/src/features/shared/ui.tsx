import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, SlidersHorizontal, X } from 'lucide-react'

// `info` maps to the muted `brand` navy; `blue` is a true sky-blue matching the
// prototype's accent tiles (e.g. "Consults today").
type Tone = 'neutral' | 'info' | 'blue' | 'success' | 'warning' | 'danger'

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-slate-900',
  info: 'text-brand-700',
  blue: 'text-blue-600',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
}

const TONE_ACTIVE_RING: Record<Tone, string> = {
  neutral: 'border-slate-400 ring-2 ring-slate-200',
  info: 'border-brand-400 ring-2 ring-brand-100',
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
  blue: 'bg-blue-50',
  success: 'bg-emerald-50',
  warning: 'bg-amber-50',
  danger: 'bg-rose-50',
}

const TONE_FILL_BORDER: Record<Tone, string> = {
  neutral: 'border-slate-200',
  info: 'border-brand-200',
  blue: 'border-blue-200',
  success: 'border-emerald-200',
  warning: 'border-amber-200',
  danger: 'border-rose-200',
}

const TONE_LABEL: Record<Tone, string> = {
  neutral: 'text-slate-500',
  info: 'text-brand-700',
  blue: 'text-blue-700',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
}

/**
 * Clickable stat tile used across the case-management surfaces. Wraps the entire
 * box in a button (not just the number) so the whole tile is the filter toggle.
 */
export function FilterStat({
  value,
  label,
  tone = 'neutral',
  active = false,
  filled = false,
  onClick,
}: {
  value: ReactNode
  label: string
  tone?: Tone
  active?: boolean
  /** Tint the entire tile with the tone color (not just the number). */
  filled?: boolean
  onClick?: () => void
}) {
  const clickable = typeof onClick === 'function'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      aria-pressed={clickable ? active : undefined}
      className={`flex flex-col items-center rounded-xl border px-4 py-3 text-center transition duration-150 ${
        filled ? TONE_FILL_BG[tone] : 'bg-white'
      } ${
        active ? TONE_ACTIVE_RING[tone] : filled ? TONE_FILL_BORDER[tone] : 'border-slate-200'
      } ${
        clickable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:shadow-sm'
          : 'cursor-default'
      }`}
    >
      <span className={`text-2xl font-bold leading-none ${TONE_TEXT[tone]}`}>{value}</span>
      <span className={`mt-1 text-xs font-medium ${filled ? TONE_LABEL[tone] : 'text-slate-500'}`}>{label}</span>
    </button>
  )
}

export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: number }) {
  const cols: Record<number, string> = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
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
      className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
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
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionCard({
  title,
  trailing,
  children,
}: {
  title?: string
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      {(title || trailing) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {trailing}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
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
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 group-hover:bg-white ${className}`}
    >
      {initials(name)}
    </span>
  )
}

export type BadgeTone = 'neutral' | 'brand' | 'blue' | 'success' | 'warning' | 'danger'

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${BADGE_TONE[tone]} ${className}`}
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
export function TableScroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)
  const [metrics, setMetrics] = useState({ scrollWidth: 0, clientWidth: 0 })

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
          className="sticky bottom-0 z-20 h-4 overflow-x-auto overflow-y-hidden border-t border-slate-200 bg-white/90 backdrop-blur-sm [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-2.5"
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
      <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-700">{children}</tr>
    </thead>
  )
}

export function Th({ children, align = 'left', className = '' }: { children?: ReactNode; align?: Align; className?: string }) {
  return <th className={`border-b border-slate-200 px-3 pb-2.5 ${alignClass(align)} ${className}`}>{children}</th>
}

/** Body row. Adds the `group` + hover treatment so cells can react on hover. */
export function Tr({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={`group transition-colors hover:bg-slate-50/70 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

export function Td({ children, align = 'left', className = '' }: { children?: ReactNode; align?: Align; className?: string }) {
  return (
    <td className={`border-b border-slate-100 px-3 py-3 align-middle group-last:border-0 ${alignClass(align)} ${className}`}>
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
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  loadingMessage?: string
}) {
  if (loading) return <EmptyState message={loadingMessage} />
  if (error) return <EmptyState message={error} />
  if (!rows.length) return <EmptyState message={emptyMessage} />
  return (
    <TableScroll>
      <THeadRow>
        {columns.map((c) => (
          <Th key={c.key} align={c.align} className={c.headerClassName}>
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
