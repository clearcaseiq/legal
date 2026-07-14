import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS, WEEKDAYS_MIN, addDays, addMonths, dateKeyOf, sameDay, startOfWeek } from './calendarUtils'

/** Compact month date-picker for the sidebar (Google Calendar style). */
export function MiniMonth({
  selected,
  onSelect,
  markedKeys,
}: {
  selected: Date
  onSelect: (d: Date) => void
  markedKeys: Set<string>
}) {
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const today = new Date()

  const gridStart = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-slate-800">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </span>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS_MIN.map((d, i) => (
          <span key={i} className="py-1 text-center text-[10px] font-medium text-slate-400">
            {d}
          </span>
        ))}
        {cells.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const isToday = sameDay(d, today)
          const isSelected = sameDay(d, selected)
          const marked = markedKeys.has(dateKeyOf(d))
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${
                isSelected
                  ? 'bg-brand-600 font-semibold text-white'
                  : isToday
                    ? 'font-semibold text-brand-700 ring-1 ring-inset ring-brand-300'
                    : inMonth
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 hover:bg-slate-50'
              }`}
            >
              {d.getDate()}
              {marked && !isSelected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
