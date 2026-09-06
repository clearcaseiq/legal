import { useState } from 'react'
import { SectionCard } from '../../../features/shared/ui'
import { humanize, timeAgo } from '../assistanceLabels'
import { FactBlock, Field } from './FactList'

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
  const isLongNarrative = !!narrative && narrative.length > NARRATIVE_PREVIEW

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
        <Field label="Claim type" value={humanize(summary.claimType)} />
        <Field
          label="Venue"
          value={[summary.venueCounty, summary.venueState].filter(Boolean).join(', ') || null}
        />
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
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {showFullNarrative || !isLongNarrative
              ? narrative
              : `${narrative.slice(0, NARRATIVE_PREVIEW).trimEnd()}…`}
          </p>
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
