/**
 * Attorney "Scheduling" settings — the control panel behind the public
 * ("Calendly-style") booking link. Attorneys set their weekly availability,
 * timezone, and bookable event types here, then share their /book/:slug link.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  List,
  Pencil,
  Plus,
  Trash2,
  Video,
  Phone,
  MapPin,
} from 'lucide-react'
import {
  getSchedulingSettings,
  updateSchedulingSettings,
  updateSchedulingAvailability,
  createEventType,
  updateEventType,
  deleteEventType,
  type SchedulingSettings,
  type SchedulingAvailabilityDay,
  type SchedulingEventType,
  type BookingLocationType,
} from '../../lib/api'
import { PageHeader, SectionCard, EmptyState, Badge } from '../shared/ui'

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
]

function allTimezones(): string[] {
  try {
    // @ts-expect-error supportedValuesOf is available in modern browsers
    const all: string[] = Intl.supportedValuesOf?.('timeZone') || []
    if (all.length) return all
  } catch {
    /* fall through */
  }
  return COMMON_TIMEZONES
}

const LOCATION_META: Record<BookingLocationType, { label: string; icon: typeof Video }> = {
  video: { label: 'Video call', icon: Video },
  phone: { label: 'Phone call', icon: Phone },
  in_person: { label: 'In person', icon: MapPin },
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h} hr`
}

export default function SchedulingSettingsPage() {
  const [settings, setSettings] = useState<SchedulingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSchedulingSettings()
      setSettings(data)
      setError(null)
    } catch {
      setError('Could not load your scheduling settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Scheduling" description="Loading…" />
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="space-y-6">
        <PageHeader title="Scheduling" />
        <EmptyState message={error || 'No scheduling settings found.'} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduling"
        description="Share one link and let clients book consultations on your open times. Bookings sync to your calendar and create a Zoom link automatically."
      />
      <ShareLinkCard settings={settings} onChange={load} />
      <div className="grid gap-6 lg:grid-cols-2">
        <AvailabilityCard settings={settings} onSaved={load} />
        <EventTypesCard settings={settings} onChanged={load} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Share link + timezone                                                      */
/* -------------------------------------------------------------------------- */

function ShareLinkCard({ settings, onChange }: { settings: SchedulingSettings; onChange: () => void }) {
  const [copied, setCopied] = useState(false)
  const [tz, setTz] = useState(settings.attorney.timezone)
  const [savingTz, setSavingTz] = useState(false)
  const tzOptions = useMemo(() => allTimezones(), [])

  // Slug editing. The URL prefix is everything up to the final path segment.
  const linkPrefix = useMemo(() => {
    const url = settings.attorney.publicUrl
    return url.slice(0, url.lastIndexOf('/') + 1)
  }, [settings.attorney.publicUrl])
  const [editingSlug, setEditingSlug] = useState(false)
  const [slugValue, setSlugValue] = useState(settings.attorney.bookingSlug)
  const [slugErr, setSlugErr] = useState<string | null>(null)
  const [savingSlug, setSavingSlug] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(settings.attorney.publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const saveTz = async (next: string) => {
    setTz(next)
    setSavingTz(true)
    try {
      await updateSchedulingSettings({ timezone: next })
      onChange()
    } finally {
      setSavingTz(false)
    }
  }

  const startEditSlug = () => {
    setSlugValue(settings.attorney.bookingSlug)
    setSlugErr(null)
    setEditingSlug(true)
  }

  const saveSlug = async () => {
    const next = slugValue.trim()
    if (next.length < 3 || !/^[a-z0-9-]+$/.test(next)) {
      setSlugErr('Use at least 3 lowercase letters, numbers or dashes.')
      return
    }
    if (next === settings.attorney.bookingSlug) {
      setEditingSlug(false)
      return
    }
    setSavingSlug(true)
    setSlugErr(null)
    try {
      await updateSchedulingSettings({ bookingSlug: next })
      setEditingSlug(false)
      onChange()
    } catch (e: any) {
      setSlugErr(e?.response?.data?.error || 'Could not update your link.')
    } finally {
      setSavingSlug(false)
    }
  }

  return (
    <SectionCard title="Your booking link">
      <div className="flex flex-col gap-4">
        {editingSlug ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="shrink-0 text-sm text-slate-400">{linkPrefix}</span>
                <input
                  autoFocus
                  value={slugValue}
                  onChange={(e) =>
                    setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={saveSlug}
                disabled={savingSlug}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {savingSlug ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingSlug(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
            {slugErr && <p className="mt-2 text-sm text-red-600">{slugErr}</p>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <CalendarClock className="h-4 w-4 shrink-0 text-indigo-500" />
              <span className="truncate text-sm text-slate-700">{settings.attorney.publicUrl}</span>
            </div>
            <button
              type="button"
              onClick={startEditSlug}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={settings.attorney.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              Preview
            </a>
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm sm:max-w-xs">
          <span className="font-medium text-slate-700">Time zone {savingTz && <span className="text-slate-400">· saving…</span>}</span>
          <select
            value={tz}
            onChange={(e) => saveTz(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {!tzOptions.includes(tz) && <option value={tz}>{tz}</option>}
            {tzOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">Your weekly hours below are in this time zone.</span>
        </label>
      </div>
    </SectionCard>
  )
}

/* -------------------------------------------------------------------------- */
/* Weekly availability                                                        */
/* -------------------------------------------------------------------------- */

type EditableDay = { dayOfWeek: number; label: string; isAvailable: boolean; slots: { startTime: string; endTime: string }[] }

function normalizeDays(availability: SchedulingAvailabilityDay[]): EditableDay[] {
  return availability.map((d) => ({
    dayOfWeek: d.dayOfWeek,
    label: d.label,
    isAvailable: d.isAvailable,
    slots:
      d.slots && d.slots.length > 0
        ? d.slots.map((s) => ({ startTime: s.startTime, endTime: s.endTime }))
        : [{ startTime: '09:00', endTime: '17:00' }],
  }))
}

function AvailabilityCard({ settings, onSaved }: { settings: SchedulingSettings; onSaved: () => void }) {
  const [days, setDays] = useState<EditableDay[]>(() => normalizeDays(settings.availability))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copyFrom, setCopyFrom] = useState<number | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  useEffect(() => setDays(normalizeDays(settings.availability)), [settings.availability])

  const mutateDay = (dayOfWeek: number, fn: (d: EditableDay) => EditableDay) => {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? fn(d) : d)))
    setSaved(false)
  }

  const toggleDay = (dayOfWeek: number, checked: boolean) =>
    mutateDay(dayOfWeek, (d) => ({
      ...d,
      isAvailable: checked,
      slots: checked && d.slots.length === 0 ? [{ startTime: '09:00', endTime: '17:00' }] : d.slots,
    }))

  const patchSlot = (dayOfWeek: number, idx: number, next: Partial<{ startTime: string; endTime: string }>) =>
    mutateDay(dayOfWeek, (d) => ({
      ...d,
      slots: d.slots.map((s, i) => (i === idx ? { ...s, ...next } : s)),
    }))

  const addSlot = (dayOfWeek: number) =>
    mutateDay(dayOfWeek, (d) => {
      const last = d.slots[d.slots.length - 1]
      // Suggest a slot after the last one (or a default afternoon block).
      const next = last ? { startTime: last.endTime, endTime: bumpHour(last.endTime, 1) } : { startTime: '13:00', endTime: '17:00' }
      return { ...d, isAvailable: true, slots: [...d.slots, next] }
    })

  const removeSlot = (dayOfWeek: number, idx: number) =>
    mutateDay(dayOfWeek, (d) => {
      const slots = d.slots.filter((_, i) => i !== idx)
      return { ...d, slots, isAvailable: slots.length > 0 ? d.isAvailable : false }
    })

  const copyToDays = (fromDow: number, targetDows: number[]) => {
    const source = days.find((d) => d.dayOfWeek === fromDow)
    if (!source) return
    setDays((prev) =>
      prev.map((d) =>
        targetDows.includes(d.dayOfWeek)
          ? { ...d, isAvailable: source.isAvailable, slots: source.slots.map((s) => ({ ...s })) }
          : d,
      ),
    )
    setCopyFrom(null)
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setErr(null)
    try {
      await updateSchedulingAvailability(
        days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isAvailable: d.isAvailable && d.slots.length > 0,
          slots: d.isAvailable ? d.slots.map((s) => ({ startTime: s.startTime, endTime: s.endTime })) : [],
        })),
      )
      setSaved(true)
      onSaved()
      setTimeout(() => setSaved(false), 1800)
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not save your hours.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard title="Weekly hours">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500">
          Add one or more time windows per day (e.g. a morning and an afternoon block). Use “Copy” to apply a
          day’s hours to other days.
        </p>
        <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 ${
              view === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={`inline-flex items-center gap-1 border-l border-slate-200 px-2.5 py-1.5 ${
              view === 'calendar' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>
      </div>
      {view === 'calendar' && (
        <WeekAvailabilityGrid
          days={days}
          onAddSlot={addSlot}
          onRemoveSlot={removeSlot}
        />
      )}
      <div className={`space-y-2 ${view === 'calendar' ? 'hidden' : ''}`}>
        {days.map((d) => (
          <div key={d.dayOfWeek} className="rounded-lg border border-slate-100 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <label className="flex w-28 shrink-0 items-center gap-2 pt-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={d.isAvailable}
                  onChange={(e) => toggleDay(d.dayOfWeek, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span className={d.isAvailable ? 'font-medium text-slate-800' : 'text-slate-400'}>
                  {d.label.slice(0, 3)}
                </span>
              </label>

              <div className="min-w-0 flex-1">
                {!d.isAvailable ? (
                  <span className="inline-block pt-1.5 text-sm text-slate-400">Unavailable</span>
                ) : (
                  <div className="space-y-1.5">
                    {d.slots.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <input
                          type="time"
                          value={s.startTime}
                          onChange={(e) => patchSlot(d.dayOfWeek, i, { startTime: e.target.value })}
                          className="rounded-lg border border-slate-200 px-2 py-1"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          value={s.endTime}
                          onChange={(e) => patchSlot(d.dayOfWeek, i, { endTime: e.target.value })}
                          className="rounded-lg border border-slate-200 px-2 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeSlot(d.dayOfWeek, i)}
                          className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Remove time slot"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addSlot(d.dayOfWeek)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add time slot
                    </button>
                  </div>
                )}
              </div>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setCopyFrom(copyFrom === d.dayOfWeek ? null : d.dayOfWeek)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  title="Copy these hours to other days"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                {copyFrom === d.dayOfWeek && (
                  <CopyToPopover
                    fromDow={d.dayOfWeek}
                    days={days}
                    onApply={(targets) => copyToDays(d.dayOfWeek, targets)}
                    onClose={() => setCopyFrom(null)}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saved ? <Check className="h-4 w-4" /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save hours'}
        </button>
      </div>
    </SectionCard>
  )
}

// Add one hour to an "HH:MM" string, clamped to 23:59.
function bumpHour(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10))
  const total = Math.min(h * 60 + m + hours * 60, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function CopyToPopover({
  fromDow,
  days,
  onApply,
  onClose,
}: {
  fromDow: number
  days: EditableDay[]
  onApply: (targets: number[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<number[]>([])
  const targets = days.filter((d) => d.dayOfWeek !== fromDow)
  const toggle = (dow: number) =>
    setSelected((prev) => (prev.includes(dow) ? prev.filter((x) => x !== dow) : [...prev, dow]))
  return (
    <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
      <p className="px-1 pb-1 text-xs font-semibold text-slate-500">Copy to…</p>
      <div className="max-h-48 overflow-y-auto">
        {targets.map((d) => (
          <label key={d.dayOfWeek} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selected.includes(d.dayOfWeek)}
              onChange={() => toggle(d.dayOfWeek)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
            />
            {d.label}
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700">
          Cancel
        </button>
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={() => onApply(selected)}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

// Weekly calendar grid visualization of availability. Blocks are positioned by
// time; each day column has a quick "add" affordance and each block a hover
// delete. Fine time edits stay in the List view.
function WeekAvailabilityGrid({
  days,
  onAddSlot,
  onRemoveSlot,
}: {
  days: EditableDay[]
  onAddSlot: (dayOfWeek: number) => void
  onRemoveSlot: (dayOfWeek: number, idx: number) => void
}) {
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10))
    return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m)
  }
  const label12 = (min: number) => {
    const h24 = Math.floor(min / 60)
    const m = min % 60
    const isPm = h24 >= 12
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12
    return m === 0 ? `${h12} ${isPm ? 'PM' : 'AM'}` : `${h12}:${String(m).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`
  }

  // Visible time range: default 8am–6pm, expanded to include every slot.
  let minStart = 8 * 60
  let maxEnd = 18 * 60
  for (const d of days) {
    if (!d.isAvailable) continue
    for (const s of d.slots) {
      minStart = Math.min(minStart, toMin(s.startTime))
      maxEnd = Math.max(maxEnd, toMin(s.endTime))
    }
  }
  minStart = Math.floor(minStart / 60) * 60
  maxEnd = Math.ceil(maxEnd / 60) * 60
  if (maxEnd <= minStart) maxEnd = minStart + 60

  const HOUR_PX = 44
  const pxPerMin = HOUR_PX / 60
  const bodyHeight = (maxEnd - minStart) * pxPerMin
  const hours: number[] = []
  for (let h = minStart; h <= maxEnd; h += 60) hours.push(h)

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[560px]">
        {/* Day headers */}
        <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, minmax(0, 1fr))' }}>
          <div />
          {days.map((d) => (
            <div
              key={`h-${d.dayOfWeek}`}
              className={`pb-1 text-center text-xs font-semibold ${
                d.isAvailable ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              {d.label.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, minmax(0, 1fr))' }}>
          {/* Time gutter */}
          <div className="relative" style={{ height: bodyHeight }}>
            {hours.map((h) => (
              <div
                key={`t-${h}`}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-slate-400"
                style={{ top: (h - minStart) * pxPerMin }}
              >
                {h < maxEnd ? label12(h) : ''}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => (
            <div
              key={`c-${d.dayOfWeek}`}
              className="group/col relative border-l border-slate-100"
              style={{ height: bodyHeight }}
            >
              {hours.map((h) => (
                <div
                  key={`g-${d.dayOfWeek}-${h}`}
                  className="absolute inset-x-0 border-t border-slate-100"
                  style={{ top: (h - minStart) * pxPerMin }}
                />
              ))}

              {d.isAvailable &&
                d.slots.map((s, i) => {
                  const top = (toMin(s.startTime) - minStart) * pxPerMin
                  const height = Math.max((toMin(s.endTime) - toMin(s.startTime)) * pxPerMin, 16)
                  return (
                    <div
                      key={`b-${d.dayOfWeek}-${i}`}
                      className="group/blk absolute inset-x-1 overflow-hidden rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] leading-tight text-indigo-700 shadow-sm"
                      style={{ top, height }}
                      title={`${label12(toMin(s.startTime))} – ${label12(toMin(s.endTime))}`}
                    >
                      <span className="block truncate font-medium">
                        {label12(toMin(s.startTime))}
                      </span>
                      <span className="block truncate text-indigo-500">
                        {label12(toMin(s.endTime))}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveSlot(d.dayOfWeek, i)}
                        className="absolute right-0.5 top-0.5 hidden rounded bg-white/80 p-0.5 text-rose-500 hover:bg-white group-hover/blk:block"
                        aria-label="Remove time slot"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}

              <button
                type="button"
                onClick={() => onAddSlot(d.dayOfWeek)}
                className="absolute inset-x-1 bottom-0.5 hidden items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-white/70 py-0.5 text-[10px] font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 group-hover/col:flex"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Hover a day to add a slot, or a block to remove it. Switch to List view to fine-tune exact times.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Event types                                                                */
/* -------------------------------------------------------------------------- */

const BLANK_EVENT: Partial<SchedulingEventType> = {
  name: '',
  durationMinutes: 30,
  locationType: 'video',
  description: '',
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  minNoticeMinutes: 120,
  isActive: true,
}

function EventTypesCard({ settings, onChanged }: { settings: SchedulingSettings; onChanged: () => void }) {
  const [editing, setEditing] = useState<Partial<SchedulingEventType> | null>(null)

  return (
    <SectionCard
      title="Meeting types"
      trailing={
        <button
          type="button"
          onClick={() => setEditing({ ...BLANK_EVENT })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add type
        </button>
      }
    >
      {settings.eventTypes.length === 0 && !editing ? (
        <EmptyState message="No meeting types yet. Add one (e.g. “15-min intro call”) so clients can book you." />
      ) : (
        <div className="space-y-2">
          {settings.eventTypes.map((et) => {
            const meta = LOCATION_META[et.locationType]
            const Icon = meta.icon
            return (
              <div
                key={et.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800">{et.name}</span>
                    {!et.isActive && <Badge tone="warning">Hidden</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span>{formatDuration(et.durationMinutes)}</span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(et)}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Delete "${et.name}"?`)) return
                      await deleteEventType(et.id)
                      onChanged()
                    }}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <EventTypeForm
          value={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}
    </SectionCard>
  )
}

function EventTypeForm({
  value,
  onCancel,
  onSaved,
}: {
  value: Partial<SchedulingEventType>
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<SchedulingEventType>>(value)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const isEdit = Boolean(value.id)

  const set = <K extends keyof SchedulingEventType>(key: K, v: SchedulingEventType[K]) =>
    setForm((prev) => ({ ...prev, [key]: v }))

  const save = async () => {
    if (!form.name?.trim()) {
      setErr('Give this meeting type a name.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        durationMinutes: Number(form.durationMinutes) || 30,
        locationType: (form.locationType || 'video') as BookingLocationType,
        location: form.location || undefined,
        bufferBeforeMinutes: Number(form.bufferBeforeMinutes) || 0,
        bufferAfterMinutes: Number(form.bufferAfterMinutes) || 0,
        minNoticeMinutes: Number(form.minNoticeMinutes) || 0,
        isActive: form.isActive ?? true,
      }
      if (isEdit && value.id) await updateEventType(value.id, payload)
      else await createEventType(payload)
      onSaved()
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not save this meeting type.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <h3 className="text-sm font-semibold text-slate-800">{isEdit ? 'Edit meeting type' : 'New meeting type'}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Name</span>
          <input
            value={form.name || ''}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. 30-min case consultation"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Duration (minutes)</span>
          <input
            type="number"
            min={10}
            max={240}
            value={form.durationMinutes ?? 30}
            onChange={(e) => set('durationMinutes', Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Location</span>
          <select
            value={form.locationType || 'video'}
            onChange={(e) => set('locationType', e.target.value as BookingLocationType)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="video">Video call (Zoom)</option>
            <option value="phone">Phone call</option>
            <option value="in_person">In person</option>
          </select>
        </label>
        {form.locationType !== 'video' && (
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">
              {form.locationType === 'in_person' ? 'Address' : 'Phone / dial-in note'}
            </span>
            <input
              value={form.location || ''}
              onChange={(e) => set('location', e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Description (optional)</span>
          <textarea
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Buffer after (min)</span>
          <input
            type="number"
            min={0}
            max={120}
            value={form.bufferAfterMinutes ?? 0}
            onChange={(e) => set('bufferAfterMinutes', Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Min. notice (min)</span>
          <input
            type="number"
            min={0}
            value={form.minNoticeMinutes ?? 120}
            onChange={(e) => set('minNoticeMinutes', Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isActive ?? true}
            onChange={(e) => set('isActive', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <span className="text-slate-700">Visible on booking page</span>
        </label>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
