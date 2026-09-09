import { EmptyState, LoadingState, SectionCard } from '../../../features/shared/ui'
import type { AssistanceGap } from '../../../lib/api'

/**
 * Completeness per domain, not one number.
 *
 * A bare "68%" tells a specialist the case is unfinished but not what to do
 * about it. The same file broken out shows insurance half-answered against
 * liability fully answered, which is a call to make rather than a score to note.
 *
 * Built from gap categories rather than the readiness factors, because those
 * factors measure something else: four of the six are "has this document been
 * uploaded", so they describe the evidence pile, not how much of the claimant's
 * story has been captured. Gaps carry a domain and are deliberately kept in the
 * list once resolved, which is exactly the numerator and denominator this needs.
 *
 * Called completeness rather than strength on purpose: these bars measure how
 * much of the file is filled in, and a specialist reading a low bar as weak
 * legal merit would be drawing a conclusion they are not allowed to draw.
 */

// Fixed order rather than ranked by urgency, so a domain does not move under the
// cursor of someone who checks this screen all day.
const DOMAINS: { key: string; label: string }[] = [
  { key: 'liability', label: 'Liability' },
  { key: 'medical', label: 'Medical' },
  { key: 'damages', label: 'Damages' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'case_strategy', label: 'Case strategy' },
]

type DomainProgress = {
  key: string
  label: string
  resolved: number
  total: number
  percent: number
  openCritical: number
}

export function summarizeDomains(gaps: AssistanceGap[]): {
  scored: DomainProgress[]
  unflagged: string[]
} {
  const scored: DomainProgress[] = []
  const unflagged: string[] = []

  for (const domain of DOMAINS) {
    const inDomain = gaps.filter((gap) => gap.category === domain.key)
    if (inDomain.length === 0) {
      // A domain with no gaps was never flagged, which is not the same as being
      // complete — the generator only emits a gap when something triggers it. It
      // gets a mention below the bars instead of a green bar it has not earned.
      unflagged.push(domain.label)
      continue
    }
    const resolved = inDomain.filter((gap) => gap.resolved).length
    scored.push({
      key: domain.key,
      label: domain.label,
      resolved,
      total: inDomain.length,
      percent: Math.round((resolved / inDomain.length) * 100),
      openCritical: inDomain.filter((gap) => !gap.resolved && gap.severity >= 4).length,
    })
  }

  return { scored, unflagged }
}

export function CaseCompleteness({
  gaps,
  evidenceScore,
  loading,
}: {
  gaps: AssistanceGap[]
  /** The readiness score, which measures documents on file rather than answers. */
  evidenceScore: number | null
  /** The gaps arrive a request behind the case file. */
  loading?: boolean
}) {
  const { scored, unflagged } = summarizeDomains(gaps)

  // Every domain looks unflagged before the gaps land, so the bars and the
  // "nothing flagged in …" line would both report a complete file for as long
  // as the analysis takes.
  if (loading) {
    return (
      <SectionCard title="Case completeness">
        <LoadingState message="Measuring what is on file…" />
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Case completeness">
      {scored.length === 0 ? (
        <EmptyState message="Nothing outstanding has been flagged on this case yet." />
      ) : (
        <ul className="space-y-2.5">
          {scored.map((domain) => (
            <li key={domain.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">{domain.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {domain.resolved} of {domain.total}
                </span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                role="img"
                aria-label={`${domain.label}: ${domain.resolved} of ${domain.total} answered`}
              >
                <div
                  className={`h-full rounded-full ${barTone(domain.percent)}`}
                  style={{ width: `${domain.percent}%` }}
                />
              </div>
              {domain.openCritical > 0 && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {domain.openCritical} critical {domain.openCritical === 1 ? 'item' : 'items'} still open
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {unflagged.length > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Nothing flagged in {unflagged.join(', ')}.
        </p>
      )}

      {evidenceScore != null && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Evidence on file: <span className="font-semibold tabular-nums">{evidenceScore}%</span>
        </p>
      )}
    </SectionCard>
  )
}

function barTone(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-rose-500'
}
