import { Plus } from 'lucide-react'
import { CalItem, WEEKDAYS_SHORT, addDays, dateKeyOf, itemTone, sameDay, startOfWeek, timeLabel } from './calendarUtils'

/** Traditional month grid (Google Calendar style) with up to 3 chips per day. */
export function MonthView({
  anchor,
  items,
  onDayClick,
  onItemClick,
  onMore,
}: {
  anchor: Date
  items: CalItem[]
  onDayClick: (day: Date) => void
  onItemClick: (item: CalItem) => void
  onMore: (day: Date) => void
}) {
  const today = new Date()
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  const byDay = new Map<string, CalItem[]>()
  for (const it of items) {
    const k = dateKeyOf(it.date)
    const arr = byDay.get(k) || []
    arr.push(it)
    byDay.set(k, arr)
  }
  for (const arr of byDay.values()) arr.sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
        {WEEKDAYS_SHORT.map((d, idx) => (
          <div
            key={d}
            className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
              idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 overflow-y-auto [grid-template-rows:repeat(6,minmax(108px,1fr))]">
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === anchor.getMonth()
          const isToday = sameDay(day, today)
          const col = i % 7
          const isWeekend = col === 0 || col === 6
          const dayItems = byDay.get(dateKeyOf(day)) || []
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`group relative min-h-[92px] cursor-pointer border-b border-r border-slate-100 p-1.5 transition-colors ${
                col === 6 ? 'border-r-0' : ''
              } ${!inMonth ? 'bg-slate-50/50' : isWeekend ? 'bg-slate-50/30 hover:bg-brand-50/40' : 'hover:bg-brand-50/40'}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs ${
                    isToday
                      ? 'bg-brand-600 font-semibold text-white'
                      : inMonth
                        ? 'font-medium text-slate-700'
                        : 'text-slate-300'
                  }`}
                >
                  {day.getDate()}
                </span>
                <Plus className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                {dayItems.slice(0, 3).map((item) => {
                  const tone = itemTone(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onItemClick(item)}
                      className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] font-medium ring-1 ring-inset transition ${tone.chip}`}
                      title={`${tone.label}: ${item.title}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                      <span className="truncate">
                        {item.hasTime ? <span className="tabular-nums">{timeLabel(item.date)} </span> : null}
                        {item.title}
                      </span>
                    </button>
                  )
                })}
                {dayItems.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onMore(day)}
                    className="block px-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
                  >
                    +{dayItems.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
