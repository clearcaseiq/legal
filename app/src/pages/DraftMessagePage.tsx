/**
 * Draft message page - dedicated full-page thread for messaging a plaintiff.
 */
import { useState, useEffect, useRef, Fragment } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Send, MessageSquare, FolderOpen, Sparkles, Loader2, UserRound } from 'lucide-react'
import { BackButton } from '../features/shared/ui'
import { getLead, getOrCreateAttorneyChatRoom, getAttorneyChatRoomMessages, sendAttorneyMessage, markAttorneyMessagesRead, getAttorneyMessageTemplates } from '../lib/api'

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const timeLabel = (v: string) => {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const dayLabel = (v: string) => {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function DraftMessagePage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Return to wherever the user came from. Honor an explicit ?returnTo= path,
  // otherwise fall back to browser history (so Back never dumps you on New Matches).
  const returnToRaw = searchParams.get('returnTo')
  const returnTo = returnToRaw && returnToRaw.startsWith('/') ? returnToRaw : null
  const goBack = () => (returnTo ? navigate(returnTo) : navigate(-1))

  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [chatLoading, setChatLoading] = useState(true)
  const [input, setInput] = useState('')
  const [templates, setTemplates] = useState<any[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const userId = lead?.assessment?.userId ?? lead?.assessment?.user?.id ?? null
  const assessmentId = lead?.assessmentId ?? null
  const plaintiffName = lead?.assessment?.user
    ? `${lead.assessment.user.firstName || ''} ${lead.assessment.user.lastName || ''}`.trim() || 'Plaintiff'
    : 'Plaintiff'

  useEffect(() => {
    if (!leadId) {
      setError('No case selected')
      setLoading(false)
      return
    }
    getLead(leadId)
      .then(setLead)
      .catch((err: any) => setError(err?.response?.data?.error || err?.message || 'Failed to load case'))
      .finally(() => setLoading(false))
  }, [leadId])

  useEffect(() => {
    if (lead && userId) {
      setChatLoading(true)
      getOrCreateAttorneyChatRoom(userId, assessmentId || undefined)
        .then(async (res) => {
          setChatRoomId(res.chatRoomId)
          const msgs = res.messages || await getAttorneyChatRoomMessages(res.chatRoomId)
          setMessages(Array.isArray(msgs) ? msgs : [])
          if (res.chatRoomId) await markAttorneyMessagesRead(res.chatRoomId)
        })
        .catch((err) => setError(err?.message || 'Failed to load chat'))
        .finally(() => setChatLoading(false))
    } else if (lead) {
      setChatLoading(false)
    }
  }, [lead, userId, assessmentId])

  useEffect(() => {
    getAttorneyMessageTemplates().then(setTemplates).catch(() => setTemplates([]))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !chatRoomId || sending) return
    setSending(true)
    try {
      await sendAttorneyMessage(chatRoomId, text)
      const updated = await getAttorneyChatRoomMessages(chatRoomId)
      setMessages(Array.isArray(updated) ? updated : [])
      setInput('')
    } catch (err: any) {
      setError(err?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const applyTemplate = (t: any) => {
    setInput(t.text)
    setShowTemplates(false)
  }

  const venue = lead ? [lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—' : ''
  const caseType = lead ? claimLabel(lead.assessment?.claimType || 'Case') : ''

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
      </div>
    )
  }

  if (error && !lead) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
        <BackButton onClick={goBack} label="Back" className="mt-4" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <BackButton onClick={goBack} label="Back" className="mb-4" />

        {/* Plaintiff header card */}
        <div className="flex items-center gap-3 rounded-t-2xl border border-slate-200 bg-white px-5 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
            {initials(plaintiffName)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-slate-900">{plaintiffName}</h1>
            <p className="truncate text-sm text-slate-500">
              {caseType} · {venue}
            </p>
          </div>
          {leadId ? (
            <Link
              to={`/attorney-dashboard/cases/${leadId}/overview`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              <FolderOpen className="h-4 w-4 text-slate-400" />
              <span className="hidden sm:inline">View case</span>
            </Link>
          ) : null}
        </div>

        {/* Conversation */}
        <div className="flex h-[calc(100vh-320px)] min-h-[360px] flex-col border-x border-slate-200 bg-slate-50/60">
          {!userId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                <UserRound className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-700">This plaintiff hasn't created an account yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                They'll need to sign in to the client portal before in-app messaging is available.
              </p>
            </div>
          ) : chatLoading ? (
            <div className="flex flex-1 items-center justify-center text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-500 ring-1 ring-inset ring-brand-100">
                <MessageSquare className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-700">No messages yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Start the conversation with {plaintiffName.split(' ')[0]} below — or use a quick template.
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => {
                const mine = m.senderType === 'attorney'
                const prevDay = i > 0 ? new Date(messages[i - 1].createdAt).toDateString() : ''
                const thisDay = new Date(m.createdAt).toDateString()
                const showSep = thisDay !== prevDay
                return (
                  <Fragment key={m.id}>
                    {showSep ? (
                      <div className="flex items-center justify-center py-3">
                        <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          {dayLabel(m.createdAt)}
                        </span>
                      </div>
                    ) : null}
                    <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine ? (
                        <span className="mb-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                          {initials(plaintiffName)}
                        </span>
                      ) : null}
                      <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                            mine
                              ? 'rounded-br-sm bg-brand-600 text-white'
                              : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                        <p className={`mt-1 px-1 text-[11px] text-slate-400 ${mine ? 'text-right' : 'text-left'}`}>
                          {mine ? 'You' : plaintiffName.split(' ')[0]} · {timeLabel(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Fragment>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="rounded-b-2xl border border-slate-200 bg-white px-4 py-3">
          {error && userId ? (
            <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700">{error}</div>
          ) : null}
          {userId && templates.length > 0 ? (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Quick templates
              </button>
              {showTemplates ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={!userId}
              placeholder={userId ? 'Type a message…  (Enter to send, Shift+Enter for a new line)' : 'Messaging unavailable until the plaintiff signs in'}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || !userId}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
