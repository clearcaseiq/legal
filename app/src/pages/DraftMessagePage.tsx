/**
 * Draft message page - dedicated screen for messaging plaintiff (not post-acceptance).
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { getLead, getOrCreateAttorneyChatRoom, getAttorneyChatRoomMessages, sendAttorneyMessage, markAttorneyMessagesRead, getAttorneyMessageTemplates } from '../lib/api'

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

export default function DraftMessagePage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
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
      getOrCreateAttorneyChatRoom(userId, assessmentId || undefined)
        .then(async (res) => {
          setChatRoomId(res.chatRoomId)
          const msgs = res.messages || await getAttorneyChatRoomMessages(res.chatRoomId)
          setMessages(Array.isArray(msgs) ? msgs : [])
          if (res.chatRoomId) await markAttorneyMessagesRead(res.chatRoomId)
        })
        .catch((err) => setError(err?.message || 'Failed to load chat'))
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

  const caseLabel = lead
    ? `${claimLabel(lead.assessment?.claimType || 'Case')} — ${[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}`
    : ''

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (error && !lead) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="mt-4 px-4 py-2 text-brand-600 hover:underline"
        >
          ← Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/attorney-dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">Message plaintiff</h1>
            <p className="text-sm text-gray-500">{caseLabel}</p>
          </div>
          <div className="w-20" />
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col p-4">
        {!userId ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-500">
            <p>This plaintiff has not created an account yet.</p>
            <p className="mt-2 text-sm">They will need to sign in to use in-app messaging.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto rounded-lg bg-white border border-gray-200 p-4 space-y-3 min-h-[300px]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.senderType === 'attorney' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      m.senderType === 'attorney'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-xs opacity-80 mb-0.5">
                      {m.senderType === 'attorney' ? 'You' : plaintiffName}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              {error && (
                <div className="mb-2 rounded bg-red-50 text-red-700 text-sm px-2 py-1">{error}</div>
              )}
              {templates.length > 0 && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Quick templates
                  </button>
                  {showTemplates && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => applyTemplate(t)}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Type a message…"
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
