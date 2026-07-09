/**
 * Calendar page - month view of consultations and events.
 * Click on a date to add an event or to-do task.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, ClipboardList, X, Plus, Clock } from 'lucide-react'
import LeadPickerModal from '../components/LeadPickerModal'
import { useAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'
import { BackButton } from '../features/shared/ui'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarPage() {
  const navigate = useNavigate()
  const { data, loading } = useAttorneyDashboardSummary()
  const events = data?.upcomingConsults ?? []
  const recentLeads = data?.recentLeads ?? []
  const [viewDate, setViewDate] = useState(() => new Date())
  const [addEventDate, setAddEventDate] = useState<string | null>(null)
  const [addType, setAddType] = useState<'event' | 'task' | null>(null)
  const [addChoiceOpen, setAddChoiceOpen] = useState(false)
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)

  const handleDateClick = (dateKey: string) => {
    setAddEventDate(dateKey)
    setAddChoiceOpen(true)
  }

  const openLeadPicker = (type: 'event' | 'task') => {
    setAddType(type)
    setAddChoiceOpen(false)
    setLeadPickerOpen(true)
  }

  const handleLeadSelect = (lead: any) => {
    if (addEventDate && lead?.id) {
      if (addType === 'event') {
        navigate(
          `/attorney-dashboard/schedule-consult/${lead.id}?date=${addEventDate}&returnTo=${encodeURIComponent('/attorney-dashboard/cases/calendar')}`,
        )
      } else if (addType === 'task') {
        navigate(`/attorney-dashboard/add-task/${lead.id}?date=${addEventDate}`)
      }
    }
    setAddEventDate(null)
    setAddType(null)
    setLeadPickerOpen(false)
  }

  const formatDateForTitle = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Build calendar grid: first day of month, days in month, leading/trailing blanks
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  const eventsByDate: Record<string, any[]> = {}
  events.forEach((e: any) => {
    const d = new Date(e.scheduledAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(e)
  })

  const prevMonth = () => setViewDate(new Date(year, month - 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1))
  const goToday = () => setViewDate(new Date())

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const monthEventCount = Object.entries(eventsByDate).filter(([key]) => {
    const [y, m] = key.split('-').map(Number)
    return y === year && m === month + 1
  }).reduce((sum, [, list]) => sum + list.length, 0)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <BackButton onClick={() => navigate('/attorney-dashboard')} label="Back to dashboard" className="mb-5" />

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Calendar</h1>
              <p className="mt-0.5 text-sm text-slate-500">Consultations and tasks across your cases — click any day to schedule.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const t = new Date()
                setAddEventDate(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`)
                setAddType('task')
                setLeadPickerOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              <ClipboardList className="h-4 w-4 text-slate-400" />
              Add task
            </button>
            <button
              onClick={() => {
                const t = new Date()
                setAddEventDate(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`)
                setAddType('event')
                setLeadPickerOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Calendar className="h-4 w-4" />
              Schedule consultation
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
                <button
                  onClick={prevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-l-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="h-5 w-px bg-slate-200" />
                <button
                  onClick={nextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-r-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {MONTHS[month]} <span className="font-normal text-slate-400">{year}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {monthEventCount} {monthEventCount === 1 ? 'consult' : 'consults'}
              </span>
              <button
                onClick={goToday}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                Today
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
            {WEEKDAYS.map((d, idx) => (
              <div
                key={d}
                className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - startOffset + 1
              const isInMonth = dayNum >= 1 && dayNum <= daysInMonth
              const col = i % 7
              const isWeekend = col === 0 || col === 6
              const dateKey = isInMonth
                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                : ''
              const dayEvents = dateKey ? (eventsByDate[dateKey] ?? []) : []
              const isToday = dateKey === todayKey

              return (
                <div
                  key={i}
                  onClick={() => isInMonth && dateKey && handleDateClick(dateKey)}
                  className={`group relative min-h-[108px] border-b border-r border-slate-100 p-2 transition-colors ${
                    col === 6 ? 'border-r-0' : ''
                  } ${
                    !isInMonth
                      ? 'bg-slate-50/50'
                      : `cursor-pointer hover:bg-brand-50/40 ${isWeekend ? 'bg-slate-50/40' : ''}`
                  } ${isToday ? 'bg-brand-50/40' : ''}`}
                  role={isInMonth ? 'button' : undefined}
                  aria-label={isInMonth ? `Add event on ${month + 1}/${dayNum}/${year}` : undefined}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-1 text-sm ${
                        isInMonth
                          ? isToday
                            ? 'bg-brand-600 font-semibold text-white shadow-sm'
                            : 'font-medium text-slate-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {isInMonth ? dayNum : ''}
                    </span>
                    {isInMonth && (
                      <Plus className="h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    {dayEvents.slice(0, 3).map((e: any) => (
                      <button
                        key={e.id}
                        onClick={() => e.leadId && navigate(`/attorney-dashboard/documents/${e.leadId}`)}
                        className="flex w-full items-center gap-1.5 truncate rounded-md bg-sky-50 px-1.5 py-1 text-left text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-100 transition hover:bg-sky-100"
                        title={`${e.plaintiffName || '—'} · ${new Date(e.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                        <span className="truncate">
                          <span className="tabular-nums">{new Date(e.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                          {' '}
                          {e.plaintiffName || 'Consult'}
                        </span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="block px-1.5 text-[11px] font-medium text-slate-400">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add event or task choice modal */}
      {addChoiceOpen && addEventDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setAddChoiceOpen(false); setAddEventDate(null) }} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Add to calendar</p>
                <h3 className="mt-0.5 text-lg font-semibold text-slate-900">{formatDateForTitle(addEventDate)}</h3>
              </div>
              <button
                onClick={() => { setAddChoiceOpen(false); setAddEventDate(null) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={() => openLeadPicker('event')}
                className="group flex w-full items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600 ring-1 ring-inset ring-sky-200">
                  <Calendar className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Schedule consultation</span>
                  <span className="block text-xs text-slate-500">Book a meeting with a client</span>
                </span>
              </button>
              <button
                onClick={() => openLeadPicker('task')}
                className="group flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 ring-1 ring-inset ring-brand-200">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Add to-do task</span>
                  <span className="block text-xs text-slate-500">Set a reminder or deadline</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <LeadPickerModal
        isOpen={leadPickerOpen}
        onClose={() => { setLeadPickerOpen(false); setAddEventDate(null); setAddType(null) }}
        leads={recentLeads}
        title={
          addEventDate
            ? addType === 'task'
              ? `Select case to add task due ${formatDateForTitle(addEventDate)}`
              : `Select case to add event on ${formatDateForTitle(addEventDate)}`
            : 'Select case'
        }
        onSelect={handleLeadSelect}
        emptyMessage="No cases available. Add a case first from the dashboard."
      />
    </div>
  )
}
