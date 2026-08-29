import { useEffect, useState } from 'react'
import { CheckCircle, Clock, Filter, Gauge, Loader2, Wallet } from 'lucide-react'
import { ATTORNEY_CASE_TYPES, formatSpecialty } from '../../../lib/constants'
import { formatCurrency } from '../../../lib/formatters'
import { useAttorneyDecisionProfile } from '../useAttorneyDecisionProfile'
import type { AttorneyProfileModel, IntakeWindow } from '../attorneyProfileModel'

const INPUT =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
const CARD = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
const HEADING = 'text-lg font-semibold text-slate-900'
const LABEL = 'mb-1 block text-sm font-medium text-slate-700'

// `dayOfWeek` matches Date#getDay (0 = Sunday), which is what the routing scorer
// compares against.
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => (
  <option key={hour} value={hour}>
    {formatHour(hour)}
  </option>
))

function responseBadge(hours: number): string {
  if (hours <= 2) return 'Fast responder'
  if (hours <= 8) return 'Same-day replies'
  if (hours <= 24) return 'Replies within 24h'
  return 'Replies within a few days'
}

type Draft = Pick<
  AttorneyProfileModel,
  | 'minInjurySeverity'
  | 'minDamagesRange'
  | 'maxDamagesRange'
  | 'excludedCaseTypes'
  | 'maxCasesPerWeek'
  | 'maxCasesPerMonth'
  | 'intakeHours'
  | 'pricingModel'
  | 'paymentModel'
  | 'subscriptionTier'
  | 'responseTimeHours'
>

const toDraft = (p: AttorneyProfileModel): Draft => ({
  minInjurySeverity: p.minInjurySeverity,
  minDamagesRange: p.minDamagesRange,
  maxDamagesRange: p.maxDamagesRange,
  excludedCaseTypes: [...p.excludedCaseTypes],
  maxCasesPerWeek: p.maxCasesPerWeek,
  maxCasesPerMonth: p.maxCasesPerMonth,
  intakeHours: p.intakeHours === '24/7' ? '24/7' : p.intakeHours.map((w) => ({ ...w })),
  pricingModel: p.pricingModel,
  paymentModel: p.paymentModel,
  subscriptionTier: p.subscriptionTier,
  responseTimeHours: p.responseTimeHours,
})

type Props = {
  profile: AttorneyProfileModel
  saving: boolean
  onSave: (patch: Partial<AttorneyProfileModel>) => Promise<boolean>
}

/** What kinds of cases the attorney wants, how many, and when. */
export default function CasePreferencesTab({ profile, saving, onSave }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile))
  const [dirty, setDirty] = useState(false)
  const decision = useAttorneyDecisionProfile()

  useEffect(() => {
    if (dirty) return
    setDraft(toDraft(profile))
  }, [dirty, profile])

  const patch = (next: Partial<Draft>) => {
    setDirty(true)
    setDraft((current) => ({ ...current, ...next }))
  }

  const intakeAlwaysOn = draft.intakeHours === '24/7'
  const intakeWindows: IntakeWindow[] = intakeAlwaysOn ? [] : (draft.intakeHours as IntakeWindow[])

  /**
   * Switching off 24/7 seeds Mon-Fri 9-5 rather than an empty list. An empty list
   * is not "no restriction": routing reads it as a schedule with no open window,
   * so the attorney is scored as permanently outside intake hours.
   */
  const setIntakeAlwaysOn = (alwaysOn: boolean) =>
    patch({
      intakeHours: alwaysOn
        ? '24/7'
        : [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: 9, endTime: 17 })),
    })

  const toggleIntakeDay = (dayOfWeek: number) => {
    const exists = intakeWindows.some((w) => w.dayOfWeek === dayOfWeek)
    patch({
      intakeHours: exists
        ? intakeWindows.filter((w) => w.dayOfWeek !== dayOfWeek)
        : [...intakeWindows, { dayOfWeek, startTime: 9, endTime: 17 }].sort(
            (a, b) => a.dayOfWeek - b.dayOfWeek,
          ),
    })
  }

  const updateIntakeWindow = (dayOfWeek: number, windowPatch: Partial<IntakeWindow>) =>
    patch({
      intakeHours: intakeWindows.map((w) => (w.dayOfWeek === dayOfWeek ? { ...w, ...windowPatch } : w)),
    })

  const toggleExcluded = (caseType: string) =>
    patch({
      excludedCaseTypes: draft.excludedCaseTypes.includes(caseType)
        ? draft.excludedCaseTypes.filter((v) => v !== caseType)
        : [...draft.excludedCaseTypes, caseType],
    })

  const save = async () => {
    if (await onSave(draft)) setDirty(false)
  }

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Filter className="h-5 w-5" />
          </span>
          <div>
            <h3 className={HEADING}>Case Filters</h3>
            <p className="mt-0.5 text-sm text-slate-500">Cases outside these bounds are not routed to you.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={LABEL}>Minimum Injury Severity (0-4)</label>
            <input
              type="number"
              min={0}
              max={4}
              step={1}
              value={draft.minInjurySeverity ?? ''}
              onChange={(e) => {
                if (!e.target.value) return patch({ minInjurySeverity: null })
                const parsed = parseInt(e.target.value, 10)
                patch({ minInjurySeverity: Number.isFinite(parsed) ? Math.min(4, Math.max(0, parsed)) : null })
              }}
              className={INPUT}
              placeholder="No minimum"
            />
          </div>
          <div>
            <label className={LABEL}>Minimum Damages</label>
            <input
              type="number"
              min={0}
              max={100000000}
              value={draft.minDamagesRange ?? ''}
              onChange={(e) =>
                patch({
                  minDamagesRange: e.target.value
                    ? Math.min(100000000, Math.max(0, parseFloat(e.target.value)))
                    : null,
                })
              }
              className={INPUT}
              placeholder="No minimum"
            />
            {draft.minDamagesRange ? (
              <p className="mt-1 text-xs text-slate-400">{formatCurrency(draft.minDamagesRange)}</p>
            ) : null}
          </div>
          <div>
            <label className={LABEL}>Maximum Damages</label>
            <input
              type="number"
              min={0}
              max={100000000}
              value={draft.maxDamagesRange ?? ''}
              onChange={(e) =>
                patch({
                  maxDamagesRange: e.target.value
                    ? Math.min(100000000, Math.max(0, parseFloat(e.target.value)))
                    : null,
                })
              }
              className={INPUT}
              placeholder="No limit"
            />
            {draft.maxDamagesRange ? (
              <p className="mt-1 text-xs text-slate-400">{formatCurrency(draft.maxDamagesRange)}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <label className={LABEL}>Excluded Case Types</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ATTORNEY_CASE_TYPES.map((type) => (
              <label key={type.value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.excludedCaseTypes.includes(type.value)}
                  onChange={() => toggleExcluded(type.value)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">{formatSpecialty(type.value)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className={CARD}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Gauge className="h-5 w-5" />
          </span>
          <div>
            <h3 className={HEADING}>Capacity</h3>
            <p className="mt-0.5 text-sm text-slate-500">How much new work you can take, and when.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL}>Max Cases Per Week</label>
            <input
              type="number"
              min={0}
              max={1000}
              value={draft.maxCasesPerWeek ?? ''}
              onChange={(e) =>
                patch({
                  maxCasesPerWeek: e.target.value
                    ? Math.min(1000, Math.max(0, parseInt(e.target.value, 10)))
                    : null,
                })
              }
              className={INPUT}
              placeholder="No limit"
            />
          </div>
          <div>
            <label className={LABEL}>Max Cases Per Month</label>
            <input
              type="number"
              min={0}
              max={5000}
              value={draft.maxCasesPerMonth ?? ''}
              onChange={(e) =>
                patch({
                  maxCasesPerMonth: e.target.value
                    ? Math.min(5000, Math.max(0, parseInt(e.target.value, 10)))
                    : null,
                })
              }
              className={INPUT}
              placeholder="No limit"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className={LABEL}>Intake Hours</label>
          <p className="mb-2 text-xs text-slate-500">When new cases can be routed to you.</p>
          <div className="mb-3 flex gap-6">
            <label className="flex cursor-pointer items-center space-x-2">
              <input
                type="radio"
                name="intakeAvailability"
                checked={intakeAlwaysOn}
                onChange={() => setIntakeAlwaysOn(true)}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-700">Accept intakes 24/7</span>
            </label>
            <label className="flex cursor-pointer items-center space-x-2">
              <input
                type="radio"
                name="intakeAvailability"
                checked={!intakeAlwaysOn}
                onChange={() => setIntakeAlwaysOn(false)}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-700">Specific hours</span>
            </label>
          </div>
          {!intakeAlwaysOn && (
            <div className="space-y-2">
              {DAY_LABELS.map((label, dayOfWeek) => {
                const window = intakeWindows.find((w) => w.dayOfWeek === dayOfWeek)
                return (
                  <div key={dayOfWeek} className="flex items-center gap-3">
                    <label className="flex w-24 cursor-pointer items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={Boolean(window)}
                        onChange={() => toggleIntakeDay(dayOfWeek)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                    {window && (
                      <div className="flex items-center gap-2">
                        <select
                          value={window.startTime}
                          onChange={(e) =>
                            updateIntakeWindow(dayOfWeek, { startTime: parseInt(e.target.value, 10) })
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          aria-label={`${label} start hour`}
                        >
                          {HOUR_OPTIONS}
                        </select>
                        <span className="text-sm text-slate-500">to</span>
                        <select
                          value={window.endTime}
                          onChange={(e) =>
                            updateIntakeWindow(dayOfWeek, { endTime: parseInt(e.target.value, 10) })
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          aria-label={`${label} end hour`}
                        >
                          {HOUR_OPTIONS}
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
              {intakeWindows.length === 0 && (
                <p className="text-xs text-amber-700">
                  Pick at least one day, or cases will never look routable to you.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={CARD}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <h3 className={HEADING}>Response Commitment</h3>
            <p className="mt-0.5 text-sm text-slate-500">This drives the badge plaintiffs see on your profile.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL}>Response Time Commitment (hours)</label>
            <input
              type="number"
              min={1}
              max={72}
              value={draft.responseTimeHours}
              onChange={(e) => patch({ responseTimeHours: Math.max(1, Number(e.target.value) || 24) })}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Public Badge Preview</label>
            <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
              <Clock className="mr-2 h-4 w-4" />
              {responseBadge(draft.responseTimeHours)}
            </div>
          </div>
        </div>
      </div>

      <div className={CARD}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <h3 className={HEADING}>Buying Preferences</h3>
            <p className="mt-0.5 text-sm text-slate-500">How you prefer to pay for the cases you take.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={LABEL}>Pricing Model</label>
            <select
              value={draft.pricingModel || ''}
              onChange={(e) => patch({ pricingModel: e.target.value || null })}
              className={INPUT}
            >
              <option value="">Select...</option>
              <option value="fixed_price">Fixed Price</option>
              <option value="auction">Auction</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Payment Model</label>
            <select
              value={draft.paymentModel || ''}
              onChange={(e) => patch({ paymentModel: e.target.value || null })}
              className={INPUT}
            >
              <option value="">Select...</option>
              <option value="subscription">Subscription</option>
              <option value="pay_per_case">Pay Per Case</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Subscription Tier</label>
            <select
              value={draft.subscriptionTier || ''}
              onChange={(e) => patch({ subscriptionTier: e.target.value || null })}
              className={INPUT}
            >
              <option value="">Select...</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {/* Stored separately from the profile, so it saves on its own. */}
      <div className={CARD}>
        <h3 className={HEADING}>Decision Profile</h3>
        <p className="mt-0.5 text-sm text-slate-500">
          Used when ClearCaseIQ drafts negotiation guidance on your cases.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL}>Negotiation Style</label>
            <select
              value={decision.negotiationStyle}
              onChange={(e) => decision.setNegotiationStyle(e.target.value)}
              className={INPUT}
            >
              <option value="">Select style</option>
              <option value="assertive">Assertive</option>
              <option value="collaborative">Collaborative</option>
              <option value="data-driven">Data-driven</option>
              <option value="relationship-led">Relationship-led</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Risk Tolerance</label>
            <select
              value={decision.riskTolerance}
              onChange={(e) => decision.setRiskTolerance(e.target.value)}
              className={INPUT}
            >
              <option value="">Select tolerance</option>
              <option value="low">Low (protect downside)</option>
              <option value="balanced">Balanced</option>
              <option value="high">High (maximize upside)</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void decision.handleSaveDecisionProfile()}
            disabled={decision.decisionProfileLoading}
            className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            {decision.decisionProfileLoading ? 'Saving…' : 'Save Decision Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
