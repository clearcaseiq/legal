/**
 * Calendar page - month view of consultations and events.
 * Click on a date to add an event or to-do task.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, ClipboardList, X } from 'lucide-react'
import LeadPickerModal from '../components/LeadPickerModal'
import { useAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'

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
        navigate(`/attorney-dashboard/schedule-consult/${lead.id}?date=${addEventDate}`)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[180px] text-center font-medium text-gray-900">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="ml-2 px-3 py-1.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
            >
              Today
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - startOffset + 1
              const isInMonth = dayNum >= 1 && dayNum <= daysInMonth
              const dateKey = isInMonth
                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                : ''
              const dayEvents = dateKey ? (eventsByDate[dateKey] ?? []) : []
              const isToday = dateKey === todayKey

              return (
                <div
                  key={i}
                  onClick={() => isInMonth && dateKey && handleDateClick(dateKey)}
                  className={`min-h-[100px] p-2 border-b border-r border-gray-100 ${
                    !isInMonth ? 'bg-gray-50/50' : 'cursor-pointer hover:bg-sky-50/50'
                  } ${i % 7 === 6 ? 'border-r-0' : ''}`}
                  role={isInMonth ? 'button' : undefined}
                  aria-label={isInMonth ? `Add event on ${month + 1}/${dayNum}/${year}` : undefined}
                >
                  <div className="mb-1">
                    <span
                      className={`inline-flex items-center justify-center text-sm font-medium ${
                        isInMonth
                          ? isToday
                            ? 'w-7 h-7 rounded-full bg-brand-600 text-white'
                            : 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {isInMonth ? dayNum : ''}
                    </span>
                  </div>
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    {dayEvents.slice(0, 3).map((e: any) => (
                      <button
                        key={e.id}
                        onClick={() => e.leadId && navigate(`/attorney-dashboard/documents/${e.leadId}`)}
                        className="block w-full text-left text-xs px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 hover:bg-sky-200 truncate"
                        title={`${e.plaintiffName || '—'} · ${new Date(e.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                      >
                        {new Date(e.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {e.plaintiffName || 'Consult'}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-xs text-gray-500">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => {
              const today = new Date()
              const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
              setAddEventDate(todayKey)
              setAddType('task')
              setLeadPickerOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ClipboardList className="h-4 w-4" />
            Add task
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
              setAddEventDate(todayKey)
              setAddType('event')
              setLeadPickerOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            <Calendar className="h-4 w-4" />
            Schedule consultation
          </button>
        </div>
      </div>

      {/* Add event or task choice modal */}
      {addChoiceOpen && addEventDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setAddChoiceOpen(false); setAddEventDate(null) }} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add on {formatDateForTitle(addEventDate)}</h3>
              <button onClick={() => { setAddChoiceOpen(false); setAddEventDate(null) }} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => openLeadPicker('event')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-medium transition-colors"
              >
                <Calendar className="h-5 w-5 text-sky-600" />
                Schedule consultation
              </button>
              <button
                onClick={() => openLeadPicker('task')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-800 font-medium transition-colors"
              >
                <ClipboardList className="h-5 w-5 text-brand-600" />
                Add to-do task
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
