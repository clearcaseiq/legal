import { Badge, BackButton } from '../../../features/shared/ui'
import type { AssistanceQueueRow } from '../../../lib/api'
import { formatClaimType } from '../../../lib/claimTypes'
import {
  ASSISTANCE_PHASE_LABELS,
  ASSISTANCE_STATUS_LABELS,
  ASSISTANCE_STATUS_TONES,
  humanize,
  readinessTone,
  timeAgo,
} from '../assistanceLabels'

/**
 * Who this is, where both workflows stand, and what to do — above the fold.
 *
 * The screen this replaced opened with a breadcrumb, a title and a compliance
 * banner deep enough to push the claimant's phone number below the fold, so the
 * first thing a specialist did on every case was scroll. Identity and the two
 * statuses are the answer to "what am I looking at", so they are the header, and
 * the header sticks: the actions have to stay reachable from the bottom of a
 * long tab.
 *
 * Two statuses rather than one because they are genuinely independent. Attorney
 * routing runs whether or not intake is finished, and specialists were reading a
 * single "status" as though finishing assistance gated the attorney handoff.
 */
export function CaseHeader({
  assistance,
  contact,
  readinessScore,
  onBack,
  onAction,
}: {
  assistance: AssistanceQueueRow
  contact: { email: string | null; phone: string | null; city: string | null }
  readinessScore: number | null
  onBack: () => void
  onAction: (action: 'call' | 'email' | 'docs') => void
}) {
  const location = [contact.city || assistance.venueCounty].filter(Boolean).join(', ')

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackButton onClick={onBack} label="Case Assistance" />
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {assistance.referenceCode || assistance.id.slice(0, 8)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-slate-900 dark:text-slate-100">
            {assistance.plaintiffName || assistance.caseName}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {[formatClaimType(assistance.claimType), location, `Submitted ${timeAgo(assistance.createdAt)}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {readinessScore != null && (
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Readiness
            </p>
            <Badge tone={readinessTone(readinessScore)}>{readinessScore}%</Badge>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
        <StatusPair label="Attorney review" value={ASSISTANCE_PHASE_LABELS[assistance.phase]} tone="neutral" />
        <StatusPair
          label="Assistance"
          value={ASSISTANCE_STATUS_LABELS[assistance.status] ?? assistance.status}
          tone={ASSISTANCE_STATUS_TONES[assistance.status] ?? 'neutral'}
        />
        <span className="text-slate-500 dark:text-slate-400">
          Assigned: <span className="text-slate-700 dark:text-slate-300">
            {assistance.assignedSpecialist?.name || 'Unassigned'}
          </span>
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          Last contact: <span className="text-slate-700 dark:text-slate-300">
            {assistance.lastContactAt ? timeAgo(assistance.lastContactAt) : 'Never'}
          </span>
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <HeaderAction
          label="Call"
          href={contact.phone ? `tel:${contact.phone}` : undefined}
          disabled={!contact.phone}
          disabledTitle="No phone number on file"
          onClick={() => onAction('call')}
        />
        {/* Kept visible but inert: there is no send-SMS endpoint for assistance,
            and texting claimants stayed off until claimant-side opt-out was
            handled. Hiding it invites the same question on every case. */}
        <HeaderAction label="SMS" disabled disabledTitle="Texting claimants is not enabled yet" />
        <HeaderAction
          label="Email"
          disabled={!contact.email}
          disabledTitle="No email address on file"
          onClick={() => onAction('email')}
        />
        <HeaderAction
          label="Request documents"
          disabled={!contact.email}
          disabledTitle="No email address on file"
          onClick={() => onAction('docs')}
        />
      </div>

      {assistance.manualReviewStatus === 'pending' && (
        <p className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <span aria-hidden="true">⚠</span>
          <span className="font-semibold">Manual review hold</span>
          {assistance.manualReviewReason && <span>· {humanize(assistance.manualReviewReason)}</span>}
          <span className="text-amber-700 dark:text-amber-400">
            · Attorney routing is paused. Check with the review team before promising a next step.
          </span>
        </p>
      )}
    </div>
  )
}

function StatusPair({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'neutral' | 'brand' | 'blue' | 'success' | 'warning' | 'danger'
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-slate-500 dark:text-slate-400">{label}:</span>
      <Badge tone={tone}>{value}</Badge>
    </span>
  )
}

function HeaderAction({
  label,
  href,
  disabled,
  disabledTitle,
  onClick,
}: {
  label: string
  href?: string
  disabled?: boolean
  disabledTitle?: string
  onClick?: () => void
}) {
  const className =
    'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'

  // An anchor when there is somewhere to go, so the dialer opens from a real
  // link rather than a click handler the browser cannot preview.
  if (href && !disabled) {
    return (
      <a className={className} href={href} onClick={onClick}>
        {label}
      </a>
    )
  }
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
