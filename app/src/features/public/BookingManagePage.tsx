/**
 * Public self-service manage page (route: /booking/manage/:token). The booker
 * reaches it from their confirmation and can reschedule or cancel without an
 * account, using the opaque token embedded in the link.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Check, X } from 'lucide-react'
import {
  getManagedBooking,
  cancelManagedBooking,
  rescheduleManagedBooking,
  getPublicBookingSlots,
  type ManagedBooking,
} from '../../lib/api'
import { DaySlotPicker, LOCATION_META, formatDuration } from './bookingShared'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </div>
  )
}

function whenLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function BookingManagePage() {
  const { token = '' } = useParams()
  const [booking, setBooking] = useState<ManagedBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [mode, setMode] = useState<'view' | 'reschedule'>('view')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getManagedBooking(token)
      .then((data) => {
        setBooking(data)
        setNotFound(false)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const cancel = useCallback(async () => {
    if (!confirm('Cancel this consultation?')) return
    setBusy(true)
    setErr(null)
    try {
      await cancelManagedBooking(token)
      setFlash('Your consultation was cancelled.')
      load()
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not cancel. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [token, load])

  const reschedule = useCallback(
    async (iso: string) => {
      setBusy(true)
      setErr(null)
      try {
        await rescheduleManagedBooking(token, iso)
        setFlash('Your consultation was rescheduled.')
        setMode('view')
        load()
      } catch (e: any) {
        setErr(e?.response?.data?.error || 'That time is not available. Please pick another.')
      } finally {
        setBusy(false)
      }
    },
    [token, load],
  )

  const fetchSlots = useCallback(
    (from: string, to: string) =>
      getPublicBookingSlots(booking?.bookingSlug || '', booking?.eventSlug || '', from, to),
    [booking?.bookingSlug, booking?.eventSlug],
  )

  const cancelled = booking?.status === 'CANCELLED'
  const completed = booking?.status === 'COMPLETED'
  const locationMeta = booking ? LOCATION_META[booking.locationType] : null

  const canManage = useMemo(
    () => Boolean(booking && !cancelled && !completed && booking.bookingSlug && booking.eventSlug),
    [booking, cancelled, completed],
  )

  if (loading) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading…</div>
      </Shell>
    )
  }

  if (notFound || !booking) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-slate-300" />
          <h1 className="mt-3 text-lg font-semibold text-slate-800">Booking not found</h1>
          <p className="mt-1 text-sm text-slate-500">This management link may have expired or already been used.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5">
          <h1 className="text-lg font-bold text-slate-900">{booking.eventName}</h1>
          <p className="text-sm text-slate-500">
            with {booking.attorney.name}
            {booking.attorney.firmName ? ` · ${booking.attorney.firmName}` : ''}
          </p>
        </div>

        <div className="space-y-3 p-5">
          {flash && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Check className="h-4 w-4" />
              {flash}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-slate-700">
            <CalendarClock className="h-4 w-4 text-indigo-500" />
            <span className={cancelled ? 'line-through text-slate-400' : 'font-medium'}>
              {whenLabel(booking.scheduledAt)}
            </span>
          </div>
          <div className="text-sm text-slate-500">
            {formatDuration(booking.durationMinutes)} · {locationMeta?.label}
            {booking.location ? ` · ${booking.location}` : ''}
          </div>

          {cancelled && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <X className="h-4 w-4" />
              This consultation was cancelled.
            </div>
          )}
          {completed && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              This consultation has already taken place.
            </div>
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}

          {mode === 'reschedule' ? (
            <div className="mt-2 rounded-xl border border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setMode('view')}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              {booking.bookingSlug && booking.eventSlug && (
                <DaySlotPicker fetchSlots={fetchSlots} onPick={reschedule} />
              )}
            </div>
          ) : (
            canManage && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMode('reschedule')}
                  disabled={busy}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel booking
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </Shell>
  )
}
