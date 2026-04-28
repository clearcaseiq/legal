/**
 * Right-side chat drawer for attorney-plaintiff messaging.
 * Opens from case header "Send Message" button.
 */

import { useState, useEffect, useRef } from 'react'
import { Check, Copy, Send, X } from 'lucide-react'
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
  phone?: string | null
  email?: string | null
  caseLabel?: string
  venue?: string
  lastContactLabel?: string
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
  phone,
  email,
  caseLabel,
  venue,
  lastContactLabel,
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
  const [tone, setTone] = useState<'warm' | 'professional' | 'direct'>('warm')
  const [channel, setChannel] = useState<'in-app' | 'sms' | 'email'>('in-app')
  const [draftSaved, setDraftSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageThreadRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fallbackTemplates = buildDefaultTemplates(plaintiffName)

  useEffect(() => {
    if (open && userId) {
      setInput(initialDraft || buildDefaultDraft(plaintiffName, tone))
      loadChat()
    } else if (open) {
      setInput(initialDraft || buildDefaultDraft(plaintiffName, tone))
    } else if (!open) {
      setChatRoomId(null)
      setMessages([])
      setInput('')
      setDraftSaved(false)
      setCopied(false)
    }
  }, [assessmentId, initialDraft, open, plaintiffName, tone, userId])

  useEffect(() => {
    if (!open) return
    getAttorneyMessageTemplates(leadId || undefined).then(setTemplates).catch(() => setTemplates([]))
  }, [leadId, open])

  useEffect(() => {
    const thread = messageThreadRef.current
    if (thread) {
      thread.scrollTop = thread.scrollHeight
    }
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
    setDraftSaved(false)
    setCopied(false)
  }

  const handleCopy = async () => {
    if (!input.trim()) return
    await navigator.clipboard?.writeText(input)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const handleSaveDraft = () => {
    setDraftSaved(true)
    window.setTimeout(() => setDraftSaved(false), 1800)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed bottom-4 right-0 top-0 z-50 flex min-h-0 w-full max-w-md flex-col overflow-hidden border-l border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-label="Chat with plaintiff"
      >
        <div className="shrink-0 flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Message Client</p>
            <h3 className="font-semibold text-slate-900">{plaintiffName}</h3>
            <p className="mt-1 text-xs text-slate-600">
              {[caseLabel, venue].filter(Boolean).join(' | ') || 'Case context pending'} | Last contact: {lastContactLabel || 'none'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {[phone || 'No phone', email || 'No email'].join(' | ')}
            </p>
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
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5 bg-white">
              <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-950">Message thread</h4>
                    <p className="text-xs text-slate-600">Review the conversation, then send the next message.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                    {channel === 'in-app' ? 'In-app' : channel.toUpperCase()}
                  </span>
                </div>
                <div ref={messageThreadRef} className="mb-3 max-h-48 overflow-y-auto rounded-xl border border-brand-100 bg-white/80 p-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">No prior in-app messages yet.</p>
                  ) : (
                    <div className="space-y-3">
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
                  )}
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Type a message..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-brand-200 bg-white px-3 py-3 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1 rounded-lg bg-white p-1 text-xs shadow-sm">
                    {(['warm', 'professional', 'direct'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setTone(item)
                          setInput(buildDefaultDraft(plaintiffName, item))
                        }}
                        className={`rounded-md px-2 py-1 font-medium capitalize ${tone === item ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 rounded-lg bg-white p-1 text-xs shadow-sm">
                    {(['in-app', 'sms', 'email'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setChannel(item)}
                        className={`rounded-md px-2 py-1 font-medium ${channel === item ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600'}`}
                      >
                        {item === 'in-app' ? 'In-app' : item.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {channel !== 'in-app' && (
                  <p className="mt-2 text-xs text-amber-700">This sends in-app locally; copy for {channel.toUpperCase()}.</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Message templates</h4>
                  <span className="text-xs text-slate-500">Choose one to replace the draft</span>
                </div>
                <div className="grid gap-2">
                  {[...templates, ...fallbackTemplates].slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="group rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm shadow-sm hover:border-brand-200 hover:bg-brand-50"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-900">{t.label}</span>
                        <span className="text-xs font-semibold text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">Use</span>
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs text-slate-500">{t.text}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-6 pt-4">
              <div className="grid grid-cols-2 items-stretch gap-2">
                <button type="button" onClick={handleCopy} disabled={!input.trim()} className="btn-outline inline-flex min-h-10 items-center justify-center text-sm leading-none disabled:opacity-50">
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button type="button" onClick={handleSaveDraft} disabled={!input.trim()} className="btn-outline inline-flex min-h-10 items-center justify-center text-sm leading-none disabled:opacity-50">
                  {draftSaved ? 'Draft saved' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">
                In-app messages are saved to this case activity timeline.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function buildDefaultDraft(plaintiffName: string, tone: 'warm' | 'professional' | 'direct') {
  const firstName = plaintiffName.split(' ')[0] || 'there'
  if (tone === 'direct') {
    return `Hi ${firstName}, this is your attorney. I reviewed your case and need to schedule a consultation to discuss your injuries, treatment, and next steps. What times work for you?`
  }
  if (tone === 'professional') {
    return `Hello ${firstName}, this is your attorney. I have reviewed your case materials and would like to schedule a consultation to discuss the accident, your injuries, and the next steps. Please let me know a convenient time.`
  }
  return `Hi ${firstName}, this is your attorney. I reviewed your case and would like to schedule a quick consultation to talk through the accident, your injuries, and next steps. What time works best for you?`
}

function buildDefaultTemplates(plaintiffName: string): Template[] {
  const firstName = plaintiffName.split(' ')[0] || 'there'
  return [
    {
      id: 'default-intro',
      label: 'Intro after acceptance',
      text: `Hi ${firstName}, this is your attorney. I reviewed your case and would like to schedule a quick consultation to discuss next steps. What time works best for you?`,
    },
    {
      id: 'default-medical-records',
      label: 'Request medical records',
      text: `Hi ${firstName}, could you upload any medical records, bills, discharge papers, or appointment notes related to the accident? These will help us evaluate your claim.`,
    },
    {
      id: 'default-consult',
      label: 'Schedule consultation',
      text: `Hi ${firstName}, I would like to schedule a consultation to review your injuries, treatment, insurance, and next steps. Are you available today or tomorrow?`,
    },
    {
      id: 'default-doc-followup',
      label: 'Missing documents follow-up',
      text: `Hi ${firstName}, I am following up on the missing documents for your case. Please upload anything you have, including photos, police report, insurance information, and medical paperwork.`,
    },
  ]
}
