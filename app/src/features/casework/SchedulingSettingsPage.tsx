/**
 * Attorney "Scheduling" settings — the control panel behind the public
 * ("Calendly-style") booking link. Attorneys set their weekly availability,
 * timezone, and bookable event types here, then share their /book/:slug link.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
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

function AvailabilityCard({ settings, onSaved }: { settings: SchedulingSettings; onSaved: () => void }) {
  const [days, setDays] = useState<SchedulingAvailabilityDay[]>(settings.availability)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => setDays(settings.availability), [settings.availability])

  const patch = (dayOfWeek: number, next: Partial<SchedulingAvailabilityDay>) => {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...next } : d)))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setErr(null)
    try {
      await updateSchedulingAvailability(
        days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isAvailable: d.isAvailable,
          startTime: d.startTime,
          endTime: d.endTime,
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
      <div className="space-y-2">
        {days.map((d) => (
          <div key={d.dayOfWeek} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
            <label className="flex w-28 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.isAvailable}
                onChange={(e) => patch(d.dayOfWeek, { isAvailable: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span className={d.isAvailable ? 'font-medium text-slate-800' : 'text-slate-400'}>{d.label.slice(0, 3)}</span>
            </label>
            {d.isAvailable ? (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="time"
                  value={d.startTime}
                  onChange={(e) => patch(d.dayOfWeek, { startTime: e.target.value })}
                  className="rounded-lg border border-slate-200 px-2 py-1"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="time"
                  value={d.endTime}
                  onChange={(e) => patch(d.dayOfWeek, { endTime: e.target.value })}
                  className="rounded-lg border border-slate-200 px-2 py-1"
                />
              </div>
            ) : (
              <span className="text-sm text-slate-400">Unavailable</span>
            )}
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
