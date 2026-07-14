/**
 * Shared primitives for the public ("Calendly-style") booking + manage pages:
 * timezone helpers, location metadata, and the day/time slot picker reused by
 * both the initial booking flow and the reschedule flow.
 */

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Phone, Video } from 'lucide-react'
import { type BookingLocationType } from '../../lib/api'

export const LOCATION_META: Record<BookingLocationType, { label: string; icon: typeof Video }> = {
  video: { label: 'Video call', icon: Video },
  phone: { label: 'Phone call', icon: Phone },
  in_person: { label: 'In person', icon: MapPin },
}

export const VISITOR_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone
const DAYS_AHEAD = 21

/** ISO-style local date (YYYY-MM-DD) in the visitor's timezone. */
export function dateKey(d: Date): string {
  return d.toLocaleDateString('en-CA')
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h} hr`
}

export function DaySlotPicker({
  fetchSlots,
  onPick,
}: {
  /** Loads bookable slot instants (UTC ISO) for the given date range. */
  fetchSlots: (from: string, to: string) => Promise<{ slots: string[] }>
  onPick: (iso: string) => void
}) {
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    const today = new Date()
    const to = new Date()
    to.setDate(to.getDate() + DAYS_AHEAD)
    fetchSlots(dateKey(today), dateKey(to))
      .then((res) => active && setSlots(res.slots))
      .catch(() => active && setSlots([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [fetchSlots])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    const now = Date.now()
    for (const iso of slots) {
      if (new Date(iso).getTime() < now) continue
      const key = dateKey(new Date(iso))
      const list = map.get(key) || []
      list.push(iso)
      map.set(key, list)
    }
    return map
  }, [slots])

  const week = useMemo(() => {
    const days: Array<{ key: string; date: Date }> = []
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() + weekOffset * 7)
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      days.push({ key: dateKey(d), date: d })
    }
    return days
  }, [weekOffset])

  useEffect(() => {
    if (selectedDay || slotsByDay.size === 0) return
    const firstWithSlots = week.find((d) => (slotsByDay.get(d.key) || []).length > 0)
    if (firstWithSlots) setSelectedDay(firstWithSlots.key)
  }, [slotsByDay, week, selectedDay])

  const daySlots = selectedDay ? slotsByDay.get(selectedDay) || [] : []

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Pick a day</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={weekOffset >= 2}
            onClick={() => setWeekOffset((w) => Math.min(2, w + 1))}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const has = (slotsByDay.get(d.key) || []).length > 0
          const isSelected = selectedDay === d.key
          return (
            <button
              key={d.key}
              type="button"
              disabled={!has}
              onClick={() => setSelectedDay(d.key)}
              className={`flex flex-col items-center rounded-lg border px-1 py-2 text-center transition ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : has
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                    : 'cursor-not-allowed border-transparent bg-slate-50 text-slate-300'
              }`}
            >
              <span className="text-[10px] uppercase">
                {d.date.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span className="text-sm font-semibold">{d.date.getDate()}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          {selectedDay
            ? new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            : 'Available times'}
        </h3>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading times…</p>
        ) : daySlots.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {slotsByDay.size === 0 ? 'No open times in the next few weeks.' : 'No open times on this day.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {daySlots.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => onPick(iso)}
                className="rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-50"
              >
                {new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">Times shown in your timezone ({VISITOR_TZ})</p>
    </div>
  )
}
