import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PhoneCall,
  Mic,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  X,
  Shield,
  Play,
} from 'lucide-react'
import {
  getCallsEnabled,
  getCallRecordingConsent,
  startRecordedCall,
  listCalls,
  getCall,
  cancelCall,
  type CallDto,
} from '../lib/api'
import api from '../lib/http'

interface RecordedCallBarProps {
  chatRoomId?: string | null
  attorneyId?: string | null
  assessmentId?: string | null
  attorneyName: string
}

const ACTIVE_STATUSES = new Set(['queued', 'ringing', 'in_progress'])

function statusLabel(status: string): string {
  switch (status) {
    case 'queued':
      return 'Connecting…'
    case 'ringing':
      return 'Calling your phone…'
    case 'in_progress':
      return 'On the call'
    case 'completed':
      return 'Completed'
    case 'no_answer':
      return 'No answer'
    case 'failed':
      return 'Failed'
    case 'canceled':
      return 'Canceled'
    default:
      return status
  }
}

function formatDuration(sec?: number | null): string {
  if (!sec || sec < 1) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function RecordedCallBar({
  chatRoomId,
  attorneyId,
  assessmentId,
  attorneyName,
}: RecordedCallBarProps) {
  const [enabled, setEnabled] = useState(false)
  const [consented, setConsented] = useState(false)
  const [consentSummary, setConsentSummary] = useState<string | null>(null)
  const [showConsent, setShowConsent] = useState(false)
  const [calls, setCalls] = useState<CallDto[]>([])
  const [expanded, setExpanded] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openTranscriptId, setOpenTranscriptId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const roomKey = chatRoomId || attorneyId || ''

  const loadCalls = useCallback(async () => {
    if (!chatRoomId) {
      setCalls([])
      return
    }
    try {
      const { calls } = await listCalls(chatRoomId)
      setCalls(calls)
    } catch {
      /* non-fatal */
    }
  }, [chatRoomId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [{ enabled }, consent] = await Promise.all([
          getCallsEnabled(),
          getCallRecordingConsent(),
        ])
        if (cancelled) return
        setEnabled(enabled)
        setConsented(consent.granted)
        setConsentSummary(consent.summary)
      } catch {
        if (!cancelled) setEnabled(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void loadCalls()
  }, [loadCalls, roomKey])

  // Poll while any call is active so status + transcript update live.
  const hasActive = calls.some((c) => ACTIVE_STATUSES.has(c.status))
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    const needsPoll = hasActive || calls.some((c) => c.transcript && c.transcript.status !== 'ready' && c.transcript.status !== 'failed')
    if (needsPoll && chatRoomId) {
      pollRef.current = setInterval(() => void loadCalls(), 4000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [hasActive, calls, chatRoomId, loadCalls])

  const placeCall = useCallback(
    async (acknowledgeRecording: boolean) => {
      setStarting(true)
      setError(null)
      try {
        await startRecordedCall({
          chatRoomId: chatRoomId || undefined,
          attorneyId: attorneyId || undefined,
          assessmentId: assessmentId || undefined,
          acknowledgeRecording,
        })
        setConsented(true)
        setShowConsent(false)
        setExpanded(true)
        await loadCalls()
      } catch (e: any) {
        const code = e?.response?.data?.code
        const msg = e?.response?.data?.error
        if (code === 'RECORDING_CONSENT_REQUIRED') {
          setShowConsent(true)
        } else if (code === 'NO_PLAINTIFF_PHONE') {
          setError('Add a phone number to your profile to place a call.')
        } else if (code === 'NO_ATTORNEY_PHONE') {
          setError('This attorney has no phone number on file yet.')
        } else if (code === 'CONNECT_NOT_CONFIGURED') {
          setError('Calling isn’t enabled in this environment yet.')
        } else {
          setError(msg || 'Could not place the call. Please try again.')
        }
      } finally {
        setStarting(false)
      }
    },
    [chatRoomId, attorneyId, assessmentId, loadCalls],
  )

  const handleStartClick = () => {
    if (!consented) {
      setShowConsent(true)
      return
    }
    void placeCall(false)
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelCall(id)
      await loadCalls()
    } catch {
      /* ignore */
    }
  }

  const playRecording = async (id: string) => {
    try {
      const res = await api.get(`/v1/calls/${id}/recording`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Recording is not available yet.')
    }
  }

  const toggleTranscript = async (id: string) => {
    if (openTranscriptId === id) {
      setOpenTranscriptId(null)
      return
    }
    setOpenTranscriptId(id)
    // Fetch full transcript text/segments for this call on demand.
    try {
      const { call } = await getCall(id)
      setCalls((prev) => prev.map((c) => (c.id === id ? call : c)))
    } catch {
      /* keep summary-only view */
    }
  }

  if (!enabled) return null

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Mic className="h-4 w-4 text-primary-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">Recorded phone call</p>
            <p className="text-xs text-gray-500 truncate">
              We’ll call your phone and connect you with {attorneyName}. The call is recorded and transcribed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {calls.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
            >
              {calls.length} call{calls.length === 1 ? '' : 's'}
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={handleStartClick}
            disabled={starting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
            Start recorded call
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {expanded && calls.length > 0 && (
        <div className="max-h-72 overflow-y-auto border-t border-gray-200 divide-y divide-gray-100">
          {calls.map((call) => (
            <div key={call.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        ACTIVE_STATUSES.has(call.status)
                          ? 'bg-amber-500 animate-pulse'
                          : call.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-800">{statusLabel(call.status)}</span>
                    {call.durationSec ? (
                      <span className="text-xs text-gray-400">{formatDuration(call.durationSec)}</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(call.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ACTIVE_STATUSES.has(call.status) && (
                    <button
                      type="button"
                      onClick={() => handleCancel(call.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      End
                    </button>
                  )}
                  {call.hasRecording && (
                    <button
                      type="button"
                      onClick={() => playRecording(call.id)}
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                    >
                      <Play className="h-3.5 w-3.5" /> Audio
                    </button>
                  )}
                  {call.transcript && (
                    <button
                      type="button"
                      onClick={() => toggleTranscript(call.id)}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                    >
                      <FileText className="h-3.5 w-3.5" /> Transcript
                    </button>
                  )}
                </div>
              </div>

              {call.transcript?.summary && (
                <p className="mt-1.5 text-xs text-gray-600">{call.transcript.summary}</p>
              )}
              {call.transcript && call.transcript.status !== 'ready' && (
                <p className="mt-1 text-xs text-gray-400 italic">
                  {call.transcript.status === 'failed' ? 'Transcript unavailable.' : 'Transcript is being prepared…'}
                </p>
              )}

              {openTranscriptId === call.id && call.transcript && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
                  {call.transcript.actionItems.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-700">Follow-ups</p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-gray-600 space-y-0.5">
                        {call.transcript.actionItems.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {call.transcript.segments && call.transcript.segments.length > 0 ? (
                    <div className="space-y-1">
                      {call.transcript.segments.map((s, i) => (
                        <p key={i} className="text-xs text-gray-700">
                          <span className="font-medium">
                            {s.speaker === 'attorney' ? attorneyName : s.speaker === 'plaintiff' ? 'You' : 'Speaker'}:
                          </span>{' '}
                          {s.text}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-xs text-gray-700">{call.transcript.fullText}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-600" />
                <h3 className="text-base font-semibold text-gray-900">Recording consent</h3>
              </div>
              <button type="button" onClick={() => setShowConsent(false)} aria-label="Close">
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {consentSummary ||
                'This call will be recorded and transcribed so your legal team can capture case details. You’ll also hear a notice at the start of the call.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConsent(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => void placeCall(true)}
                disabled={starting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                Agree & call me
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
