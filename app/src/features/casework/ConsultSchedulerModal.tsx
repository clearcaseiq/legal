import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Check, Link2, Loader2, MapPin, Phone, Video, X } from 'lucide-react'
import {
  scheduleConsultation,
  getSchedulingSettings,
  getOrCreateAttorneyChatRoom,
  sendAttorneyMessage,
  type SchedulingAvailabilityDay,
} from '../../lib/api'

interface ConsultSchedulerModalProps {
  leadId: string
  clientName: string
  clientFirstName?: string
  userId?: string | null
  assessmentId?: string | null
  onClose: () => void
  onScheduled?: () => void
}

type MeetingType = 'video' | 'phone' | 'in_person'

const MEETING_TYPES: { value: MeetingType; label: string; icon: typeof Video }[] = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'in_person', label: 'In person', icon: MapPin },
]

// Default consult length (minutes) when the attorney has no event type configured.
const DEFAULT_DURATION = 30

function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '').split(':').map((x) => parseInt(x, 10))
  if (Number.isNaN(h)) return 0
  return h * 60 + (Number.isNaN(m) ? 0 : m)
}

function label12h(mins: number): string {
  const h24 = Math.floor(mins / 60)
  const m = mins % 60
  const isPm = h24 >= 12
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ConsultSchedulerModal({
  leadId,
  clientName,
  clientFirstName,
  userId,
  assessmentId,
  onClose,
  onScheduled,
}: ConsultSchedulerModalProps) {
  const [availability, setAvailability] = useState<SchedulingAvailabilityDay[] | null>(null)
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [bookingUrl, setBookingUrl] = useState<string | null>(null)

  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState('')
  const [meetingType, setMeetingType] = useState<MeetingType>('video')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ meetingUrl?: string | null } | null>(null)
  const [linkSent, setLinkSent] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    getSchedulingSettings()
      .then((s) => {
        setAvailability(Array.isArray(s?.availability) ? s.availability : [])
        setBookingUrl(s?.attorney?.publicUrl || null)
        const active = (s?.eventTypes || []).find((e) => e.isActive) || s?.eventTypes?.[0]
        if (active?.durationMinutes) setDuration(active.durationMinutes)
      })
      .catch(() => {
        setAvailability([])
      })
  }, [])

  // Build the selectable time slots for the chosen date from the attorney's weekly
  // availability window (their "Calendly" hours). Falls back to standard business
  // hours if they haven't configured availability yet.
  const slots = useMemo<number[]>(() => {
    if (!date) return []
    const [y, mo, d] = date.split('-').map(Number)
    const chosen = new Date(y, (mo || 1) - 1, d || 1)
    const dow = chosen.getDay()
    const day = availability?.find((a) => a.dayOfWeek === dow)
    // Each day can have multiple windows (e.g. 09:00–12:00 and 13:00–17:00).
    const windows =
      day && day.isAvailable && day.slots?.length
        ? day.slots.map((s) => ({ startM: toMinutes(s.startTime), endM: toMinutes(s.endTime) }))
        : day
          ? [] // configured but closed for this day
          : [{ startM: 9 * 60, endM: 17 * 60 }] // no config → business hours
    const now = new Date()
    const isToday = chosen.toDateString() === now.toDateString()
    const minM = isToday ? now.getHours() * 60 + now.getMinutes() + 30 : -1
    const out: number[] = []
    for (const w of windows) {
      for (let t = w.startM; t + duration <= w.endM; t += duration) {
        if (t <= minM) continue
        if (!out.includes(t)) out.push(t)
      }
    }
    out.sort((a, b) => a - b)
    return out
  }, [date, availability, duration])

  // Keep the selected time valid as the day/slots change.
  useEffect(() => {
    if (slots.length === 0) {
      setTime('')
      return
    }
    const currentMins = time ? toMinutes(to24(time)) : -1
    if (!slots.includes(currentMins)) {
      setTime(label12h(slots[0]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots])

  const submit = async () => {
    if (!time) {
      setError('Pick a time that works for you.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await scheduleConsultation(leadId, { date, time, meetingType })
      setResult({ meetingUrl: res?.meetingUrl ?? null })
      onScheduled?.()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not schedule the consultation. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const sendBookingLink = async () => {
    if (!bookingUrl) return
    setLinkSent('sending')
    try {
      const room = await getOrCreateAttorneyChatRoom(userId || null, assessmentId || undefined)
      const first = clientFirstName || clientName.split(' ')[0] || 'there'
      await sendAttorneyMessage(
        room.chatRoomId,
        `Hi ${first}, you can pick a consultation time that works for you here: ${bookingUrl}`,
      )
      setLinkSent('sent')
    } catch {
      setLinkSent('error')
    }
  }

  const loading = availability === null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {result ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Consultation scheduled</h2>
            <p className="mt-1 text-sm text-slate-600">
              {clientName} has been emailed the details{meetingType === 'video' ? ' and a join link' : ''}.
            </p>
            {result.meetingUrl && (
              <a
                href={result.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 underline hover:text-brand-700"
              >
                <Video className="h-4 w-4" /> Open meeting link
              </a>
            )}
            <div className="mt-5">
              <button type="button" onClick={onClose} className="btn-primary w-full">
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Schedule your first consultation</h2>
                <p className="text-xs text-slate-500">with {clientName}</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Meeting type</label>
                  <div className="mt-1.5 flex gap-2">
                    {MEETING_TYPES.map((m) => {
                      const Icon = m.icon
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMeetingType(m.value)}
                          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            meetingType === m.value
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Date</label>
                    <input
                      type="date"
                      value={date}
                      min={todayStr()}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Time</label>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      disabled={slots.length === 0}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {slots.length === 0 ? (
                        <option value="">No availability</option>
                      ) : (
                        slots.map((s) => (
                          <option key={s} value={label12h(s)}>
                            {label12h(s)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {slots.length === 0 && (
                  <p className="text-xs text-amber-700">
                    You have no availability set for that day. Pick another date, or send the client your
                    booking link below.
                  </p>
                )}

                {error && <p className="text-sm text-rose-600">{error}</p>}

                <button
                  type="button"
                  onClick={submit}
                  disabled={saving || !time}
                  className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                  {saving ? 'Scheduling…' : 'Schedule consultation'}
                </button>

                {bookingUrl && (
                  <div className="border-t border-slate-100 pt-3 text-center">
                    {linkSent === 'sent' ? (
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                        <Check className="h-4 w-4" /> Booking link sent to {clientName}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={sendBookingLink}
                        disabled={linkSent === 'sending'}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                      >
                        {linkSent === 'sending' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                        Prefer the client picks? Send them your booking link
                      </button>
                    )}
                    {linkSent === 'error' && (
                      <p className="mt-1 text-xs text-rose-600">Could not send the link. Try again.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-4 block w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              I'll schedule later
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Convert a 'h:mm AM' label back to 'HH:MM' for comparison with slot minutes.
function to24(label: string): string {
  const isPm = /pm/i.test(label)
  const num = label.replace(/\s*[AP]M/i, '').trim()
  const [h, m] = num.split(':').map((x) => parseInt(x, 10))
  let hh = h
  if (isPm && h < 12) hh = h + 12
  if (!isPm && h === 12) hh = 0
  return `${String(hh).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}
