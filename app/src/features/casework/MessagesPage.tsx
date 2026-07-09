import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { getAttorneyUnreadSummary } from '../../lib/api'
import { Avatar, Badge, ClientLink, DataTable, FilterStat, PageHeader, SectionCard, StatGrid, type DataTableColumn } from '../shared/ui'

interface Room {
  id: string
  leadId?: string | null
  plaintiff?: { firstName?: string | null; lastName?: string | null } | null
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

function roomName(room: Room) {
  const name = `${room.plaintiff?.firstName ?? ''} ${room.plaintiff?.lastName ?? ''}`.trim()
  return name || room.assessment?.claimType || 'Client'
}

const messageColumns: DataTableColumn<Room>[] = [
  {
    key: 'with',
    header: 'With',
    cell: (room) => (
      <div className="flex items-center gap-3">
        <Avatar name={roomName(room)} />
        <ClientLink name={roomName(room)} leadId={room.leadId} section="communications" />
      </div>
    ),
  },
  {
    key: 'last',
    header: 'Last message',
    cellClassName: 'max-w-md',
    cell: (room) => {
      const last = room.lastMessage
      if (!last?.content) return <span className="text-slate-400">—</span>
      const prefix = last.senderType === 'attorney' ? 'You: ' : ''
      return <span className="block truncate text-slate-500">{prefix}{last.content}</span>
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
        <span className="text-slate-400">0</span>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    cell: (room) =>
      room.awaitingReply ? <Badge tone="warning">Awaiting reply</Badge> : <span className="text-slate-400">—</span>,
  },
  {
    key: 'open',
    header: '',
    align: 'right',
    cell: (room) =>
      room.leadId ? (
        <Link
          to={`/attorney-dashboard/draft-message/${room.leadId}`}
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
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<MsgFilter>('all')

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
    if (filter === 'unread') return rooms.filter((r) => (r.unreadCount ?? 0) > 0)
    if (filter === 'awaiting') return rooms.filter((r) => r.awaitingReply)
    return rooms
  }, [rooms, filter])

  const toggle = (key: MsgFilter) => setFilter((prev) => (prev === key ? 'all' : key))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        description="Client and adjuster threads across every case, with unread and awaiting-reply rollups."
      />

      <StatGrid columns={3}>
        <FilterStat value={counts.unread} label="Unread" tone="danger" active={filter === 'unread'} onClick={() => toggle('unread')} />
        <FilterStat value={counts.awaiting} label="Awaiting client reply" tone="warning" active={filter === 'awaiting'} onClick={() => toggle('awaiting')} />
        <FilterStat value={counts.total} label="Conversations" active={filter === 'all'} onClick={() => setFilter('all')} />
      </StatGrid>

      <SectionCard title={FILTER_LABEL[filter]} trailing={<Badge tone="brand">{visible.length} shown</Badge>}>
        <DataTable
          columns={messageColumns}
          rows={visible}
          rowKey={(room) => room.id}
          loading={loading}
          error={error}
          loadingMessage="Loading conversations…"
          emptyMessage="No conversations match this filter."
        />
      </SectionCard>
    </div>
  )
}
