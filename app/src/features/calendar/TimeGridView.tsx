import { useEffect, useRef, useState } from 'react'
import { Video, Phone, MapPin } from 'lucide-react'
import {
  CalItem,
  HOUR_HEIGHT,
  dateKeyOf,
  hourLabel,
  itemTone,
  layoutDayEvents,
  minutesOfDay,
  sameDay,
  timeLabel,
} from './calendarUtils'

const TYPE_ICON: Record<string, typeof Video> = { video: Video, phone: Phone, in_person: MapPin }

/** Day + Week time-grid (Google Calendar style). `days` has 1 or 7 entries. */
export function TimeGridView({
  days,
  items,
  selected,
  onItemClick,
  onSlotClick,
}: {
  days: Date[]
  items: CalItem[]
  selected?: Date
  onItemClick: (item: CalItem) => void
  onSlotClick: (day: Date) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Land the scroll on the workday (~7am) instead of midnight.
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const itemsFor = (day: Date) => items.filter((i) => sameDay(i.date, day))
  const nowTop = (minutesOfDay(now) / 60) * HOUR_HEIGHT

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Day headers + all-day row */}
      <div className="flex border-b border-slate-200 pr-3">
        <div className="w-14 shrink-0" />
        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((day) => {
            const isToday = sameDay(day, now)
            const isSelected = selected ? sameDay(day, selected) : false
            const allDay = itemsFor(day).filter((i) => !i.hasTime)
            return (
              <div
                key={dateKeyOf(day)}
                className={`border-l border-slate-100 first:border-l-0 ${isSelected && !isToday ? 'bg-brand-50/60' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onSlotClick(day)}
                  className="flex w-full flex-col items-center py-2 transition hover:bg-slate-50"
                >
                  <span
                    className={`text-[11px] font-medium uppercase tracking-wide ${
                      isToday ? 'text-brand-600' : isSelected ? 'text-brand-500' : 'text-slate-400'
                    }`}
                  >
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span
                    className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ${
                      isToday
                        ? 'bg-brand-600 text-white'
                        : isSelected
                        ? 'text-brand-700 ring-2 ring-brand-500'
                        : 'text-slate-800'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </button>
                <div className="min-h-[6px] space-y-1 px-1 pb-1">
                  {allDay.map((item) => {
                    const tone = itemTone(item)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onItemClick(item)}
                        className={`flex w-full items-center gap-1 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium ring-1 ring-inset ${tone.chip}`}
                        title={item.title}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                        <span className="truncate">{item.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        <div className="flex">
          {/* Hour gutter */}
          <div className="w-14 shrink-0">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-1.5 right-2 text-[10px] font-medium text-slate-400">
                  {h === 0 ? '' : hourLabel(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div
            className="grid flex-1"
            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
          >
            {days.map((day) => {
              const positioned = layoutDayEvents(itemsFor(day))
              const isToday = sameDay(day, now)
              return (
                <div
                  key={dateKeyOf(day)}
                  className="relative border-l border-slate-100 first:border-l-0"
                  style={{ height: 24 * HOUR_HEIGHT }}
                >
                  {/* Hour lines + click-to-create slots */}
                  {Array.from({ length: 24 }, (_, h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        const d = new Date(day)
                        d.setHours(h, 0, 0, 0)
                        onSlotClick(d)
                      }}
                      className="block w-full border-t border-slate-100 transition hover:bg-brand-50/40"
                      style={{ height: HOUR_HEIGHT }}
                      aria-label={`Add event at ${hourLabel(h)}`}
                    />
                  ))}

                  {/* Current-time indicator */}
                  {isToday && (
                    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }}>
                      <div className="relative">
                        <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                        <div className="h-px bg-rose-500" />
                      </div>
                    </div>
                  )}

                  {/* Timed events */}
                  {positioned.map(({ item, top, height, leftPct, widthPct }) => {
                    const Icon = TYPE_ICON[String(item.consult?.type || '')] || null
                    const tone = itemTone(item)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onItemClick(item)}
                        className={`absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm transition ${tone.grid}`}
                        style={{
                          top: top + 1,
                          height: height - 2,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                        title={`${item.title} · ${timeLabel(item.date)}`}
                      >
                        <div className="flex items-center gap-1 text-[11px] font-semibold leading-tight">
                          {Icon && <Icon className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{item.title}</span>
                        </div>
                        {height > 30 && (
                          <div className={`truncate text-[10px] ${tone.subText}`}>{timeLabel(item.date)}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
