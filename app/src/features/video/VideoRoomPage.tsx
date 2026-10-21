import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getVideoRoomJoin, type VideoRoomJoin } from '../../lib/api'

type Status = 'loading' | 'connecting' | 'joined' | 'ended' | 'error'

/**
 * In-platform video call. The Zoom Meeting SDK runs inside /zoom-room.html (an
 * isolated same-origin frame, see that file); this page fetches the join
 * credentials and hands them over by postMessage. Every failure path offers
 * the same meeting in the Zoom app instead.
 */
export default function VideoRoomPage() {
  const { kind, id } = useParams<{ kind: string; id: string }>()
  const navigate = useNavigate()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [join, setJoin] = useState<VideoRoomJoin | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)

  useEffect(() => {
    if ((kind !== 'appointment' && kind !== 'meeting') || !id) {
      setStatus('error')
      setError('This call link is not valid.')
      return
    }
    let cancelled = false
    getVideoRoomJoin(kind, id)
      .then((data) => {
        if (cancelled) return
        setJoin(data)
        setFallbackUrl(data.fallbackUrl)
        setStatus('connecting')
      })
      .catch((err: any) => {
        if (cancelled) return
        setStatus('error')
        setError(err?.response?.data?.error || 'Could not open the video call.')
        setFallbackUrl(err?.response?.data?.fallbackUrl || null)
      })
    return () => {
      cancelled = true
    }
  }, [kind, id])

  useEffect(() => {
    if (!join) return
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      const data = event.data || {}
      if (data.type !== 'cciq-zoom-status') return
      if (data.status === 'ready') {
        frameRef.current?.contentWindow?.postMessage({ type: 'cciq-zoom-join', config: join }, window.location.origin)
      } else if (data.status === 'joined') {
        setStatus('joined')
      } else if (data.status === 'ended') {
        setStatus('ended')
      } else if (data.status === 'error') {
        setStatus('error')
        setError(data.message || 'Could not join the call.')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [join])

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-2.5 text-sm text-slate-200">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="font-semibold">
          {status === 'joined' ? 'In call' : status === 'ended' ? 'Call ended' : 'Video call'}
        </span>
        {fallbackUrl ? (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-300 hover:bg-slate-800"
          >
            Open in Zoom app
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span />
        )}
      </div>

      {status === 'error' || status === 'ended' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-slate-200">
          <p className="text-base">{status === 'ended' ? 'The call has ended.' : error}</p>
          {status === 'error' && fallbackUrl && (
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Join in the Zoom app instead
            </a>
          )}
        </div>
      ) : (
        <div className="relative flex-1">
          {status !== 'joined' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
              {status === 'loading' ? 'Preparing your call…' : 'Connecting…'}
            </div>
          )}
          {join && (
            <iframe
              ref={frameRef}
              title="Video call"
              src="/zoom-room.html"
              allow="camera; microphone; display-capture; autoplay; fullscreen"
              className="absolute inset-0 h-full w-full border-0"
            />
          )}
        </div>
      )}
    </div>
  )
}
