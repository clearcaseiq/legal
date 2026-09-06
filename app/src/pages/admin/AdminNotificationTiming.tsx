/**
 * When outbound reminders and follow-ups go out.
 *
 * Every value here used to be a constant compiled into the sweep that used it,
 * so retuning a reminder meant a deploy. The fields are phrased as the decision
 * being made ("how long to wait before the report email") rather than as the
 * variable behind it, because the people who care about these numbers are the
 * ones answering the phone about them.
 *
 * The server clamps whatever it is sent and replies with what it applied, so
 * saving replaces the form rather than leaving the typed value on screen. That
 * is deliberate: a field that accepts 0 and quietly behaves like 10 is worse
 * than one that corrects itself in front of you.
 *
 * What is not here: whether a message is sent at all, and over which channel.
 * Those are consent decisions gated elsewhere, and an admin form is the wrong
 * place to overrule them.
 */

import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { PageHeader, EmptyState as InlineMessage } from '../../features/shared/ui'
import { getAdminNotificationTiming, saveAdminNotificationTiming } from '../../lib/api'
import {
  DEFAULT_NOTIFICATION_TIMING,
  formatMinutes,
  type NotificationTimingConfig,
} from '../../lib/notification-timing'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function NumberField({
  label,
  help,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  help?: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputClass}
      />
      {help && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{help}</span>}
    </label>
  )
}

export default function AdminNotificationTiming() {
  const [config, setConfig] = useState<NotificationTimingConfig>(DEFAULT_NOTIFICATION_TIMING)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    getAdminNotificationTiming()
      .then((data) => {
        if (!cancelled) {
          setConfig(data)
          setError(null)
        }
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.response?.data?.error || e?.message || 'Failed to load notification timing.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const update = (updates: Partial<NotificationTimingConfig>) => {
    setConfig((current) => ({ ...current, ...updates }))
    setSavedAt(null)
  }

  const offsets = config.appointmentReminderOffsetsMinutes

  /**
   * Warn before saving rather than after, because the server resolves these by
   * dropping a reminder — which is a silent change to what claimants receive.
   */
  const validationError = useMemo(() => {
    if (offsets.length === 0) return 'Add at least one consultation reminder, or the reminders stop entirely.'
    if (offsets.some((minutes) => !Number.isFinite(minutes) || minutes <= 0)) {
      return 'Consultation reminders must be a positive number of minutes before the appointment.'
    }
    const sorted = [...offsets].sort((a, b) => b - a)
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i - 1] - sorted[i] < config.appointmentReminderCatchWindowMinutes) {
        return `Two reminders are less than ${config.appointmentReminderCatchWindowMinutes} minutes apart, so only the earlier one would be sent. Space them further apart or lower the catch-up window.`
      }
    }
    return null
  }, [offsets, config.appointmentReminderCatchWindowMinutes])

  const handleSave = async () => {
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    try {
      // Replaced, not merged: the response is what the sweeps will use.
      setConfig(await saveAdminNotificationTiming(config))
      setSavedAt(Date.now())
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save notification timing. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader title="Notification timing" />
        <div className="surface-panel p-4">
          <InlineMessage message="Loading notification timing…" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Notification timing"
        description="When automated emails and texts go out. Changes apply without a deploy, and affect messages scheduled from that point on."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setConfig(DEFAULT_NOTIFICATION_TIMING)
                setSavedAt(null)
              }}
              className="btn-outline text-ui-sm"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || Boolean(validationError)}
              className="btn-primary text-ui-sm"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      />

      {(error || validationError) && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {validationError || error}
        </div>
      )}
      {savedAt && !error && !validationError && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          Notification timing saved. New messages use these values immediately.
        </div>
      )}

      <div className="mt-6 space-y-6">
        <Section
          title="Consultation reminders"
          description="Sent to the claimant before a booked consultation. One message per entry."
        >
          <div className="space-y-2">
            {offsets.map((minutes, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={30 * 24 * 60}
                  value={minutes}
                  onChange={(e) => {
                    const next = [...offsets]
                    next[index] = Number(e.target.value)
                    update({ appointmentReminderOffsetsMinutes: next })
                  }}
                  className={`${inputClass} mt-0 max-w-[10rem]`}
                />
                <span className="flex-1 text-sm text-slate-600 dark:text-slate-400">
                  minutes before — {formatMinutes(minutes)} ahead
                </span>
                <button
                  type="button"
                  onClick={() =>
                    update({ appointmentReminderOffsetsMinutes: offsets.filter((_, i) => i !== index) })
                  }
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                  aria-label={`Remove the reminder ${formatMinutes(minutes)} before`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => update({ appointmentReminderOffsetsMinutes: [...offsets, 60] })}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
            >
              <Plus className="h-4 w-4" /> Add a reminder
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Catch-up window (minutes)"
              help="How late a reminder may still be sent if the scheduler steps over its exact time. Must stay above the 5-minute sweep interval."
              value={config.appointmentReminderCatchWindowMinutes}
              min={5}
              max={120}
              onChange={(value) => update({ appointmentReminderCatchWindowMinutes: value })}
            />
          </div>
        </Section>

        <Section
          title="Case report email"
          description="Sent after someone finishes an assessment. The wait exists so that submitting right away replaces this email with the submission receipt rather than sending both."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Delay before sending (minutes)"
              help="Set to 0 to send as soon as the assessment is finished."
              value={config.reportReadyDelayMinutes}
              min={0}
              max={24 * 60}
              onChange={(value) => update({ reportReadyDelayMinutes: value })}
            />
          </div>
        </Section>

        <Section
          title="Unfinished assessment follow-up"
          description="A single reminder to someone who started an assessment and left. Currently held behind a separate switch pending SB 37 advertising review, so these values take effect only once that outreach is turned on."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Idle before it counts as abandoned (minutes)"
              help="Long enough that it does not fire while someone is still filling in the form."
              value={config.intakeAbandonmentAfterMinutes}
              min={5}
              max={7 * 24 * 60}
              onChange={(value) => update({ intakeAbandonmentAfterMinutes: value })}
            />
            <NumberField
              label="Stop following up after (hours)"
              help="Older intents are not contacted at all."
              value={config.intakeAbandonmentWindowHours}
              min={1}
              max={30 * 24}
              onChange={(value) => update({ intakeAbandonmentWindowHours: value })}
            />
          </div>
        </Section>

        <Section
          title="Attorney response warning"
          description="A heads-up to an attorney whose window to accept a matched case is nearly up. The window itself is set under Matching rules."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Warn with this much of the window left"
              help="A share of the response window — 0.2 warns with the last fifth remaining."
              value={config.offerExpiryWarningFraction}
              min={0.01}
              max={0.9}
              step={0.05}
              onChange={(value) => update({ offerExpiryWarningFraction: value })}
            />
            <NumberField
              label="Minimum notice (minutes)"
              help="Used when the share above would leave too little time to act on."
              value={config.offerExpiryWarningFloorMinutes}
              min={1}
              max={24 * 60}
              onChange={(value) => update({ offerExpiryWarningFloorMinutes: value })}
            />
          </div>
        </Section>
      </div>
    </div>
  )
}
