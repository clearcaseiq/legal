import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Send, MessagesSquare } from 'lucide-react'
import {
  getFirmColleagues,
  getFirmDirectMessages,
  sendFirmDirectMessage,
  type FirmColleague,
  type FirmDirectMessage,
} from '../../lib/api'
import { PageHeader, Avatar, Badge, EmptyState, initials } from '../shared/ui'

/** How often to refresh the colleague list / open thread while the page is open. */
const POLL_MS = 20_000

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString()
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function TeamMessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [colleagues, setColleagues] = useState<FirmColleague[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('dm'))
  const [messages, setMessages] = useState<FirmDirectMessage[]>([])
  const [activeName, setActiveName] = useState<string>('')
  const [threadLoading, setThreadLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadColleagues = useCallback(async () => {
    try {
      const res = await getFirmColleagues()
      setColleagues(res.colleagues || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load colleagues')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadThread = useCallback(async (userId: string) => {
    setThreadLoading(true)
    try {
      const res = await getFirmDirectMessages(userId)
      setMessages(res.messages || [])
      setActiveName(res.colleague?.name || '')
      // Opening a thread clears its unread badge locally.
      setColleagues((prev) => prev.map((c) => (c.userId === userId ? { ...c, unreadCount: 0 } : c)))
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load conversation')
    } finally {
      setThreadLoading(false)
    }
  }, [])

  useEffect(() => {
    loadColleagues()
    const id = window.setInterval(loadColleagues, POLL_MS)
    return () => window.clearInterval(id)
  }, [loadColleagues])

  useEffect(() => {
    if (!activeId) return
    loadThread(activeId)
    const id = window.setInterval(() => loadThread(activeId), POLL_MS)
    return () => window.clearInterval(id)
  }, [activeId, loadThread])

  useEffect(() => {
    // Auto-scroll to the newest message when the thread changes/grows.
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const openConversation = (userId: string) => {
    setActiveId(userId)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('dm', userId)
      return next
    })
  }

  const handleSend = async () => {
    const body = draft.trim()
    if (!body || !activeId || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await sendFirmDirectMessage(activeId, body)
      setMessages((prev) => [...prev, res.message])
      setDraft('')
      // Reflect the outbound message in the sidebar preview immediately.
      setColleagues((prev) =>
        prev.map((c) =>
          c.userId === activeId
            ? { ...c, lastMessage: { body, at: res.message.at, fromMe: true }, lastMessageAt: res.message.at }
            : c,
        ),
      )
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return colleagues
    return colleagues.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q),
    )
  }, [colleagues, search])

  const totalUnread = colleagues.reduce((s, c) => s + (c.unreadCount || 0), 0)

  // Group the active thread's messages by day for readable separators.
  const grouped = useMemo(() => {
    const groups: Array<{ day: string; items: FirmDirectMessage[] }> = []
    for (const m of messages) {
      const day = dayLabel(m.at)
      const last = groups[groups.length - 1]
      if (last && last.day === day) last.items.push(m)
      else groups.push({ day, items: [m] })
    }
    return groups
  }, [messages])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Team Chat"
        description="Direct messages with colleagues at your firm. Keep quick coordination here; case-specific discussion belongs on the case."
        actions={totalUnread > 0 ? <Badge tone="brand">{totalUnread} unread</Badge> : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Colleague list */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search colleagues…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                {colleagues.length === 0 ? 'No firm colleagues yet.' : 'No matches.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {filtered.map((c) => {
                  const active = c.userId === activeId
                  return (
                    <li key={c.userId}>
                      <button
                        type="button"
                        onClick={() => openConversation(c.userId)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                          active ? 'bg-brand-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <Avatar name={c.name} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-slate-800">{c.name}</span>
                            {c.lastMessageAt && (
                              <span className="shrink-0 text-[11px] text-slate-400">{relativeTime(c.lastMessageAt)}</span>
                            )}
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs text-slate-500">
                              {c.lastMessage
                                ? `${c.lastMessage.fromMe ? 'You: ' : ''}${c.lastMessage.body}`
                                : c.role.replace(/_/g, ' ')}
                            </span>
                            {c.unreadCount > 0 && (
                              <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Conversation */}
        <section className="flex min-h-[60vh] flex-col rounded-xl border border-slate-200 bg-white">
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="text-center">
                <MessagesSquare className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">Select a colleague to start chatting</p>
                <p className="mt-1 text-xs text-slate-400">Your firm teammates appear on the left.</p>
              </div>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                  {initials(activeName || '?')}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{activeName || 'Conversation'}</p>
                  <p className="text-xs text-slate-400">Direct message</p>
                </div>
              </header>

              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
                {threadLoading && messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-400">Loading…</p>
                ) : messages.length === 0 ? (
                  <EmptyState message="No messages yet — say hello." />
                ) : (
                  grouped.map((group) => (
                    <div key={group.day} className="space-y-2">
                      <div className="flex justify-center">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                          {group.day}
                        </span>
                      </div>
                      {group.items.map((m) => (
                        <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                              m.fromMe
                                ? 'rounded-br-sm bg-brand-600 text-white'
                                : 'rounded-bl-sm bg-slate-100 text-slate-800'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p className={`mt-1 text-[10px] ${m.fromMe ? 'text-brand-100' : 'text-slate-400'}`}>
                              {new Date(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 p-3">
                {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void handleSend()
                      }
                    }}
                    rows={1}
                    placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
                    className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!draft.trim() || sending}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
