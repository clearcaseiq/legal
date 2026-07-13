import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare, Search, PenSquare } from 'lucide-react'
import { getAttorneyUnreadSummary, getAttorneyDashboard } from '../../lib/api'
import LeadPickerModal from '../../components/LeadPickerModal'
import { Avatar, Badge, ClientLink, DataTable, PageHeader, SectionCard, type DataTableColumn } from '../shared/ui'

// Cases the attorney can actually message — identity is revealed once the
// plaintiff is contacted/consulted/retained.
const MESSAGEABLE_STATUSES = new Set(['contacted', 'consulted', 'retained'])

interface Room {
  id: string
  leadId?: string | null
  plaintiff?: { name?: string | null; email?: string | null } | null
  assessment?: { claimType?: string | null } | null
  lastMessage?: { content?: string | null; senderType?: string | null; createdAt?: string | null } | null
  unreadCount?: number
  awaitingReply?: boolean
}

type MsgFilter = 'all' | 'unread' | 'awaiting'

const FILTER_LABEL: Record<MsgFilter, string> = {
  all: 'All conversations',
  unread: 'Unread',
  awaiting: 'Awaiting client reply',
}

const claimLabel = (s?: string | null) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function plaintiffName(room: Room) {
  const n = (room.plaintiff?.name ?? '').trim()
  // Backend uses "Plaintiff" as a placeholder when the user has no name on file.
  return n && n.toLowerCase() !== 'plaintiff' ? n : ''
}

/** Best display name: the plaintiff if we have it, otherwise the claim type. */
function roomName(room: Room) {
  return plaintiffName(room) || claimLabel(room.assessment?.claimType) || 'Client'
}

/** Short relative time for the last activity ("now", "3h", "2d", or a date). */
function relTime(v?: string | null): string {
  if (!v) return ''
  const t = new Date(v).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const min = 60_000
  const hr = 3_600_000
  const day = 86_400_000
  if (diff < min) return 'now'
  if (diff < hr) return `${Math.floor(diff / min)}m ago`
  if (diff < day) return `${Math.floor(diff / hr)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const messageColumns: DataTableColumn<Room>[] = [
  {
    key: 'with',
    header: 'With',
    cell: (room) => {
      const hasName = !!plaintiffName(room)
      const claim = claimLabel(room.assessment?.claimType)
      const unread = (room.unreadCount ?? 0) > 0
      return (
        <div className="flex items-center gap-3">
          <span className="relative">
            <Avatar name={roomName(room)} />
            {unread ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            ) : null}
          </span>
          <div className="min-w-0">
            <ClientLink name={roomName(room)} leadId={room.leadId} section="communications" />
            {hasName && claim ? <p className="truncate text-xs text-slate-400">{claim}</p> : null}
          </div>
        </div>
      )
    },
  },
  {
    key: 'last',
    header: 'Last message',
    cellClassName: 'max-w-md',
    cell: (room) => {
      const last = room.lastMessage
      if (!last?.content) return <span className="text-slate-400">No messages yet</span>
      const prefix = last.senderType === 'attorney' ? 'You: ' : ''
      return (
        <div className="min-w-0">
          <span className={`block truncate ${(room.unreadCount ?? 0) > 0 ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
            {prefix}
            {last.content}
          </span>
          {last.createdAt ? <span className="text-xs text-slate-400">{relTime(last.createdAt)}</span> : null}
        </div>
      )
    },
  },
  {
    key: 'unread',
    header: 'Unread',
    align: 'right',
    cell: (room) =>
      (room.unreadCount ?? 0) > 0 ? (
        <Badge tone="danger">{room.unreadCount}</Badge>
      ) : (
        <span className="text-slate-300">0</span>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    align: 'center',
    cell: (room) =>
      room.awaitingReply ? <Badge tone="warning">Awaiting reply</Badge> : <span className="text-slate-300">—</span>,
  },
  {
    key: 'open',
    header: '',
    align: 'right',
    cell: (room) =>
      room.leadId ? (
        <Link
          to={`/attorney-dashboard/draft-message/${room.leadId}?returnTo=${encodeURIComponent('/attorney-dashboard/cases/messages')}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
          title="Open conversation"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Open
        </Link>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
]

export default function MessagesPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<MsgFilter>('all')
  const [query, setQuery] = useState('')
  const [composeLeads, setComposeLeads] = useState<any[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    // initial=true shows the spinner; poll refreshes are silent so the list
    // doesn't flash while the attorney is reading it.
    const load = async (initial: boolean) => {
      if (initial) setLoading(true)
      try {
        const data = await getAttorneyUnreadSummary()
        if (!cancelled) {
          setRooms(Array.isArray(data?.rooms) ? data.rooms : [])
          setError(null)
        }
      } catch (err: any) {
        if (!cancelled && initial) setError(err?.response?.data?.error || err?.message || 'Failed to load messages')
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }
    load(true)
    const id = window.setInterval(() => load(false), 30_000)
    const onFocus = () => load(false)
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  // Caseload for the "New message" picker — only cases we can message.
  useEffect(() => {
    let cancelled = false
    getAttorneyDashboard()
      .then((dash: any) => {
        if (cancelled) return
        const leads = ((dash?.recentLeads as any[]) || []).filter((l) => MESSAGEABLE_STATUSES.has(l?.status))
        setComposeLeads(leads)
      })
      .catch(() => setComposeLeads([]))
    return () => {
      cancelled = true
    }
  }, [])

  const openThread = (lead: any) => {
    if (!lead?.id) return
    navigate(`/attorney-dashboard/draft-message/${lead.id}?returnTo=${encodeURIComponent('/attorney-dashboard/cases/messages')}`)
  }

  const counts = useMemo(() => {
    let unread = 0
    let awaiting = 0
    for (const room of rooms) {
      if ((room.unreadCount ?? 0) > 0) unread += 1
      if (room.awaitingReply) awaiting += 1
    }
    return { unread, awaiting, total: rooms.length }
  }, [rooms])

  const visible = useMemo(() => {
    let list = rooms
    if (filter === 'unread') list = list.filter((r) => (r.unreadCount ?? 0) > 0)
    else if (filter === 'awaiting') list = list.filter((r) => r.awaitingReply)

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((r) => {
        const hay = [roomName(r), claimLabel(r.assessment?.claimType), r.lastMessage?.content]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }

    // Sort: unread first, then most-recent activity.
    return [...list].sort((a, b) => {
      const au = (a.unreadCount ?? 0) > 0 ? 1 : 0
      const bu = (b.unreadCount ?? 0) > 0 ? 1 : 0
      if (au !== bu) return bu - au
      const at = a.lastMessage?.createdAt ? Date.parse(a.lastMessage.createdAt) : 0
      const bt = b.lastMessage?.createdAt ? Date.parse(b.lastMessage.createdAt) : 0
      return bt - at
    })
  }, [rooms, filter, query])

  const segments: { id: MsgFilter; label: string; count: number; idle: string }[] = [
    { id: 'all', label: 'All', count: counts.total, idle: 'text-slate-500' },
    { id: 'unread', label: 'Unread', count: counts.unread, idle: 'text-rose-600' },
    { id: 'awaiting', label: 'Awaiting reply', count: counts.awaiting, idle: 'text-amber-600' },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        description="Client and adjuster threads across every case, with unread and awaiting-reply rollups."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <PenSquare className="h-4 w-4" />
              New message
            </button>
          </div>
        }
      />

      <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {segments.map((s) => {
          const active = filter === s.id
          return (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                active ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                  active ? 'bg-white/25 text-white' : `bg-slate-100 ${s.idle}`
                }`}
              >
                {s.count}
              </span>
            </button>
          )
        })}
      </div>

      <SectionCard title={FILTER_LABEL[filter]} trailing={<Badge tone="brand">{visible.length} shown</Badge>}>
        <DataTable
          columns={messageColumns}
          rows={visible}
          rowKey={(room) => room.id}
          loading={loading}
          error={error}
          loadingMessage="Loading conversations…"
          emptyMessage={query.trim() ? 'No conversations match your search.' : 'No conversations match this filter.'}
        />
      </SectionCard>

      <LeadPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        leads={composeLeads}
        title="New message — select a case"
        onSelect={openThread}
        emptyMessage="No messageable cases yet. You can message a client once they've been contacted or retained."
      />
    </div>
  )
}
