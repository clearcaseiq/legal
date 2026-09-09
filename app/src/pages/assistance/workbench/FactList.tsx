import { useMemo } from 'react'
import { humanize } from '../assistanceLabels'

/**
 * A value past this length has outgrown its column and takes the whole row.
 *
 * Cells are 14rem wide, so a composed narrative in one became a several-hundred
 * word ribbon a few words to a line. Worse, grid rows are as tall as their
 * tallest cell, so it stretched its two neighbours into a screen of white space
 * with the incident date stranded at the top.
 */
const FULL_ROW_LENGTH = 160

/** A `Label: value` pair, which is one fact and belongs on its own line. */
const LABELLED_SEGMENT = /^([A-Za-z][^.:!?]{0,39}):\s*\S/

/**
 * Prose sometimes contains a colon too ("I told the officer the following: …"),
 * and splitting a claimant's sentence in half is a worse outcome than leaving
 * two facts on one line. The labels intake emits are short — the longest is
 * "Other injuries (in their words)" — so length is what separates them from a
 * clause. A lead-in of five words or fewer will still be mistaken for a label;
 * that costs one extra line break and nothing else.
 */
const MAX_LABEL_WORDS = 5

function isLabelledFact(sentence: string): boolean {
  const match = LABELLED_SEGMENT.exec(sentence)
  if (!match) return false
  return match[1].trim().split(/\s+/).length <= MAX_LABEL_WORDS
}

/**
 * Split a value at sentence boundaries, keeping the terminator.
 *
 * Only breaks on a period followed by whitespace, so decimals and money
 * ("$10,000.50") stay whole.
 */
function splitSentences(text: string): string[] {
  const out: string[] = []
  const boundary = /\.\s+/g
  let start = 0
  let match: RegExpExecArray | null
  while ((match = boundary.exec(text))) {
    out.push(text.slice(start, match.index + 1))
    start = match.index + match[0].length
  }
  out.push(text.slice(start))
  return out
}

/**
 * Recover the separate facts a composed narrative was flattened out of.
 *
 * Intake builds `facts.incident.narrative` by joining a list of parts with
 * ". " (see `buildNarrative` in `IntakeWizardQuick`), which throws away the
 * boundaries between them: the date of loss, the claimant's own account of the
 * crash, the body parts and the medical bill range all arrive as one paragraph.
 * The labelled parts are still recognizable by their `Label: value` shape, so
 * each becomes its own line here.
 *
 * Consecutive unlabelled sentences are joined back together rather than listed,
 * because those are the claimant's prose, where the sentence breaks are the
 * writing and not a separator. This is why a handful of unlabelled answers the
 * composer emitted — injury severity, treatment — stay attached to the prose:
 * nothing in the stored string distinguishes them from a sentence of it.
 */
export function splitFactSegments(text: string): string[] {
  const rows: string[] = []
  let prose: string[] = []

  const flushProse = () => {
    if (prose.length) rows.push(prose.join(' '))
    prose = []
  }

  // Newlines are an author's own separator, so they are honoured before any
  // guessing happens.
  for (const line of text.split(/\r?\n+/)) {
    for (const raw of splitSentences(line)) {
      const sentence = raw.trim()
      if (!sentence) continue
      if (isLabelledFact(sentence)) {
        flushProse()
        rows.push(sentence)
      } else {
        prose.push(sentence)
      }
    }
  }
  flushProse()

  return rows
}

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
  const rows = value ? splitFactSegments(value) : []
  const fullRow = (value?.length || 0) > FULL_ROW_LENGTH

  return (
    <div className={fullRow ? 'col-span-full min-w-0' : 'min-w-0'}>
      <dt className="break-words text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-slate-800 dark:text-slate-200">
        {href && value ? (
          <a className="text-brand-700 hover:underline dark:text-brand-400" href={href}>
            {value}
          </a>
        ) : rows.length > 1 ? (
          <div className="space-y-1">
            {rows.map((row, index) => (
              <p key={index}>{row}</p>
            ))}
          </div>
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
