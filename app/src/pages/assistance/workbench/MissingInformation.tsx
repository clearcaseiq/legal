import { Badge, EmptyState, SectionCard } from '../../../features/shared/ui'
import type { AssistanceGap } from '../../../lib/api'
import { humanize } from '../assistanceLabels'

type Tier = { key: string; label: string; tone: 'danger' | 'warning' | 'neutral'; gaps: AssistanceGap[] }

/**
 * What the file is missing, ranked, and split by how you get it.
 *
 * Two things were tangled together before: answers a specialist takes on a call
 * and documents somebody has to send. They are different jobs with different
 * turnaround, so each gap says which it is rather than leaving the specialist to
 * infer it from the wording.
 */
export function MissingInformation({
  gaps,
  onAsk,
  onRequestDocuments,
}: {
  gaps: AssistanceGap[]
  onAsk: () => void
  onRequestDocuments: () => void
}) {
  const allTiers: Tier[] = [
    { key: 'critical', label: 'Critical', tone: 'danger', gaps: gaps.filter((gap) => gap.severity >= 4) },
    {
      key: 'important',
      label: 'Important',
      tone: 'warning',
      gaps: gaps.filter((gap) => gap.severity >= 2 && gap.severity < 4),
    },
    { key: 'helpful', label: 'Helpful', tone: 'neutral', gaps: gaps.filter((gap) => gap.severity < 2) },
  ]
  const tiers = allTiers.filter((tier) => tier.gaps.length > 0)

  if (tiers.length === 0) {
    return (
      <SectionCard title="Missing information">
        <EmptyState message="Nothing outstanding. This case is ready to hand over." />
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Missing information">
      <div className="space-y-5">
        {tiers.map((tier) => (
          <div key={tier.key}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {tier.label}
              <Badge tone={tier.tone}>{tier.gaps.length}</Badge>
            </p>
            <ul className="mt-2 space-y-2.5">
              {tier.gaps.map((gap) => (
                <li key={gap.key} className="flex gap-2.5">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      tier.tone === 'danger'
                        ? 'bg-rose-500'
                        : tier.tone === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{gap.label}</p>
                    {gap.rationale && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{gap.rationale}</p>
                    )}
                    <button
                      type="button"
                      onClick={gap.requestedDoc ? onRequestDocuments : onAsk}
                      className="mt-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {gap.requestedDoc ? `Request ${humanize(gap.requestedDoc).toLowerCase()}` : 'Ask the claimant'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
