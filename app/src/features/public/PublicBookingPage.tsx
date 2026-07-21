/**
 * Public, unauthenticated "Calendly-style" booking page (route: /book/:slug and
 * /book/:slug/:eventSlug). A visitor picks a meeting type, then a day + time in
 * their own timezone, enters their details, and books — no account needed.
 */

import { useCallback, useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Check, ChevronRight, Clock, Video } from 'lucide-react'
import {
  getPublicBookingPage,
  createPublicBooking,
  getPublicBookingSlots,
  type PublicBookingPage as BookingPageData,
  type PublicBookingEventType,
} from '../../lib/api'
import { DaySlotPicker, LOCATION_META, formatDuration } from './bookingShared'
import { formatPhoneInput, validatePhoneField } from '../../lib/phone'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  )
}

export default function PublicBookingPage() {
  const { slug = '', eventSlug } = useParams()
  const navigate = useNavigate()
  const [page, setPage] = useState<BookingPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    getPublicBookingPage(slug)
      .then((data) => {
        if (!active) return
        setPage(data)
        setNotFound(false)
      })
      .catch(() => active && setNotFound(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading…</div>
      </Shell>
    )
  }

  if (notFound || !page) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-slate-300" />
          <h1 className="mt-3 text-lg font-semibold text-slate-800">Booking page not found</h1>
          <p className="mt-1 text-sm text-slate-500">This scheduling link may have been changed or disabled.</p>
        </div>
      </Shell>
    )
  }

  const activeEvent = eventSlug ? page.eventTypes.find((e) => e.slug === eventSlug) : null

  return (
    <Shell>
      <header className="mb-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
          {page.attorney.name.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="mt-3 text-xl font-bold text-slate-900">{page.attorney.name}</h1>
        {page.attorney.firmName && <p className="text-sm text-slate-500">{page.attorney.firmName}</p>}
      </header>

      {!eventSlug || !activeEvent ? (
        <EventTypePicker
          page={page}
          onPick={(et) => navigate(`/book/${encodeURIComponent(slug)}/${encodeURIComponent(et.slug)}`)}
        />
      ) : (
        <SlotPicker
          slug={slug}
          event={activeEvent}
          onBack={() => navigate(`/book/${encodeURIComponent(slug)}`)}
        />
      )}
    </Shell>
  )
}

/* -------------------------------------------------------------------------- */
/* Step 1 — pick a meeting type                                               */
/* -------------------------------------------------------------------------- */

function EventTypePicker({
  page,
  onPick,
}: {
  page: BookingPageData
  onPick: (et: PublicBookingEventType) => void
}) {
  if (page.eventTypes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        This attorney has not published any meeting types yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Select a meeting</h2>
      {page.eventTypes.map((et) => {
        const meta = LOCATION_META[et.locationType]
        const Icon = meta.icon
        return (
          <button
            key={et.id}
            type="button"
            onClick={() => onPick(et)}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-indigo-300 hover:shadow-sm"
          >
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900">{et.name}</div>
              {et.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{et.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(et.durationMinutes)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Step 2 — pick a day + time                                                 */
/* -------------------------------------------------------------------------- */

function SlotPicker({
  slug,
  event,
  onBack,
}: {
  slug: string
  event: PublicBookingEventType
  onBack: () => void
}) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const fetchSlots = useCallback(
    (from: string, to: string) => getPublicBookingSlots(slug, event.slug, from, to),
    [slug, event.slug],
  )

  if (selectedSlot) {
    return <BookingForm slug={slug} event={event} start={selectedSlot} onBack={() => setSelectedSlot(null)} />
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{event.name}</div>
          <div className="text-xs text-slate-500">
            {formatDuration(event.durationMinutes)} · {LOCATION_META[event.locationType].label}
          </div>
        </div>
      </div>

      <div className="p-4">
        <DaySlotPicker fetchSlots={fetchSlots} onPick={setSelectedSlot} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Step 3 — enter details + confirm                                           */
/* -------------------------------------------------------------------------- */

function BookingForm({
  slug,
  event,
  start,
  onBack,
}: {
  slug: string
  event: PublicBookingEventType
  start: string
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<{ meetingUrl: string | null; manageToken: string } | null>(null)

  const whenLabel = useMemo(
    () =>
      new Date(start).toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [start],
  )

  const submit = useCallback(async () => {
    if (!name.trim() || !email.trim()) {
      setErr('Please enter your name and email.')
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErr('Please enter a valid email address.')
      return
    }
    const phoneError = validatePhoneField(phone)
    if (phoneError) {
      setErr(phoneError)
      return
    }
    setSubmitting(true)
    setErr(null)
    try {
      const res = await createPublicBooking(slug, event.slug, {
        start,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setDone({ meetingUrl: res.meetingUrl, manageToken: res.manageToken })
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not complete your booking. Please try another time.')
    } finally {
      setSubmitting(false)
    }
  }, [name, email, phone, notes, slug, event.slug, start])

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-6 w-6 text-emerald-600" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">You're booked!</h2>
        <p className="mt-1 text-sm text-slate-600">
          {event.name} on <span className="font-semibold">{whenLabel}</span>
        </p>
        <p className="mt-2 text-sm text-slate-500">A confirmation has been sent to {email}.</p>
        {done.meetingUrl && (
          <a
            href={done.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Video className="h-4 w-4" />
            Join link
          </a>
        )}
        <p className="mt-5 text-sm text-slate-500">
          Need to change this?{' '}
          <a href={`/booking/manage/${done.manageToken}`} className="font-semibold text-indigo-600 hover:underline">
            Reschedule or cancel
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <button type="button" onClick={onBack} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="text-sm font-semibold text-slate-900">{event.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" />
            {whenLabel}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Email *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">What would you like to discuss?</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Booking…' : 'Confirm booking'}
        </button>
      </div>
    </div>
  )
}
