import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video } from 'lucide-react'
import { getAttorneyZoomConnectUrl, getAttorneyZoomStatus, startCaseVideoCall, type CaseVideoCall } from '../../lib/api'

/** Starts an instant Zoom call on this case and sends the client the join link. */
export default function StartVideoCallButton({ leadId }: { leadId: string }) {
  const navigate = useNavigate()
  const [available, setAvailable] = useState(false)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [needsZoom, setNeedsZoom] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [call, setCall] = useState<CaseVideoCall | null>(null)
  const [copied, setCopied] = useState(false)

  // Hidden entirely when the server has no Zoom app configured.
  useEffect(() => {
    let cancelled = false
    getAttorneyZoomStatus()
      .then((status) => {
        if (cancelled) return
        setAvailable(Boolean(status?.configured))
        setConnected(Boolean(status?.connected))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const start = async () => {
    setError(null)
    // Without a connection the request can only fail, and the pre-opened tab
    // would flash open and shut.
    if (!connected) {
      setNeedsZoom(true)
      return
    }
    setBusy(true)
    setNeedsZoom(false)
    // Opened before the request so popup blockers treat it as user-initiated.
    const win = window.open('', '_blank')
    try {
      const result = await startCaseVideoCall(leadId)
      setCall(result)
      if (result.embed && result.videoMeetingId) {
        win?.close()
        navigate(`/video/meeting/${result.videoMeetingId}`)
      } else if (win) {
        win.location.href = result.startUrl
      } else {
        window.location.assign(result.startUrl)
      }
    } catch (err: any) {
      win?.close()
      if (err?.response?.data?.code === 'zoom_not_connected') {
        setConnected(false)
        setNeedsZoom(true)
      } else setError(err?.response?.data?.error || 'Could not start the video call.')
    } finally {
      setBusy(false)
    }
  }

  const connectZoom = async () => {
    try {
      const { authorizeUrl } = await getAttorneyZoomConnectUrl()
      window.location.assign(authorizeUrl)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not start the Zoom connection.')
    }
  }

  const copyLink = async () => {
    if (!call) return
    await navigator.clipboard.writeText(call.joinUrl).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  if (!available) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        data-tour="start-video-call"
        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 disabled:opacity-60"
      >
        <Video className="h-4 w-4" />
        {busy ? 'Starting call…' : 'Start video call'}
      </button>
      {needsZoom && (
        <p className="max-w-xs text-right text-xs text-amber-700">
          Connect your Zoom account to start calls.{' '}
          <button type="button" onClick={() => void connectZoom()} className="font-semibold text-brand-700 hover:underline">
            Connect Zoom
          </button>
        </p>
      )}
      {error && <p className="max-w-xs text-right text-xs text-rose-700">{error}</p>}
      {call && !call.embed && (
        <p className="max-w-xs text-right text-xs text-slate-600">
          {call.clientNotified ? 'Join link sent to the client.' : 'No client email on file. Share the link yourself.'}{' '}
          <button type="button" onClick={() => void copyLink()} className="font-semibold text-brand-700 hover:underline">
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </p>
      )}
    </div>
  )
}
