/**
 * Right-side chat drawer for attorney-plaintiff messaging.
 * Opens from case header "Send Message" button.
 */

import { useState, useEffect, useRef } from 'react'
import { X, Send } from 'lucide-react'
import {
  getOrCreateAttorneyChatRoom,
  getAttorneyChatRoomMessages,
  sendAttorneyMessage,
  markAttorneyMessagesRead,
  getAttorneyMessageTemplates
} from '../lib/api'

interface Message {
  id: string
  content: string
  senderType: 'user' | 'attorney'
  messageType: string
  createdAt: string
  isRead: boolean
}

interface Template {
  id: string
  label: string
  text: string
}

interface ChatDrawerProps {
  open: boolean
  onClose: () => void
  plaintiffName: string
  leadId?: string | null
  userId: string | null
  assessmentId: string | null
  onMessageSent?: () => void
  initialDraft?: string
}

export default function ChatDrawer({
  open,
  onClose,
  plaintiffName,
  leadId,
  userId,
  assessmentId,
  onMessageSent,
  initialDraft = '',
}: ChatDrawerProps) {
  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && userId) {
      setInput(initialDraft)
      loadChat()
    } else if (open) {
      setInput(initialDraft)
    } else if (!open) {
      setChatRoomId(null)
      setMessages([])
      setInput('')
    }
  }, [assessmentId, initialDraft, open, userId])

  useEffect(() => {
    if (!open) return
    getAttorneyMessageTemplates(leadId || undefined).then(setTemplates).catch(() => setTemplates([]))
  }, [leadId, open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChat = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await getOrCreateAttorneyChatRoom(userId, assessmentId || undefined)
      setChatRoomId(res.chatRoomId)
      const msgs = res.messages || await getAttorneyChatRoomMessages(res.chatRoomId)
      setMessages(Array.isArray(msgs) ? msgs : [])
      if (res.chatRoomId) {
        await markAttorneyMessagesRead(res.chatRoomId)
      }
    } catch (err) {
      console.error('Failed to load chat:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !chatRoomId || sending) return
    setSending(true)
    try {
      await sendAttorneyMessage(chatRoomId, text)
      const updated = await getAttorneyChatRoomMessages(chatRoomId)
      setMessages(Array.isArray(updated) ? updated : [])
      setInput('')
      onMessageSent?.()
    } catch (err) {
      console.error('Failed to send:', err)
    } finally {
      setSending(false)
    }
  }

  const applyTemplate = (t: Template) => {
    setInput(t.text)
    setShowTemplates(false)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col border-l border-slate-200"
        role="dialog"
        aria-label="Chat with plaintiff"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-900">Conversation with Plaintiff</h3>
            <p className="text-sm text-slate-600">{plaintiffName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">Loading…</div>
        ) : !userId ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-500">
            <p>This plaintiff has not created an account yet.</p>
            <p className="mt-2 text-sm">They will need to sign in to use in-app messaging.</p>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.senderType === 'attorney' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      m.senderType === 'attorney'
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-900'
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

            <div className="p-4 border-t border-slate-200 bg-white">
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
                          className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
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
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
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
    </>
  )
}
