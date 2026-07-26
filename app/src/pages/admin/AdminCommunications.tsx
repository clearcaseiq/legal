import { useState, useEffect, useCallback } from 'react'
import {
  getAdminNotifications,
  getAdminFailedNotifications,
  getAdminSupportTickets,
  getAdminSupportTicket,
  getAdminRoutingAlerts,
  resendAdminNotification,
  markNotificationResolved,
  updateAdminSupportTicket,
  replyAdminSupportTicket,
} from '../../lib/api'
import { formatDate } from '../../lib/formatters'
import { RefreshCw, AlertTriangle, Send, MessageSquare } from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import {
  Badge,
  DataTable,
  EmptyState as InlineMessage,
  PageHeader,
} from '../../features/shared/ui'

type Tab = 'notifications' | 'failed' | 'tickets' | 'routing-alerts'

function notificationTone(status: string) {
  if (status === 'sent' || status === 'delivered') return 'success' as const
  if (status === 'failed') return 'danger' as const
  return 'neutral' as const
}

export default function AdminCommunications() {
  const [activeTab, setActiveTab] = useState<Tab>('notifications')
  const [notifications, setNotifications] = useState<any[]>([])
  const [failedNotifications, setFailedNotifications] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [routingAlerts, setRoutingAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ticketStatusFilter, setTicketStatusFilter] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [replyText, setReplyText] = useState('')
  const [resending, setResending] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminNotifications({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      })
      setNotifications(data.notifications || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [roleFilter, statusFilter])

  const loadFailed = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminFailedNotifications()
      setFailedNotifications(data.failed || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load failed notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminSupportTickets({
        status: ticketStatusFilter || undefined,
      })
      setTickets(data.tickets || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [ticketStatusFilter])

  const loadRoutingAlerts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminRoutingAlerts()
      setRoutingAlerts(data.alerts || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load routing alerts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'notifications') loadNotifications()
    else if (activeTab === 'failed') loadFailed()
    else if (activeTab === 'tickets') loadTickets()
    else if (activeTab === 'routing-alerts') loadRoutingAlerts()
  }, [activeTab, loadNotifications, loadFailed, loadTickets, loadRoutingAlerts])

  const handleResend = async (id: string) => {
    setResending(id)
    try {
      await resendAdminNotification(id)
      if (activeTab === 'failed') loadFailed()
      else loadNotifications()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Resend failed')
    } finally {
      setResending(null)
    }
  }

  const handleMarkResolved = async (id: string) => {
    try {
      await markNotificationResolved(id)
      loadFailed()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed')
    }
  }

  const handleTicketReply = async () => {
    if (!selectedTicket || !replyText.trim()) return
    try {
      await replyAdminSupportTicket(selectedTicket.id, replyText.trim())
      setReplyText('')
      const updated = await getAdminSupportTicket(selectedTicket.id)
      setSelectedTicket(updated)
      loadTickets()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reply failed')
    }
  }

  const handleTicketStatus = async (ticketId: string, status: string) => {
    try {
      await updateAdminSupportTicket(ticketId, { status })
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status })
      }
      loadTickets()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Update failed')
    }
  }

  const tabs = [
    { id: 'notifications' as Tab, label: 'Notifications' },
    { id: 'failed' as Tab, label: 'Failed notifications' },
    { id: 'tickets' as Tab, label: 'Support tickets' },
    { id: 'routing-alerts' as Tab, label: 'Routing alerts' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communications"
        description="Outbound notifications, delivery failures, support tickets, and routing alerts."
        actions={
          <button
            onClick={() => {
              if (activeTab === 'notifications') loadNotifications()
              else if (activeTab === 'failed') loadFailed()
              else if (activeTab === 'tickets') loadTickets()
              else loadRoutingAlerts()
            }}
            className="btn-outline inline-flex items-center gap-2 text-ui-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">All roles</option>
              <option value="plaintiff">Plaintiff</option>
              <option value="attorney">Attorney</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">All status</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <NotificationsTable
            notifications={notifications}
            loading={loading}
            onResend={handleResend}
            resending={resending}
          />
        </div>
      )}

      {/* Failed notifications tab */}
      {activeTab === 'failed' && (
        <div className="space-y-4">
          <FailedNotificationsTable
            failed={failedNotifications}
            loading={loading}
            onResend={handleResend}
            onMarkResolved={handleMarkResolved}
            resending={resending}
          />
        </div>
      )}

      {/* Support tickets tab */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <select
              value={ticketStatusFilter}
              onChange={(e) => setTicketStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">All status</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="waiting_on_user">Waiting on user</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <div className="surface-panel overflow-hidden">
              {loading ? (
                <InlineMessage message="Loading tickets…" />
              ) : tickets.length === 0 ? (
                <InlineMessage message="No tickets" />
              ) : (
                <div className="divide-y divide-slate-200 max-h-[500px] overflow-y-auto dark:divide-slate-800">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={async () => {
                        const full = await getAdminSupportTicket(t.id)
                        setSelectedTicket(full)
                      }}
                      className={`block w-full p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                        selectedTicket?.id === t.id ? 'bg-brand-50 dark:bg-brand-950/30' : ''
                      }`}
                    >
                      <p className="font-medium text-slate-900 dark:text-slate-100">{t.subject}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t.user?.email || t.attorney?.email} • {t.status} • {t._count?.messages} msgs
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            {selectedTicket ? (
              <TicketDetail
                ticket={selectedTicket}
                onReply={handleTicketReply}
                onStatusChange={handleTicketStatus}
                replyText={replyText}
                setReplyText={setReplyText}
              />
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No ticket selected"
                description="Pick a ticket from the list to read the thread and reply."
                compact
              />
            )}
          </div>
        </div>
      )}

      {/* Routing alerts tab */}
      {activeTab === 'routing-alerts' && (
        <div className="surface-panel p-4">
          <DataTable
            rows={routingAlerts}
            rowKey={(a) => a.id}
            loading={loading}
            loadingMessage="Loading routing alerts…"
            emptyMessage="No routing alerts yet"
            columns={[
              {
                key: 'caseId',
                header: 'Case ID',
                cell: (a: any) => <span className="font-mono">{a.caseId?.slice(0, 8)}…</span>,
              },
              {
                key: 'attorney',
                header: 'Attorney',
                cell: (a: any) => `${a.attorney?.name} (${a.attorney?.email})`,
              },
              { key: 'event', header: 'Event', cell: (a: any) => a.eventType },
              {
                key: 'sentAt',
                header: 'Sent at',
                cell: (a: any) => (
                  <span className="text-slate-600 dark:text-slate-400">
                    {a.sentAt ? formatDate(a.sentAt) : '—'}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                cell: (a: any) => (
                  <Badge tone={a.status === 'sent' ? 'success' : 'neutral'}>{a.status}</Badge>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}

function NotificationsTable({
  notifications,
  loading,
  onResend,
  resending,
}: {
  notifications: any[]
  loading: boolean
  onResend: (id: string) => void
  resending: string | null
}) {
  return (
    <div className="surface-panel p-4">
      <DataTable
        rows={notifications}
        rowKey={(n) => n.id}
        loading={loading}
        loadingMessage="Loading notifications…"
        emptyMessage="No notifications"
        columns={[
          { key: 'event', header: 'Event', cell: (n: any) => n.eventType },
          {
            key: 'recipient',
            header: 'Recipient',
            cell: (n: any) => n.recipient || n.user?.email || n.attorney?.email,
          },
          { key: 'channel', header: 'Channel', cell: (n: any) => n.channel },
          {
            key: 'case',
            header: 'Case',
            cell: (n: any) =>
              n.case?.claimType ? `${n.case.claimType} (${n.case.venueState})` : '—',
          },
          {
            key: 'status',
            header: 'Status',
            cell: (n: any) => <Badge tone={notificationTone(n.status)}>{n.status}</Badge>,
          },
          {
            key: 'sent',
            header: 'Sent',
            cell: (n: any) => (
              <span className="text-slate-600 dark:text-slate-400">
                {n.sentAt ? formatDate(n.sentAt) : '—'}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            cell: (n: any) =>
              n.status === 'failed' ? (
                <button
                  onClick={() => onResend(n.id)}
                  disabled={resending === n.id}
                  className="text-sm font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50 dark:text-brand-400"
                >
                  {resending === n.id ? 'Resending…' : 'Resend'}
                </button>
              ) : null,
          },
        ]}
      />
    </div>
  )
}

function FailedNotificationsTable({
  failed,
  loading,
  onResend,
  onMarkResolved,
  resending,
}: {
  failed: any[]
  loading: boolean
  onResend: (id: string) => void
  onMarkResolved: (id: string) => void
  resending: string | null
}) {
  return (
    <div className="surface-panel p-4">
      <DataTable
        rows={failed}
        rowKey={(f) => f.id}
        loading={loading}
        loadingMessage="Loading failed notifications…"
        emptyMessage="No failed notifications"
        columns={[
          { key: 'recipient', header: 'Recipient', cell: (f: any) => f.recipient },
          { key: 'event', header: 'Event', cell: (f: any) => f.eventType },
          { key: 'channel', header: 'Channel', cell: (f: any) => f.channel },
          {
            key: 'reason',
            header: 'Reason',
            cell: (f: any) => (
              <span className="text-rose-600 dark:text-rose-400">{f.failureReason || '—'}</span>
            ),
          },
          { key: 'retries', header: 'Retries', cell: (f: any) => f.retryCount },
          {
            key: 'lastAttempt',
            header: 'Last attempt',
            cell: (f: any) => (
              <span className="text-slate-600 dark:text-slate-400">
                {f.lastAttemptAt ? formatDate(f.lastAttemptAt) : '—'}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            cell: (f: any) => (
              <div className="flex gap-2">
                <button
                  onClick={() => onResend(f.id)}
                  disabled={resending === f.id}
                  className="text-sm font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50 dark:text-brand-400"
                >
                  {resending === f.id ? 'Retrying…' : 'Retry now'}
                </button>
                <button
                  onClick={() => onMarkResolved(f.id)}
                  className="text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Mark resolved
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

function TicketDetail({
  ticket,
  onReply,
  onStatusChange,
  replyText,
  setReplyText,
}: {
  ticket: any
  onReply: () => void
  onStatusChange: (id: string, status: string) => void
  replyText: string
  setReplyText: (s: string) => void
}) {
  const messages = ticket.messages || []
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="surface-panel space-y-4 p-6">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{ticket.subject}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {ticket.user?.email || ticket.attorney?.email} • {ticket.category} • {ticket.priority}
        </p>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{ticket.description}</p>

      <div className="flex gap-2">
        <select
          value={ticket.status}
          onChange={(e) => onStatusChange(ticket.id, e.target.value)}
          className="input w-auto"
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="waiting_on_user">Waiting on user</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
        <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Messages</h4>
        <div className="max-h-48 space-y-3 overflow-y-auto">
          {messages.length === 0 ? (
            <InlineMessage message="No messages on this ticket yet." />
          ) : (
            messages.map((m: any) => (
              <div
                key={m.id}
                className={`rounded-lg p-3 ${
                  m.senderRole === 'admin'
                    ? 'bg-brand-50 dark:bg-brand-950/30'
                    : 'bg-slate-50 dark:bg-slate-800/60'
                }`}
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {m.senderRole} • {formatDate(m.createdAt)}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{m.body}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {!isClosed && (
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply to ticket…"
            className="input min-h-[80px] flex-1"
            rows={3}
          />
          <button
            onClick={onReply}
            disabled={!replyText.trim()}
            className="btn-primary inline-flex items-center gap-2 self-end"
          >
            <Send className="h-4 w-4" />
            Reply
          </button>
        </div>
      )}
    </div>
  )
}
