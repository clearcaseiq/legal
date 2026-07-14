/**
 * Public, unauthenticated firm ("team") booking page (route:
 * /book/team/:firmSlug/:linkSlug). A visitor picks a day + time from the union
 * of the team's availability; the backend assigns an attorney (round-robin or
 * first-available) at booking time — no account needed.
 */

import { useCallback, useMemo, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Check, Clock, Users2, Video } from 'lucide-react'
import { getTeamBookingPage, getTeamBookingSlots, createTeamBooking, type TeamBookingPage } from '../../lib/api'
import { DaySlotPicker, LOCATION_META, formatDuration } from './bookingShared'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  )
}

export default function PublicTeamBookingPage() {
  const { firmSlug = '', linkSlug = '' } = useParams()
  const [page, setPage] = useState<TeamBookingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [slot, setSlot] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getTeamBookingPage(firmSlug, linkSlug)
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
  }, [firmSlug, linkSlug])

  const fetchSlots = useCallback(
    (from: string, to: string) => getTeamBookingSlots(firmSlug, linkSlug, from, to),
    [firmSlug, linkSlug],
  )

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
          <h1 className="text-lg font-bold text-slate-900">Booking page not found</h1>
          <p className="mt-2 text-sm text-slate-500">This scheduling link may have been disabled or moved.</p>
        </div>
      </Shell>
    )
  }

  const LocIcon = LOCATION_META[page.event.locationType].icon

  return (
    <Shell>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          <Users2 className="h-4 w-4" />
          {page.firmName}
        </div>
        <h1 className="mt-2 text-xl font-bold text-slate-900">{page.event.name}</h1>
        {page.event.description && <p className="mt-1 text-sm text-slate-600">{page.event.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {formatDuration(page.event.durationMinutes)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LocIcon className="h-4 w-4" /> {LOCATION_META[page.event.locationType].label}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users2 className="h-4 w-4" /> {page.memberCount} attorney{page.memberCount === 1 ? '' : 's'} on rotation
          </span>
        </div>
      </div>

      {slot ? (
        <TeamBookingForm
          firmSlug={firmSlug}
          linkSlug={linkSlug}
          page={page}
          start={slot}
          onBack={() => setSlot(null)}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <DaySlotPicker fetchSlots={fetchSlots} onPick={setSlot} />
        </div>
      )}
    </Shell>
  )
}

function TeamBookingForm({
  firmSlug,
  linkSlug,
  page,
  start,
  onBack,
}: {
  firmSlug: string
  linkSlug: string
  page: TeamBookingPage
  start: string
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<{ meetingUrl: string | null; manageToken: string; attorneyName: string } | null>(
    null,
  )

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
    setSubmitting(true)
    setErr(null)
    try {
      const res = await createTeamBooking(firmSlug, linkSlug, {
        start,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setDone({ meetingUrl: res.meetingUrl, manageToken: res.manageToken, attorneyName: res.attorneyName })
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not complete your booking. Please try another time.')
    } finally {
      setSubmitting(false)
    }
  }, [name, email, phone, notes, firmSlug, linkSlug, start])

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-6 w-6 text-emerald-600" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">You're booked!</h2>
        <p className="mt-1 text-sm text-slate-600">
          {page.event.name} on <span className="font-semibold">{whenLabel}</span>
        </p>
        <p className="mt-1 text-sm text-slate-600">
          with <span className="font-semibold">{done.attorneyName}</span>
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
          <div className="text-sm font-semibold text-slate-900">{page.event.name}</div>
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
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" />
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

        {err && <p className="text-sm text-rose-600">{err}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {submitting ? 'Booking…' : 'Confirm booking'}
        </button>
      </div>
    </div>
  )
}
