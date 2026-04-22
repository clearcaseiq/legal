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
import { RefreshCw, AlertTriangle, Send } from 'lucide-react'

type Tab = 'notifications' | 'failed' | 'tickets' | 'routing-alerts'

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Communications</h1>
        <button
          onClick={() => {
            if (activeTab === 'notifications') loadNotifications()
            else if (activeTab === 'failed') loadFailed()
            else if (activeTab === 'tickets') loadTickets()
            else loadRoutingAlerts()
          }}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 flex items-center gap-2">
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
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">All roles</option>
              <option value="plaintiff">Plaintiff</option>
              <option value="attorney">Attorney</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">All status</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="waiting_on_user">Waiting on user</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-500">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto inline-block" />
                </div>
              ) : (
                <div className="divide-y divide-slate-200 max-h-[500px] overflow-y-auto">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={async () => {
                        const full = await getAdminSupportTicket(t.id)
                        setSelectedTicket(full)
                      }}
                      className={`p-4 cursor-pointer hover:bg-slate-50 ${
                        selectedTicket?.id === t.id ? 'bg-brand-50' : ''
                      }`}
                    >
                      <p className="font-medium">{t.subject}</p>
                      <p className="text-sm text-slate-500">
                        {t.user?.email || t.attorney?.email} • {t.status} • {t._count?.messages} msgs
                      </p>
                    </div>
                  ))}
                  {tickets.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No tickets</div>
                  )}
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
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                Select a ticket
              </div>
            )}
          </div>
        </div>
      )}

      {/* Routing alerts tab */}
      {activeTab === 'routing-alerts' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto inline-block text-brand-600" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Case ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Attorney
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Event
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Sent at
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {routingAlerts.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 px-4 text-sm font-mono">{a.caseId?.slice(0, 8)}...</td>
                    <td className="py-3 px-4 text-sm">
                      {a.attorney?.name} ({a.attorney?.email})
                    </td>
                    <td className="py-3 px-4 text-sm">{a.eventType}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {a.sentAt ? formatDate(a.sentAt) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs ${
                          a.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {routingAlerts.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-500">No routing alerts yet</div>
          )}
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
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Event
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Recipient
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Channel
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Case
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Status
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Sent
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {notifications.map((n) => (
            <tr key={n.id}>
              <td className="py-3 px-4 text-sm">{n.eventType}</td>
              <td className="py-3 px-4 text-sm">{n.recipient || n.user?.email || n.attorney?.email}</td>
              <td className="py-3 px-4 text-sm">{n.channel}</td>
              <td className="py-3 px-4 text-sm">
                {n.case?.claimType ? `${n.case.claimType} (${n.case.venueState})` : '—'}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs ${
                    n.status === 'sent' || n.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : n.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {n.status}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {n.sentAt ? formatDate(n.sentAt) : '—'}
              </td>
              <td className="py-3 px-4">
                {n.status === 'failed' && (
                  <button
                    onClick={() => onResend(n.id)}
                    disabled={resending === n.id}
                    className="text-sm text-brand-600 hover:text-brand-800 disabled:opacity-50"
                  >
                    {resending === n.id ? 'Resending...' : 'Resend'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {notifications.length === 0 && (
        <div className="py-12 text-center text-slate-500">No notifications</div>
      )}
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
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Recipient
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Event
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Channel
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Reason
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Retries
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Last attempt
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {failed.map((f) => (
            <tr key={f.id}>
              <td className="py-3 px-4 text-sm">{f.recipient}</td>
              <td className="py-3 px-4 text-sm">{f.eventType}</td>
              <td className="py-3 px-4 text-sm">{f.channel}</td>
              <td className="py-3 px-4 text-sm text-red-600">{f.failureReason || '—'}</td>
              <td className="py-3 px-4 text-sm">{f.retryCount}</td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {f.lastAttemptAt ? formatDate(f.lastAttemptAt) : '—'}
              </td>
              <td className="py-3 px-4 flex gap-2">
                <button
                  onClick={() => onResend(f.id)}
                  disabled={resending === f.id}
                  className="text-sm text-brand-600 hover:text-brand-800 disabled:opacity-50"
                >
                  {resending === f.id ? 'Retrying...' : 'Retry now'}
                </button>
                <button
                  onClick={() => onMarkResolved(f.id)}
                  className="text-sm text-slate-600 hover:text-slate-800"
                >
                  Mark resolved
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {failed.length === 0 && (
        <div className="py-12 text-center text-slate-500">No failed notifications</div>
      )}
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
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">{ticket.subject}</h3>
        <p className="text-sm text-slate-500 mt-1">
          {ticket.user?.email || ticket.attorney?.email} • {ticket.category} • {ticket.priority}
        </p>
      </div>
      <p className="text-sm text-slate-700">{ticket.description}</p>

      <div className="flex gap-2">
        <select
          value={ticket.status}
          onChange={(e) => onStatusChange(ticket.id, e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="waiting_on_user">Waiting on user</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Messages</h4>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {messages.map((m: any) => (
            <div
              key={m.id}
              className={`p-3 rounded-lg ${
                m.senderRole === 'admin' ? 'bg-brand-50' : 'bg-slate-50'
              }`}
            >
              <p className="text-xs text-slate-500">{m.senderRole} • {formatDate(m.createdAt)}</p>
              <p className="text-sm mt-1">{m.body}</p>
            </div>
          ))}
        </div>
      </div>

      {!isClosed && (
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply to ticket..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[80px]"
            rows={3}
          />
          <button
            onClick={onReply}
            disabled={!replyText.trim()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2 self-end"
          >
            <Send className="h-4 w-4" />
            Reply
          </button>
        </div>
      )}
    </div>
  )
}
