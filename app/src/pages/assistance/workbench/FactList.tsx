import { useMemo } from 'react'
import { humanize } from '../assistanceLabels'

/**
 * Label-over-value pairs for reading case facts in a narrow column.
 *
 * Stacked, not side by side. Labels here are not all short — `FactBlock` builds
 * them by joining nested JSON keys, so they run to things like "incidentTags
 * taxonomyPath Item 2" — and these render inside panels that are often the
 * narrowest thing on the screen. Sharing one line between a label and a value at
 * that width left each side a few characters wide and broke both mid-word.
 * Giving each its own line is the only arrangement that holds at any width.
 */
export function Field({
  label,
  value,
  href,
}: {
  label: string
  value?: string | null
  href?: string
}) {
  return (
    <div className="min-w-0">
      <dt className="break-words text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-slate-800 dark:text-slate-200">
        {href && value ? (
          <a className="text-brand-700 hover:underline dark:text-brand-400" href={href}>
            {value}
          </a>
        ) : (
          value || '—'
        )}
      </dd>
    </div>
  )
}

/**
 * Render whatever intake stored under a fact group.
 *
 * `Assessment.facts` is a free-form JSON blob with no schema, so the shape here
 * varies by claim type and by how old the case is. Printing the keys generically
 * is honest about that; a fixed field list would silently drop anything it did
 * not expect. It is no longer the default view — the snapshot is — because
 * "honest about everything" and "readable" are not the same thing.
 */
export function FactBlock({ label, value }: { label: string; value: unknown }) {
  const entries = useMemo(() => flattenFacts(value), [value])
  if (entries.length === 0) return null

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      {/* Wider minimum than typed fields: these labels come from arbitrary nested
          JSON keys and have no length bound, so they need more room before a
          second column is worth having. */}
      <dl className="mt-1 grid gap-x-6 gap-y-2.5 text-sm [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]">
        {entries.map(([key, text]) => (
          <Field key={key} label={humanize(key)} value={text} />
        ))}
      </dl>
    </div>
  )
}

export function flattenFacts(value: unknown, depth = 0): [string, string][] {
  if (value == null || depth > 2) return []
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      typeof item === 'object' && item
        ? flattenFacts(item, depth + 1).map(([key, text]): [string, string] => [`${index + 1} ${key}`, text])
        : [[`Item ${index + 1}`, String(item)] as [string, string]],
    )
  }
  if (typeof value !== 'object') return [['Value', String(value)]]

  return Object.entries(value as Record<string, unknown>).flatMap(([key, raw]): [string, string][] => {
    if (raw == null || raw === '') return []
    if (typeof raw === 'object') {
      return flattenFacts(raw, depth + 1).map(([nested, text]): [string, string] => [`${key} ${nested}`, text])
    }
    return [[key, typeof raw === 'boolean' ? (raw ? 'Yes' : 'No') : String(raw)]]
  })
}
