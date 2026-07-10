/**
 * Calendar page - month view of consultations and events.
 * Click on a date to add an event or to-do task.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ClipboardList,
  X,
  Plus,
  Clock,
  ChevronRight as ArrowRight,
  Video,
  Phone,
  MapPin,
  FileText,
  ExternalLink,
  CalendarClock,
  ArrowUpRight,
} from 'lucide-react'
import LeadPickerModal from '../components/LeadPickerModal'
import { useAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'
import { getAttorneyTaskSummary } from '../lib/api'
import { BackButton } from '../features/shared/ui'

const dateKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

type ConsultInfo = {
  type?: string | null
  duration?: number | null
  status?: string | null
  claimType?: string | null
  notes?: string | null
  meetingUrl?: string | null
  hostMeetingUrl?: string | null
  location?: string | null
  phoneNumber?: string | null
}

type CalItem = {
  kind: 'consult' | 'task'
  id: string
  leadId?: string | null
  date: Date
  title: string
  hasTime: boolean
  consult?: ConsultInfo
}

const claimLabel = (s?: string | null) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '—'

const MEETING_META: Record<string, { label: string; icon: typeof Video }> = {
  video: { label: 'Zoom / video call', icon: Video },
  phone: { label: 'Phone call', icon: Phone },
  in_person: { label: 'In person', icon: MapPin },
}

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
  const [taskList, setTaskList] = useState<any[]>([])
  const [selectedConsult, setSelectedConsult] = useState<CalItem | null>(null)

  useEffect(() => {
    let cancelled = false
    getAttorneyTaskSummary()
      .then((s: any) => {
        if (cancelled) return
        const all = [...(s?.overdue || []), ...(s?.today || []), ...(s?.upcoming || [])].filter((t: any) => t?.dueDate)
        setTaskList(all)
      })
      .catch(() => setTaskList([]))
    return () => {
      cancelled = true
    }
  }, [])

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
        navigate(
          `/attorney-dashboard/add-task/${lead.id}?date=${addEventDate}&returnTo=${encodeURIComponent('/attorney-dashboard/cases/calendar')}`,
        )
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

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalItem[]> = {}
    const add = (item: CalItem) => {
      const key = dateKeyOf(item.date)
      if (!map[key]) map[key] = []
      map[key].push(item)
    }
    events.forEach((e: any) => {
      const d = new Date(e.scheduledAt)
      if (Number.isNaN(d.getTime())) return
      add({
        kind: 'consult',
        id: `c-${e.id}`,
        leadId: e.leadId,
        date: d,
        title: e.plaintiffName || 'Consult',
        hasTime: true,
        consult: {
          type: e.type,
          duration: e.duration,
          status: e.status,
          claimType: e.claimType,
          notes: e.notes,
          meetingUrl: e.meetingUrl,
          hostMeetingUrl: e.hostMeetingUrl,
          location: e.location,
          phoneNumber: e.phoneNumber,
        },
      })
    })
    taskList.forEach((t: any) => {
      const d = new Date(t.dueDate)
      if (Number.isNaN(d.getTime())) return
      add({ kind: 'task', id: `t-${t.id}`, leadId: t.leadId, date: d, title: t.title || 'Task', hasTime: false })
    })
    Object.values(map).forEach((list) => list.sort((a, b) => a.date.getTime() - b.date.getTime()))
    return map
  }, [events, taskList])

  const prevMonth = () => setViewDate(new Date(year, month - 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1))
  const goToday = () => setViewDate(new Date())

  const today = new Date()
  const todayKey = dateKeyOf(today)

  const monthConsultCount = events.filter((e: any) => {
    const d = new Date(e.scheduledAt)
    return d.getFullYear() === year && d.getMonth() === month
  }).length

  // Chronological list of the next consults + tasks, for a quick-scan agenda.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const agenda = useMemo(() => {
    const all: CalItem[] = []
    Object.values(itemsByDate).forEach((list) => all.push(...list))
    return all
      .filter((i) => i.date.getTime() >= startOfToday.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6)
  }, [itemsByDate])

  // Consults open a detail panel (stay on the calendar); tasks jump to the
  // case's Tasks tab. (Previously everything navigated to Documents.)
  const openItem = (item: CalItem) => {
    if (item.kind === 'consult') {
      setSelectedConsult(item)
      return
    }
    if (!item.leadId) return
    navigate(`/attorney-dashboard/cases/${item.leadId}/tasks?from=calendar`)
  }

  const timeLabel = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

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
        <BackButton onClick={() => navigate('/attorney-dashboard/cases/active')} label="Active cases" className="mb-5" />

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Calendar</h1>
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
              <div className="hidden items-center gap-3 sm:flex">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Consult
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Task
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {monthConsultCount} {monthConsultCount === 1 ? 'consult' : 'consults'}
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
              const dayItems = dateKey ? (itemsByDate[dateKey] ?? []) : []
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
                    {dayItems.slice(0, 3).map((item) => {
                      const isConsult = item.kind === 'consult'
                      const style = isConsult
                        ? 'bg-sky-50 text-sky-700 ring-sky-100 hover:bg-sky-100'
                        : 'bg-amber-50 text-amber-700 ring-amber-100 hover:bg-amber-100'
                      const dot = isConsult ? 'bg-sky-500' : 'bg-amber-500'
                      return (
                        <button
                          key={item.id}
                          onClick={() => openItem(item)}
                          className={`flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium ring-1 ring-inset transition ${style}`}
                          title={`${isConsult ? 'Consult' : 'Task'}: ${item.title}${item.hasTime ? ` · ${timeLabel(item.date)}` : ''}`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                          <span className="truncate">
                            {item.hasTime ? <span className="tabular-nums">{timeLabel(item.date)} </span> : null}
                            {item.title}
                          </span>
                        </button>
                      )
                    })}
                    {dayItems.length > 3 && (
                      <span className="block px-1.5 text-[11px] font-medium text-slate-400">+{dayItems.length - 3} more</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming agenda — quick chronological scan of the next items */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Upcoming</h3>
          </div>
          {agenda.length ? (
            <ul className="divide-y divide-slate-100">
              {agenda.map((item) => {
                const isConsult = item.kind === 'consult'
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => openItem(item)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${isConsult ? 'bg-sky-50 text-sky-600 ring-sky-100' : 'bg-amber-50 text-amber-600 ring-amber-100'}`}>
                        {isConsult ? <Calendar className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-400">
                          {isConsult ? 'Consultation' : 'Task due'} ·{' '}
                          {item.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {item.hasTime ? ` · ${timeLabel(item.date)}` : ''}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              No upcoming consultations or tasks. Click any day to schedule one.
            </p>
          )}
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

      {selectedConsult && (
        <ConsultDetailPanel
          item={selectedConsult}
          onClose={() => setSelectedConsult(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'bg-sky-50 text-sky-700 ring-sky-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  COMPLETED: 'bg-slate-100 text-slate-600 ring-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-200',
  NO_SHOW: 'bg-amber-50 text-amber-700 ring-amber-200',
}

function DetailRow({ icon: Icon, label, children }: { icon: typeof Video; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-0.5 text-sm text-slate-800">{children}</div>
      </div>
    </div>
  )
}

function ConsultDetailPanel({
  item,
  onClose,
  navigate,
}: {
  item: CalItem
  onClose: () => void
  navigate: (to: string) => void
}) {
  const c = item.consult || {}
  const meeting = MEETING_META[String(c.type || '')] || { label: claimLabel(c.type) || 'Consultation', icon: CalendarClock }
  const MeetingIcon = meeting.icon
  const joinUrl = c.hostMeetingUrl || c.meetingUrl || null
  const status = String(c.status || 'SCHEDULED')
  const dateStr = item.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeStr = item.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const dateKey = dateKeyOf(item.date)

  const go = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-br from-sky-50 to-white px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 ring-1 ring-inset ring-sky-200">
                <Calendar className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">Consultation</span>
            </div>
            <h2 className="mt-2 truncate text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="text-sm text-slate-500">{claimLabel(c.claimType)}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* When + status */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-slate-900">{dateStr}</p>
            <p className="text-sm text-slate-500">
              {timeStr}
              {c.duration ? ` · ${c.duration} min` : ''}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${STATUS_BADGE[status] || STATUS_BADGE.SCHEDULED}`}>
            {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase())}
          </span>
        </div>

        {/* Details */}
        <div className="divide-y divide-slate-100">
          <DetailRow icon={MeetingIcon} label="Meeting type">
            {meeting.label}
          </DetailRow>
          {c.type === 'in_person' && c.location ? (
            <DetailRow icon={MapPin} label="Location">{c.location}</DetailRow>
          ) : null}
          {c.type === 'phone' && c.phoneNumber ? (
            <DetailRow icon={Phone} label="Phone">
              <a href={`tel:${c.phoneNumber}`} className="text-brand-600 hover:underline">{c.phoneNumber}</a>
            </DetailRow>
          ) : null}
          {joinUrl ? (
            <DetailRow icon={Video} label="Meeting link">
              <a
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-brand-600 hover:underline"
              >
                {joinUrl}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </DetailRow>
          ) : null}
          {c.notes ? (
            <DetailRow icon={FileText} label="Notes">
              <p className="whitespace-pre-wrap leading-relaxed text-slate-600">{c.notes}</p>
            </DetailRow>
          ) : null}
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-2.5 border-t border-slate-200 bg-slate-50 px-5 py-4">
          {joinUrl ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Video className="h-4 w-4" />
              Join meeting
            </a>
          ) : null}
          <div className="flex gap-2.5">
            {item.leadId ? (
              <button
                onClick={() => go(`/attorney-dashboard/cases/${item.leadId}/overview?from=calendar`)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
                Open case
              </button>
            ) : null}
            {item.leadId ? (
              <button
                onClick={() => {
                  const params = new URLSearchParams({
                    date: dateKey,
                    time: item.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    returnTo: '/attorney-dashboard/cases/calendar',
                  })
                  if (c.type) params.set('type', String(c.type))
                  go(`/attorney-dashboard/schedule-consult/${item.leadId}?${params.toString()}`)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                <CalendarClock className="h-4 w-4 text-slate-400" />
                Reschedule
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
