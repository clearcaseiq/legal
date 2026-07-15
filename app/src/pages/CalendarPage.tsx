/**
 * Attorney Calendar — Google-Calendar-style workspace with Day / Week / Month
 * views and a left rail (create, mini-month navigator, and calendar filters).
 * Consults are fetched per visible range; tasks come from the cross-case queue.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ClipboardList,
  X,
  Plus,
  Video,
  Phone,
  MapPin,
  FileText,
  ExternalLink,
  CalendarClock,
  ArrowUpRight,
  Link2 as LinkIcon,
  User as UserIcon,
} from 'lucide-react'
import LeadPickerModal from '../components/LeadPickerModal'
import { useAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'
import { getAttorneyTaskSummary, getAttorneyCalendarAppointments } from '../lib/api'
import { MiniMonth } from '../features/calendar/MiniMonth'
import { MonthView } from '../features/calendar/MonthView'
import { TimeGridView } from '../features/calendar/TimeGridView'
import {
  CalItem,
  CalView,
  LIST_SPAN_DAYS,
  MONTHS,
  addDays,
  addMonths,
  claimLabel,
  dateKeyOf,
  rangeForView,
  sameDay,
  startOfDay,
  startOfWeek,
  timeLabel,
} from '../features/calendar/calendarUtils'

const MEETING_META: Record<string, { label: string; icon: typeof Video }> = {
  video: { label: 'Zoom / video call', icon: Video },
  phone: { label: 'Phone call', icon: Phone },
  in_person: { label: 'In person', icon: MapPin },
}

const VIEWS: Array<{ key: CalView; label: string }> = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'list', label: 'List' },
]

export default function CalendarPage() {
  const navigate = useNavigate()
  const { data } = useAttorneyDashboardSummary()
  const recentLeads = data?.recentLeads ?? []

  const [view, setView] = useState<CalView>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [consults, setConsults] = useState<CalItem[]>([])
  const [tasks, setTasks] = useState<CalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ consult: true, booking: true, task: true })

  const [addSlot, setAddSlot] = useState<{ date: Date; withTime: boolean } | null>(null)
  const [addType, setAddType] = useState<'event' | 'task' | null>(null)
  const [addChoiceOpen, setAddChoiceOpen] = useState(false)
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)
  const [selectedConsult, setSelectedConsult] = useState<CalItem | null>(null)

  // Fetch consults for the visible range whenever the view/anchor moves.
  useEffect(() => {
    let cancelled = false
    const { from, to } = rangeForView(view, anchor)
    setLoading(true)
    getAttorneyCalendarAppointments(from.toISOString(), to.toISOString())
      .then((res) => {
        if (cancelled) return
        const items: CalItem[] = (res.events || [])
          .map((e) => {
            const d = new Date(e.scheduledAt)
            if (Number.isNaN(d.getTime())) return null
            return {
              kind: 'consult' as const,
              id: `c-${e.id}`,
              leadId: e.leadId,
              date: d,
              end: new Date(d.getTime() + (e.duration || 30) * 60000),
              title: e.plaintiffName || 'Consult',
              hasTime: true,
              source: e.source === 'booking' ? 'booking' : 'case',
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
                eventTypeName: e.eventTypeName,
                bookerEmail: e.bookerEmail,
                manageToken: e.manageToken,
              },
            } as CalItem
          })
          .filter(Boolean) as CalItem[]
        setConsults(items)
      })
      .catch(() => !cancelled && setConsults([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [view, anchor])

  // Tasks (cross-case queue) — near-term, shown as all-day items.
  useEffect(() => {
    let cancelled = false
    getAttorneyTaskSummary()
      .then((s: any) => {
        if (cancelled) return
        const all = [...(s?.overdue || []), ...(s?.today || []), ...(s?.upcoming || [])].filter((t: any) => t?.dueDate)
        setTasks(
          all
            .map((t: any) => {
              const d = new Date(t.dueDate)
              if (Number.isNaN(d.getTime())) return null
              return {
                kind: 'task' as const,
                id: `t-${t.id}`,
                leadId: t.leadId,
                date: d,
                title: t.title || 'Task',
                hasTime: false,
              } as CalItem
            })
            .filter(Boolean) as CalItem[],
        )
      })
      .catch(() => setTasks([]))
    return () => {
      cancelled = true
    }
  }, [])

  const visibleItems = useMemo(() => {
    const out: CalItem[] = []
    for (const c of consults) {
      if (c.source === 'booking' ? filters.booking : filters.consult) out.push(c)
    }
    if (filters.task) out.push(...tasks)
    return out
  }, [consults, tasks, filters])

  const markedKeys = useMemo(() => new Set([...consults, ...tasks].map((i) => dateKeyOf(i.date))), [consults, tasks])

  const days = useMemo(() => {
    if (view === 'day') return [anchor]
    if (view === 'week') {
      const s = startOfWeek(anchor)
      return Array.from({ length: 7 }, (_, i) => addDays(s, i))
    }
    return []
  }, [view, anchor])

  const rangeLabel = useMemo(() => {
    if (view === 'day') {
      return anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (view === 'week') {
      const s = startOfWeek(anchor)
      const e = addDays(s, 6)
      const sameMonth = s.getMonth() === e.getMonth()
      const left = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const right = e.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })
      return `${left} – ${right}, ${e.getFullYear()}`
    }
    if (view === 'list') {
      const s = startOfDay(anchor)
      const e = addDays(s, LIST_SPAN_DAYS - 1)
      const left = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const right = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `${left} – ${right}, ${e.getFullYear()}`
    }
    return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
  }, [view, anchor])

  const step = (dir: 1 | -1) => {
    if (view === 'day') setAnchor((d) => addDays(d, dir))
    else if (view === 'week') setAnchor((d) => addDays(d, dir * 7))
    else if (view === 'list') setAnchor((d) => addDays(d, dir * LIST_SPAN_DAYS))
    else setAnchor((d) => addMonths(d, dir))
  }
  const goToday = () => setAnchor(new Date())

  const openCreate = (slot: { date: Date; withTime: boolean }) => {
    setAddSlot(slot)
    setAddChoiceOpen(true)
  }

  const openLeadPicker = (type: 'event' | 'task') => {
    setAddType(type)
    setAddChoiceOpen(false)
    setLeadPickerOpen(true)
  }

  const handleLeadSelect = (lead: any) => {
    if (addSlot && lead?.id) {
      const dateKey = dateKeyOf(addSlot.date)
      const returnTo = encodeURIComponent('/attorney-dashboard/cases/calendar')
      if (addType === 'event') {
        const params = new URLSearchParams({ date: dateKey, returnTo })
        if (addSlot.withTime) {
          params.set('time', addSlot.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
        }
        navigate(`/attorney-dashboard/schedule-consult/${lead.id}?${params.toString()}`)
      } else if (addType === 'task') {
        navigate(`/attorney-dashboard/add-task/${lead.id}?date=${dateKey}&returnTo=${returnTo}`)
      }
    }
    setAddSlot(null)
    setAddType(null)
    setLeadPickerOpen(false)
  }

  const openItem = useCallback(
    (item: CalItem) => {
      if (item.kind === 'consult') {
        setSelectedConsult(item)
        return
      }
      if (item.leadId) navigate(`/attorney-dashboard/cases/${item.leadId}/tasks?from=calendar`)
    },
    [navigate],
  )

  const formatDateForTitle = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
          <Calendar className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Calendar</h1>

        <button
          onClick={goToday}
          className="ml-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          Today
        </button>
        <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
          <button
            onClick={() => step(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-l-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="h-5 w-px bg-slate-200" />
          <button
            onClick={() => step(1)}
            className="flex h-8 w-8 items-center justify-center rounded-r-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{rangeLabel}</h2>

        <div className="ml-auto flex items-center gap-2">
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  view === v.key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar + calendar body */}
      <div className="flex h-[calc(100vh-11rem)] min-h-[560px] gap-4">
        <aside className="hidden w-56 shrink-0 flex-col gap-5 overflow-y-auto lg:flex">
          <button
            onClick={() => openCreate({ date: new Date(), withTime: false })}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <MiniMonth
              selected={anchor}
              markedKeys={markedKeys}
              onSelect={(d) => {
                setAnchor(d)
                if (view === 'month') setView('day')
              }}
            />
          </div>

          <div>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">My calendars</p>
            <div className="space-y-1">
              <FilterToggle
                label="Case consultations"
                color="bg-sky-500"
                checked={filters.consult}
                onChange={() => setFilters((f) => ({ ...f, consult: !f.consult }))}
              />
              <FilterToggle
                label="Online bookings"
                color="bg-violet-500"
                checked={filters.booking}
                onChange={() => setFilters((f) => ({ ...f, booking: !f.booking }))}
              />
              <FilterToggle
                label="Tasks & deadlines"
                color="bg-amber-500"
                checked={filters.task}
                onChange={() => setFilters((f) => ({ ...f, task: !f.task }))}
              />
            </div>
          </div>

          <button
            onClick={() => navigate('/attorney-dashboard/cases/scheduling')}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LinkIcon className="h-4 w-4 text-slate-400" />
            Booking link &amp; availability
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          {view === 'list' ? (
            <AgendaListView
              anchor={anchor}
              items={visibleItems}
              loading={loading}
              onItemClick={openItem}
            />
          ) : view === 'month' ? (
            <MonthView
              anchor={anchor}
              items={visibleItems}
              onDayClick={(day) => openCreate({ date: day, withTime: false })}
              onItemClick={openItem}
              onMore={(day) => {
                setAnchor(day)
                setView('day')
              }}
            />
          ) : (
            <TimeGridView
              days={days}
              items={visibleItems}
              onItemClick={openItem}
              onSlotClick={(day) => {
                const withTime = day.getHours() !== 0 || day.getMinutes() !== 0
                openCreate({ date: day, withTime })
              }}
            />
          )}
        </main>
      </div>

      {/* Add event or task choice modal */}
      {addChoiceOpen && addSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setAddChoiceOpen(false)
              setAddSlot(null)
            }}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Add to calendar</p>
                <h3 className="mt-0.5 text-lg font-semibold text-slate-900">
                  {formatDateForTitle(addSlot.date)}
                  {addSlot.withTime ? (
                    <span className="ml-1 font-normal text-slate-500">
                      · {addSlot.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  ) : null}
                </h3>
              </div>
              <button
                onClick={() => {
                  setAddChoiceOpen(false)
                  setAddSlot(null)
                }}
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
        onClose={() => {
          setLeadPickerOpen(false)
          setAddSlot(null)
          setAddType(null)
        }}
        leads={recentLeads}
        title={
          addSlot
            ? addType === 'task'
              ? `Select case to add task due ${formatDateForTitle(addSlot.date)}`
              : `Select case to add event on ${formatDateForTitle(addSlot.date)}`
            : 'Select case'
        }
        onSelect={handleLeadSelect}
        emptyMessage="No cases available. Add a case first from the dashboard."
      />

      {selectedConsult && (
        <ConsultDetailPanel item={selectedConsult} onClose={() => setSelectedConsult(null)} navigate={navigate} />
      )}
    </div>
  )
}

function FilterToggle({
  label,
  color,
  checked,
  onChange,
}: {
  label: string
  color: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded ${checked ? color : 'bg-white ring-1 ring-inset ring-slate-300'}`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
            <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={checked ? '' : 'text-slate-400'}>{label}</span>
    </button>
  )
}

// Agenda / list view — upcoming items grouped by day within the anchor span.
function AgendaListView({
  anchor,
  items,
  loading,
  onItemClick,
}: {
  anchor: Date
  items: CalItem[]
  loading: boolean
  onItemClick: (item: CalItem) => void
}) {
  const from = startOfDay(anchor)
  const to = addDays(from, LIST_SPAN_DAYS)

  const groups = useMemo(() => {
    const inRange = items
      .filter((i) => i.date >= from && i.date < to)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    const map = new Map<string, { date: Date; items: CalItem[] }>()
    for (const it of inRange) {
      const key = dateKeyOf(it.date)
      const g = map.get(key)
      if (g) g.items.push(it)
      else map.set(key, { date: startOfDay(it.date), items: [it] })
    }
    return Array.from(map.values())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, anchor])

  const dotClass = (i: CalItem) =>
    i.kind === 'task' ? 'bg-amber-500' : i.source === 'booking' ? 'bg-violet-500' : 'bg-sky-500'

  const today = new Date()

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      {groups.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Calendar className="h-6 w-6" />
          </span>
          <p className="text-sm font-medium text-slate-600">
            {loading ? 'Loading…' : 'Nothing scheduled in this range'}
          </p>
          <p className="text-xs text-slate-400">Consultations, bookings and task deadlines will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {groups.map((g) => {
            const isToday = sameDay(g.date, today)
            return (
              <div key={dateKeyOf(g.date)} className="flex gap-4 px-4 py-3 sm:px-5">
                <div className="w-16 shrink-0 pt-1 text-center">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${isToday ? 'text-brand-600' : 'text-slate-400'}`}>
                    {g.date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className={`text-2xl font-bold leading-tight ${isToday ? 'text-brand-600' : 'text-slate-800'}`}>
                    {g.date.getDate()}
                  </p>
                  <p className="text-[11px] text-slate-400">{MONTHS[g.date.getMonth()].slice(0, 3)}</p>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {g.items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => onItemClick(it)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-slate-200 hover:bg-slate-50"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(it)}`} />
                      <span className="w-20 shrink-0 text-xs font-medium text-slate-500">
                        {it.hasTime ? timeLabel(it.date) : 'All day'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{it.title}</span>
                      {it.kind === 'consult' && it.consult?.eventTypeName ? (
                        <span className="hidden shrink-0 truncate text-xs text-slate-400 sm:block">
                          {it.consult.eventTypeName}
                        </span>
                      ) : it.kind === 'task' ? (
                        <span className="hidden shrink-0 text-xs text-amber-600 sm:block">Task</span>
                      ) : null}
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
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
  const isBooking = item.source === 'booking'
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
        <div
          className={`flex items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-br to-white px-5 py-4 ${
            isBooking ? 'from-violet-50' : 'from-sky-50'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset ${
                  isBooking ? 'bg-violet-100 text-violet-600 ring-violet-200' : 'bg-sky-100 text-sky-600 ring-sky-200'
                }`}
              >
                {isBooking ? <LinkIcon className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
              </span>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isBooking ? 'text-violet-600' : 'text-sky-600'
                }`}
              >
                {isBooking ? 'Online booking' : 'Consultation'}
              </span>
            </div>
            <h2 className="mt-2 truncate text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="text-sm text-slate-500">{c.eventTypeName || claimLabel(c.claimType)}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-slate-900">{dateStr}</p>
            <p className="text-sm text-slate-500">
              {timeStr}
              {c.duration ? ` · ${c.duration} min` : ''}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
              STATUS_BADGE[status] || STATUS_BADGE.SCHEDULED
            }`}
          >
            {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase())}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          <DetailRow icon={MeetingIcon} label="Meeting type">
            {meeting.label}
          </DetailRow>
          {isBooking && c.bookerEmail ? (
            <DetailRow icon={UserIcon} label="Booked by">
              <a href={`mailto:${c.bookerEmail}`} className="text-brand-600 hover:underline">
                {c.bookerEmail}
              </a>
            </DetailRow>
          ) : null}
          {c.type === 'in_person' && c.location ? (
            <DetailRow icon={MapPin} label="Location">
              {c.location}
            </DetailRow>
          ) : null}
          {c.type === 'phone' && c.phoneNumber ? (
            <DetailRow icon={Phone} label="Phone">
              <a href={`tel:${c.phoneNumber}`} className="text-brand-600 hover:underline">
                {c.phoneNumber}
              </a>
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
          {isBooking && c.manageToken ? (
            <a
              href={`/booking/manage/${c.manageToken}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              <CalendarClock className="h-4 w-4 text-slate-400" />
              Manage booking (reschedule / cancel)
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
