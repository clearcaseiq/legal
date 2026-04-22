/**
 * ClearCaseIQ Rose - conversational AI intake guide
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  startRoseConversation,
  sendRoseTurn,
  type RoseConversationPhase,
  type RoseConversationReview,
} from '../lib/api'
import {
  Bot,
  User,
  Mic,
  MicOff,
  Sparkles,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react'
import rosePortrait from '../assets/rose-avatar-cartoon.png'

type ChatMessage = {
  id: string
  role: 'rose' | 'user'
  text: string
}

type SubmissionState = {
  caseId: string
  plaintiffSummary?: string
}

type VoiceLanguageKey = 'en' | 'es' | 'zh'

const VOICE_LANGUAGES: Record<
  VoiceLanguageKey,
  {
    label: string
    recognitionLang: string
    speechLang: string
    composerPlaceholder: string
    preferredVoiceHints: string[]
  }
> = {
  en: {
    label: 'English',
    recognitionLang: 'en-US',
    speechLang: 'en-US',
    composerPlaceholder: 'Tell Rose what happened...',
    preferredVoiceHints: ['zira', 'jenny', 'aria', 'ava', 'samantha', 'female'],
  },
  es: {
    label: 'Español',
    recognitionLang: 'es-US',
    speechLang: 'es-US',
    composerPlaceholder: 'Cuéntale a Rose lo que pasó...',
    preferredVoiceHints: ['paulina', 'helena', 'monica', 'soledad', 'sabina', 'female'],
  },
  zh: {
    label: '中文',
    recognitionLang: 'zh-CN',
    speechLang: 'zh-CN',
    composerPlaceholder: '告诉 Rose 发生了什么……',
    preferredVoiceHints: ['xiaoxiao', 'xiaoyi', 'mei-jia', 'sin-ji', 'female'],
  },
}

function getInitialTypingVisibleLength(text: string) {
  if (text.length <= 24) return text.length
  if (text.length <= 80) return Math.min(text.length, 18)
  return Math.min(text.length, Math.max(24, Math.floor(text.length * 0.35)))
}

function useSpeechSynthesis(
  enabled: boolean,
  language: VoiceLanguageKey,
  callbacks?: {
    onSpeechStart?: (messageId?: string, text?: string) => void
    onSpeechBoundary?: (messageId: string | undefined, charIndex: number, text: string) => void
    onSpeechEnd?: (messageId?: string, text?: string) => void
  },
) {
  const [speaking, setSpeaking] = useState(false)

  const speak = (text: string, messageId?: string) => {
    if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const languageConfig = VOICE_LANGUAGES[language]
    const matchingVoices = voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(languageConfig.speechLang.toLowerCase().slice(0, 2)),
    )
    const preferred = matchingVoices.find((voice) => {
      const normalizedName = voice.name.toLowerCase()
      return languageConfig.preferredVoiceHints.some((hint) => normalizedName.includes(hint))
    }) || matchingVoices[0] || voices[0]
    if (preferred) utterance.voice = preferred
    utterance.lang = languageConfig.speechLang
    utterance.rate = 1
    utterance.pitch = 1.02
    utterance.onstart = () => {
      setSpeaking(true)
      callbacks?.onSpeechStart?.(messageId, text)
    }
    utterance.onboundary = (event: any) => {
      const charIndex = typeof event?.charIndex === 'number' ? event.charIndex : 0
      callbacks?.onSpeechBoundary?.(messageId, charIndex, text)
    }
    utterance.onend = () => {
      setSpeaking(false)
      callbacks?.onSpeechEnd?.(messageId, text)
    }
    utterance.onerror = () => {
      setSpeaking(false)
      callbacks?.onSpeechEnd?.(messageId, text)
    }
    window.speechSynthesis.speak(utterance)
  }

  const stop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }

  return { speak, stop, speaking }
}

function useVoiceInput(
  enabled: boolean,
  recognitionLang: string,
  onTranscript: (t: string) => void,
  onFinalTranscript?: (t: string) => void,
) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptRef = useRef('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setSupported(false)
      return
    }

    setSupported(true)
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = recognitionLang
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onstart = () => {
      transcriptRef.current = ''
      setListening(true)
    }
    recognition.onend = () => {
      setListening(false)
      const finalTranscript = transcriptRef.current.trim()
      transcriptRef.current = ''
      if (finalTranscript) {
        onFinalTranscript?.(finalTranscript)
      }
    }
    recognition.onerror = () => setListening(false)
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      transcriptRef.current = transcript.trim()
      onTranscript(transcript)
    }
    recognitionRef.current = recognition

    return () => {
      recognition.stop?.()
      recognitionRef.current = null
    }
  }, [onFinalTranscript, onTranscript, recognitionLang])

  const startListening = () => {
    if (!enabled || !recognitionRef.current) return
    recognitionRef.current.lang = recognitionLang
    try {
      recognitionRef.current.start()
    } catch (error: any) {
      if (error?.name !== 'InvalidStateError') {
        throw error
      }
    }
  }

  const stopListening = () => {
    recognitionRef.current?.stop?.()
  }

  return { listening, supported, startListening, stopListening }
}

function Message({
  role,
  children,
  isTyping = false,
}: {
  role: 'rose' | 'user'
  children: React.ReactNode
  isTyping?: boolean
}) {
  const isRose = role === 'rose'

  return (
    <div className={`flex ${isRose ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[92%] items-start gap-3 ${isRose ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
          {isRose ? <Bot className="h-4 w-4 text-brand-600" /> : <User className="h-4 w-4 text-gray-600" />}
        </div>
        <div className={`rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${isRose ? 'bg-white text-gray-900 border border-gray-200' : 'bg-brand-600 text-white'}`}>
          {children}
          {isTyping && <span className="rose-typing-cursor ml-1 inline-block h-4 w-0.5 rounded-full bg-brand-500 align-[-2px]" />}
        </div>
      </div>
    </div>
  )
}

function RoseAvatar({ speaking, language }: { speaking: boolean; language: VoiceLanguageKey }) {
  return (
    <div className="relative mx-auto flex w-full items-center justify-between gap-6 overflow-hidden rounded-[2rem] border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-2xl">
      <div className={`absolute -left-6 top-4 h-44 w-44 rounded-full bg-fuchsia-400/20 blur-3xl transition-opacity duration-500 ${speaking ? 'opacity-70' : 'opacity-40'}`} />
      <div className={`absolute right-4 top-8 h-36 w-36 rounded-full bg-violet-300/15 blur-3xl transition-opacity duration-500 ${speaking ? 'opacity-60' : 'opacity-30'}`} />
      <div className="relative z-10 flex items-center gap-5">
        <div className="relative">
          <div className={`absolute inset-0 rounded-[1.75rem] bg-white/10 blur-xl transition-opacity ${speaking ? 'opacity-100' : 'opacity-40'}`} />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-2">
            <img
              src={rosePortrait.src}
              alt="Rose, the ClearCaseIQ conversational intake assistant"
              className="h-28 w-28 rounded-[1.25rem] object-cover"
            />
            {speaking && (
              <>
                <div className="pointer-events-none absolute -right-2 top-5 flex items-center gap-1 rounded-full bg-white/12 px-2 py-1 backdrop-blur">
                  <span className="rose-speaking-dot h-2 w-2 rounded-full bg-pink-200" />
                  <span className="rose-speaking-dot h-2 w-2 rounded-full bg-white/90 [animation-delay:140ms]" />
                  <span className="rose-speaking-dot h-2 w-2 rounded-full bg-pink-100 [animation-delay:280ms]" />
                </div>
                <div className="rose-speaking-bars pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-center gap-1">
                  <span className="h-3 w-1.5 rounded-full bg-white/90" />
                  <span className="h-5 w-1.5 rounded-full bg-pink-200 [animation-delay:120ms]" />
                  <span className="h-4 w-1.5 rounded-full bg-white/90 [animation-delay:240ms]" />
                  <span className="h-6 w-1.5 rounded-full bg-pink-200 [animation-delay:360ms]" />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="max-w-md">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-semibold tracking-tight">Rose</div>
          </div>
          <div className="mt-1 text-sm text-white/80">Conversational intake assistant</div>
          <div className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
            Conversation language: {VOICE_LANGUAGES[language].label}
          </div>
          <div className="mt-3 text-sm leading-6 text-white/75">
            Speak naturally and Rose will keep the intake moving like a live conversation.
          </div>
        </div>
      </div>
    </div>
  )
}

function LanguagePicker({
  value,
  onChange,
}: {
  value: VoiceLanguageKey
  onChange: (value: VoiceLanguageKey) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.entries(VOICE_LANGUAGES) as Array<[VoiceLanguageKey, (typeof VOICE_LANGUAGES)[VoiceLanguageKey]]>).map(([key, config]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            value === key
              ? 'bg-brand-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {config.label}
        </button>
      ))}
    </div>
  )
}

export default function RoseIntake() {
  const navigate = useNavigate()
  const [launched, setLaunched] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<RoseConversationPhase>('story_capture')
  const [input, setInput] = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [language, setLanguage] = useState<VoiceLanguageKey>('en')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [review, setReview] = useState<RoseConversationReview | null>(null)
  const [submission, setSubmission] = useState<SubmissionState | null>(null)
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
  const [typingTargetText, setTypingTargetText] = useState('')
  const [typingVisibleLength, setTypingVisibleLength] = useState(0)
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null)
  const [speechBoundarySeen, setSpeechBoundarySeen] = useState(false)
  const [error, setError] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const voiceBaseRef = useRef('')
  const voiceConversationRef = useRef(false)
  const conversationIdRef = useRef<string | null>(null)
  const startListeningRef = useRef<() => void>(() => {})
  const loadingRef = useRef(false)
  const launchedRef = useRef(false)
  const submissionRef = useRef(false)
  const typingMessageIdRef = useRef<string | null>(null)
  const typingTargetTextRef = useRef('')

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    launchedRef.current = launched
  }, [launched])

  useEffect(() => {
    submissionRef.current = Boolean(submission)
  }, [submission])

  useEffect(() => {
    typingMessageIdRef.current = typingMessageId
  }, [typingMessageId])

  useEffect(() => {
    typingTargetTextRef.current = typingTargetText
  }, [typingTargetText])

  const handleTranscript = useCallback((transcript: string) => {
    setInput(() => {
      const base = voiceBaseRef.current.trimEnd()
      return base ? `${base}\n${transcript}` : transcript
    })
  }, [])

  const lastRoseMessage = [...messages].reverse().find((message) => message.role === 'rose')
  const liveTranscript = input.trim()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
    }
  }, [])

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
    }
  }, [messages, review, submission])

  useEffect(() => {
    if (typingMessageId && typingVisibleLength >= typingTargetText.length) {
      setTypingMessageId(null)
    }
  }, [typingMessageId, typingTargetText.length, typingVisibleLength])

  const beginListeningIfNeeded = useCallback(() => {
    if (
      !voiceConversationRef.current ||
      !launchedRef.current ||
      loadingRef.current ||
      submissionRef.current
    ) {
      return
    }

    voiceBaseRef.current = ''
    startListeningRef.current()
  }, [])

  const handleSpeechStart = useCallback((messageId?: string) => {
    setActiveSpeechMessageId(messageId ?? null)
    setSpeechBoundarySeen(false)
  }, [])

  const handleSpeechBoundary = useCallback((messageId: string | undefined, charIndex: number, text: string) => {
    if (!messageId || typingMessageIdRef.current !== messageId) return

    setSpeechBoundarySeen(true)
    setTypingVisibleLength((current) => Math.max(current, Math.min(text.length, charIndex + 1)))
  }, [])

  const handleSpeechEnd = useCallback((messageId?: string, text?: string) => {
    if (messageId && typingMessageIdRef.current === messageId && text) {
      setTypingVisibleLength(text.length)
    }

    setActiveSpeechMessageId(null)
    setSpeechBoundarySeen(false)
    beginListeningIfNeeded()
  }, [beginListeningIfNeeded])

  const { speak, stop, speaking } = useSpeechSynthesis(
    voiceEnabled && launched,
    language,
    {
      onSpeechStart: handleSpeechStart,
      onSpeechBoundary: handleSpeechBoundary,
      onSpeechEnd: handleSpeechEnd,
    },
  )

  useEffect(() => {
    if (!typingMessageId || typingVisibleLength >= typingTargetText.length) return
    if (speaking && activeSpeechMessageId === typingMessageId && speechBoundarySeen) return

    const totalLength = typingTargetText.length
    const baseDelayMs =
      totalLength <= 40
        ? 16
        : totalLength <= 120
          ? 24
          : 34

    const timeout = window.setTimeout(() => {
      setTypingVisibleLength((current) => {
        if (current >= typingTargetText.length) {
          return current
        }

        const remaining = typingTargetText.length - current
        const step =
          totalLength <= 40
            ? Math.max(2, remaining > 18 ? 3 : 2)
            : totalLength <= 120
              ? remaining > 70 ? 4 : remaining > 30 ? 3 : 2
              : remaining > 120 ? 5 : remaining > 60 ? 4 : remaining > 20 ? 3 : 2

        return Math.min(current + step, typingTargetText.length)
      })
    }, (() => {
      const previousChar = typingVisibleLength > 0 ? typingTargetText[typingVisibleLength - 1] : ''
      if (/[.!?]/.test(previousChar)) return baseDelayMs + 110
      if (/[,;:]/.test(previousChar)) return baseDelayMs + 55
      return baseDelayMs
    })())

    return () => window.clearTimeout(timeout)
  }, [activeSpeechMessageId, speaking, speechBoundarySeen, typingMessageId, typingTargetText, typingVisibleLength])

  useEffect(() => {
    if (!typingMessageId || speaking) return
    setTypingVisibleLength(typingTargetText.length)
  }, [speaking, typingMessageId, typingTargetText])

  const send = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim()
      if (!conversationIdRef.current || !trimmed || loadingRef.current) return

      setLoading(true)
      setError('')
      setInput('')
      voiceBaseRef.current = ''
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: trimmed }])

      try {
        const result = await sendRoseTurn(conversationIdRef.current, trimmed)
        const roseMessage = { id: crypto.randomUUID(), role: 'rose' as const, text: result.message }
        setPhase(result.phase)
        setReview(result.review ?? null)
        setTypingMessageId(roseMessage.id)
        setTypingTargetText(roseMessage.text)
        setTypingVisibleLength(getInitialTypingVisibleLength(roseMessage.text))
        setMessages((current) => [...current, roseMessage])

        if (result.assessment_id) {
          voiceConversationRef.current = false
          setSubmission({
            caseId: result.assessment_id,
            plaintiffSummary: result.plaintiff_summary ?? result.review?.plaintiff_summary,
          })
        }

        const canSpeakNow = voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window
        if (canSpeakNow) {
          speak(result.message, roseMessage.id)
        } else {
          window.setTimeout(() => beginListeningIfNeeded(), 0)
        }
      } catch (err: any) {
        voiceConversationRef.current = false
        setError(err?.response?.data?.error ?? err?.message ?? 'Unable to send message.')
      } finally {
        setLoading(false)
      }
    },
    [beginListeningIfNeeded, speak, voiceEnabled],
  )

  const handleFinalTranscript = useCallback(
    (transcript: string) => {
      const base = voiceBaseRef.current.trimEnd()
      const message = base ? `${base}\n${transcript}` : transcript
      if (!message.trim()) return
      void send(message)
    },
    [send],
  )

  const { listening, supported: voiceSupported, startListening, stopListening } = useVoiceInput(
    launched,
    VOICE_LANGUAGES[language].recognitionLang,
    handleTranscript,
    handleFinalTranscript,
  )

  useEffect(() => {
    startListeningRef.current = startListening
  }, [startListening])

  useEffect(() => {
    if (
      !launched ||
      !voiceSupported ||
      !voiceConversationRef.current ||
      loading ||
      speaking ||
      listening ||
      submission
    ) {
      return
    }

    const timeout = window.setTimeout(() => beginListeningIfNeeded(), 350)
    return () => window.clearTimeout(timeout)
  }, [beginListeningIfNeeded, launched, listening, loading, speaking, submission, voiceSupported])

  const launch = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await startRoseConversation()
      const roseMessage = { id: crypto.randomUUID(), role: 'rose' as const, text: result.message }
      setConversationId(result.conversation_id)
      setPhase(result.phase)
      setLaunched(true)
      setReview(null)
      setSubmission(null)
      setInput('')
      voiceConversationRef.current = true
      setTypingMessageId(roseMessage.id)
      setTypingTargetText(roseMessage.text)
      setTypingVisibleLength(getInitialTypingVisibleLength(roseMessage.text))
      setMessages([roseMessage])
      const canSpeakNow = voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window
      if (canSpeakNow) {
        speak(result.message, roseMessage.id)
      } else {
        window.setTimeout(() => beginListeningIfNeeded(), 0)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Unable to start conversation.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    stop()
    voiceConversationRef.current = false
    setLaunched(false)
    setConversationId(null)
    setMessages([])
    setReview(null)
    setSubmission(null)
    setTypingMessageId(null)
    setTypingTargetText('')
    setTypingVisibleLength(0)
    setActiveSpeechMessageId(null)
    setSpeechBoundarySeen(false)
    setInput('')
    setPhase('story_capture')
    setError('')
    voiceBaseRef.current = ''
  }

  const toggleListening = () => {
    if (listening) {
      voiceConversationRef.current = false
      stopListening()
      return
    }

    voiceConversationRef.current = true
    voiceBaseRef.current = input.trimEnd()
    startListening()
  }

  const recapHint = useMemo(() => {
    if (phase !== 'recap_confirmation') return null
    return 'Try saying: "Yes, that is right." or "Change the accident city to San Diego."'
  }, [phase])

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {!launched && (
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Rose</h1>
            <p className="text-gray-500">A spoken intake conversation.</p>
          </div>
        )}

        <RoseAvatar speaking={speaking} language={language} />

        <div
          className={`${
            launched ? 'rounded-[2rem] bg-white/70 p-0 shadow-none' : 'rounded-[2rem] border border-gray-200 bg-white p-4 shadow-sm md:p-6'
          }`}
        >
          {!launched ? (
            <div className="space-y-5 rounded-[1.5rem] bg-gray-50 p-6">
              <p className="text-sm leading-7 text-gray-700">
                Start the conversation, listen to Rose, and answer out loud in English, Spanish, or Chinese.
              </p>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Language</div>
                <LanguagePicker value={language} onChange={setLanguage} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceEnabled((value) => !value)}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {voiceEnabled ? 'Rose voice on' : 'Rose voice off'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={launch}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <PlayCircle className="h-4 w-4" />
                  {loading ? 'Starting...' : 'Begin with Rose'}
                </button>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm leading-6 text-gray-600">
                After her greeting, Rose will automatically start listening for your response.
              </div>
            </div>
          ) : (
            <>
              <div ref={scrollerRef} className="h-[460px] space-y-4 overflow-y-auto pr-2">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <Message
                      key={message.id}
                      role={message.role}
                      isTyping={message.id === typingMessageId && typingVisibleLength < typingTargetText.length}
                    >
                      {message.id === typingMessageId
                        ? typingTargetText.slice(0, typingVisibleLength)
                        : message.text}
                    </Message>
                  ))}
                  {liveTranscript && <Message role="user">{liveTranscript}</Message>}
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {submission ? (
                <div className="mt-6 rounded-[1.5rem] border border-green-200 bg-green-50 p-5">
                  <div className="mb-2 flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    Intake complete
                  </div>
                  <p className="text-sm leading-6 text-gray-700">
                    Rose finished the conversation and created your assessment.
                  </p>
                  {submission.plaintiffSummary && (
                    <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm leading-6 text-gray-700">
                      {submission.plaintiffSummary}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/results/${submission.caseId}`, { replace: true })}
                      className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                    >
                      View Results
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="min-h-[3.5rem] space-y-2">
                      <div className="text-sm font-medium text-gray-800">
                        {listening
                          ? 'Rose is listening.'
                          : loading
                            ? 'Rose is replying.'
                            : speaking
                              ? 'Rose is speaking.'
                              : 'Continue the conversation when you are ready.'}
                      </div>
                      <div className="mx-auto max-w-md text-xs leading-5 text-gray-500">
                        {listening
                          ? `Speak naturally in ${VOICE_LANGUAGES[language].label}. Rose will send your words automatically when you pause.`
                          : voiceSupported
                            ? 'Use the mic to keep talking with Rose.'
                            : 'Use Chrome or Edge for fully hands-free voice conversation.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={!voiceSupported}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-8 py-3.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      Microphone
                    </button>
                    <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500">
                      <button
                        type="button"
                        onClick={() => setVoiceEnabled((value) => !value)}
                        className="px-2 py-1 hover:text-gray-700"
                      >
                        {voiceEnabled ? 'Mute Rose' : 'Unmute Rose'}
                      </button>
                      {lastRoseMessage && (
                        <button
                          type="button"
                          onClick={() => speak(lastRoseMessage.text, lastRoseMessage.id)}
                          className="px-2 py-1 hover:text-gray-700"
                        >
                          Repeat last reply
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={reset}
                        className="px-2 py-1 hover:text-gray-700"
                      >
                        Restart
                      </button>
                    </div>
                  </div>
                  {recapHint && <div className="mt-3 text-xs text-gray-500">{recapHint}</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
