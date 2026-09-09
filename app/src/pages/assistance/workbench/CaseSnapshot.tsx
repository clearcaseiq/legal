import { useMemo, useState } from 'react'
import { SectionCard } from '../../../features/shared/ui'
import { formatClaimType } from '../../../lib/claimTypes'
import { timeAgo } from '../assistanceLabels'
import { FactBlock, Field, splitFactSegments } from './FactList'

const NARRATIVE_PREVIEW = 320

/**
 * The case in one glance, with everything else one click away.
 *
 * What this replaces printed every key in the facts blob by default, which is
 * honest but unreadable: a specialist scanning for the date of loss read past
 * forty rows of nested intake keys to find it. The curated list the analysis
 * engine already produces (`known`) is what a person would actually write down,
 * so it leads, and the exhaustive dump stays available underneath for the cases
 * where the answer is only in some field nobody anticipated.
 */
export function CaseSnapshot({
  summary,
  known,
}: {
  summary: Record<string, any>
  known: { key: string; label: string; value: string; detail?: string }[]
}) {
  const [showAll, setShowAll] = useState(false)
  const [showFullNarrative, setShowFullNarrative] = useState(false)

  const narrative = typeof summary.narrative === 'string' ? summary.narrative : null

  // Same treatment as the full case file: what intake stored here is a list of
  // answers joined with ". ", not a piece of writing, so it reads as a wall
  // until the facts are given their lines back.
  const narrativeRows = useMemo(() => (narrative ? splitFactSegments(narrative) : []), [narrative])

  // Preview whole rows rather than a character count. Cutting at 320 characters
  // now would end mid-fact, and the ellipsis would sit where a row break should.
  const previewRows = useMemo(() => {
    const shown: string[] = []
    let length = 0
    for (const row of narrativeRows) {
      if (shown.length && length + row.length > NARRATIVE_PREVIEW) break
      shown.push(row)
      length += row.length
    }
    return shown
  }, [narrativeRows])

  const isLongNarrative = previewRows.length < narrativeRows.length
  const visibleRows = showFullNarrative || !isLongNarrative ? narrativeRows : previewRows

  // The curated facts already carry case type and venue, and carry them better
  // — "Motor vehicle (Rear-end collision)" against a bare claim type. They
  // arrive with the AI panel though, a request behind this one, so the plain
  // fields below stand in until then rather than the card listing each twice.
  const knownKeys = new Set(known.map((fact) => fact.key))

  return (
    <SectionCard
      title="Case snapshot"
      trailing={
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
        >
          {showAll ? 'Hide full case file' : 'View full case file'}
        </button>
      }
    >
      <dl className="grid gap-x-6 gap-y-3 text-sm [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
        {!knownKeys.has('claim_type') && (
          <Field label="Case type" value={formatClaimType(summary.claimType)} />
        )}
        {!knownKeys.has('venue') && (
          <Field
            label="Venue"
            value={[summary.venueCounty, summary.venueState].filter(Boolean).join(', ') || null}
          />
        )}
        <Field label="Documents uploaded" value={String(summary.evidenceCount ?? 0)} />
        <Field label="Submitted" value={timeAgo(summary.submittedAt)} />
        {known.map((fact) => (
          <Field key={fact.key} label={fact.label} value={fact.value} />
        ))}
      </dl>

      {narrative && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            In their words
          </p>
          <div className="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {visibleRows.map((row, index) => (
              <p key={index} className="whitespace-pre-wrap">
                {row}
              </p>
            ))}
          </div>
          {isLongNarrative && (
            <button
              type="button"
              onClick={() => setShowFullNarrative((current) => !current)}
              className="mt-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              {showFullNarrative ? 'Show less' : 'View full narrative'}
            </button>
          )}
        </div>
      )}

      {showAll && (
        <div className="mt-4 border-t border-slate-100 pt-2 dark:border-slate-800">
          <FactBlock label="Incident" value={summary.incident} />
          <FactBlock label="Injuries" value={summary.injuries} />
          <FactBlock label="Treatment" value={summary.treatment} />
          <FactBlock label="Work and income" value={summary.employment} />
          <FactBlock label="Insurance" value={summary.insurance} />
        </div>
      )}
    </SectionCard>
  )
}
