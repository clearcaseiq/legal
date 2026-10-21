import { useEffect, useState } from 'react'
import { Video, X } from 'lucide-react'
import { getAttorneyZoomConnectUrl, getAttorneyZoomStatus } from '../../lib/api'

const DISMISS_KEY = 'cciq.zoomNudgeDismissed'

/**
 * Banner asking an attorney to connect Zoom. Shows only when the server has
 * Zoom configured and this attorney hasn't connected; staff get a 403 from the
 * status call and never see it.
 */
export default function ZoomConnectNudge() {
  const [show, setShow] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return
    let cancelled = false
    getAttorneyZoomStatus()
      .then((status) => {
        if (!cancelled) setShow(Boolean(status?.configured && !status.connected))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!show) return null

  const connect = async () => {
    try {
      setConnecting(true)
      setError(null)
      const { authorizeUrl } = await getAttorneyZoomConnectUrl()
      window.location.assign(authorizeUrl)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not start the Zoom connection.')
      setConnecting(false)
    }
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <Video className="h-5 w-5 shrink-0 text-sky-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">Connect Zoom for video calls</p>
        <p className="text-xs text-slate-600">
          Video consults get a meeting link automatically, clients get a Join button in their portal, and you can
          start a call from any case.
        </p>
        {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
      </div>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={connecting}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {connecting ? 'Opening Zoom…' : 'Connect Zoom'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
