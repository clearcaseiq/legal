/**
 * Floating AI Help Assistant.
 *
 * A clearly-labeled AI chatbot that answers questions about how ClearCaseIQ
 * works (grounded server-side in the Help Center knowledge base) and can hand
 * off to the human support team via the support request form. Rendered site-wide
 * from the public Layout.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotMessageSquare, X, Send, LifeBuoy, Loader2 } from 'lucide-react'
import { sendSupportChatMessage, type SupportChatMessage } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import DraggableFab from './DraggableFab'

export default function SupportChatWidget({ raiseOnMobile = false }: { raiseOnMobile?: boolean } = {}) {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const [open, setOpen] = useState(false)
  // The greeting bubble is rendered separately (not stored in state) so it
  // re-translates live when the visitor switches languages.
  const [messages, setMessages] = useState<SupportChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showEscalate, setShowEscalate] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Only auto-focus on larger screens: on phones, focusing immediately pops
    // the keyboard and (on iOS, for inputs under 16px) auto-zooms the page,
    // which made the panel overflow the viewport.
    if (open && typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const ask = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    const next: SupportChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setSending(true)
    try {
      // Send only the recent turns; the server prepends its own system prompt.
      const res = await sendSupportChatMessage(next.slice(-16), language)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
      if (res.escalate) setShowEscalate(true)
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('chat.errUnreachable') },
      ])
      setShowEscalate(true)
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ask(input)
  }

  const goToSupport = () => {
    setOpen(false)
    navigate('/help#submit-request')
  }

  return (
    <>
      {/* Launcher — draggable so it can sit clear of Message Attorney / CTAs */}
      {!open && (
        <DraggableFab
          storageKey="cciq.fab.supportChat"
          defaultCorner={{ right: 16, bottom: raiseOnMobile ? 96 : 16 }}
          ariaLabel={t('chat.openLabel')}
          zIndex={40}
          onActivate={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <BotMessageSquare className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">{t('chat.needHelp')}</span>
        </DraggableFab>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t('chat.title')}
          // Cap to the dynamic viewport so the panel (and composer) never
          // spills off-screen on mobile when the keyboard opens (CP-550).
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(80vh,calc(100dvh-1.5rem))] w-auto max-w-[calc(100vw-1.5rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[24rem] sm:max-h-[70vh] sm:max-w-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <BotMessageSquare className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-semibold leading-tight">{t('chat.title')}</h2>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">AI</span>
                </div>
                <p className="text-[11px] text-white/80">{t('chat.subtitle')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('chat.closeLabel')}
              className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {/* Greeting bubble, always first; translated live. */}
            <div className="flex justify-start">
              <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800">
                {t('chat.greeting')}
              </div>
            </div>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-md bg-brand-600 text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t('chat.thinking')}
                </div>
              </div>
            )}

            {/* Suggested prompts (only before the user has asked anything) */}
            {messages.length === 0 && !sending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => ask(t(`chat.suggestion${n}`))}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    {t(`chat.suggestion${n}`)}
                  </button>
                ))}
              </div>
            )}

            {showEscalate && (
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
                <p className="text-xs text-slate-600">{t('chat.escalatePrompt')}</p>
                <button
                  type="button"
                  onClick={goToSupport}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
                  {t('chat.contactSupport')}
                </button>
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={handleSubmit} className="min-w-0 border-t border-slate-200 bg-white px-3 py-3">
            <div className="flex min-w-0 items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                rows={1}
                placeholder={t('chat.placeholder')}
                className="max-h-28 min-h-[2.5rem] min-w-0 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500 sm:text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label={t('chat.sendLabel')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-slate-400">
              {t('chat.disclaimer')}
            </p>
          </form>
        </div>
      )}
    </>
  )
}
