import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Video } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import { getStoredRole, hasValidAuthToken } from '../lib/auth'
import {
  disconnectAttorneyZoom,
  getAttorneyZoomConnectUrl,
  getAttorneyZoomStatus,
  installAttorneyZoom,
  type AttorneyZoomStatus,
} from '../lib/api'

/** Survives the trip through sign-in; the code is never left in the URL. */
const PENDING_CODE_KEY = 'ccq_zoom_install_code'
const SELF = '/connect/zoom'

/**
 * The Zoom Marketplace landing URL, and where a Marketplace install returns.
 *
 * Signed-out visitors are sent to the attorney sign-in and brought back here.
 * A signed-in attorney sees whether Zoom is connected and can connect or
 * disconnect. When Zoom sends an install code (Marketplace "Add"), it is
 * exchanged as soon as an attorney is signed in.
 */
export default function ZoomConnect() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<AttorneyZoomStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const started = useRef(false)

  const signedInAttorney = hasValidAuthToken() && getStoredRole() === 'attorney'

  useEffect(() => {
    if (started.current) return
    started.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const zoomSync = params.get('zoom_sync')
    if (code) {
      try {
        sessionStorage.setItem(PENDING_CODE_KEY, code)
      } catch {
        /* private mode: the exchange below still runs if already signed in */
      }
    }
    if (code || zoomSync) window.history.replaceState(null, '', SELF)

    if (!signedInAttorney) {
      navigate(`/login/attorney?redirect=${encodeURIComponent(SELF)}`, { replace: true })
      return
    }

    if (zoomSync === 'success') setMessage({ kind: 'ok', text: 'Zoom is connected.' })
    if (zoomSync === 'error') setMessage({ kind: 'error', text: 'Zoom was not connected. Please try again.' })

    void (async () => {
      let pending = code
      try {
        pending = sessionStorage.getItem(PENDING_CODE_KEY) || code
        sessionStorage.removeItem(PENDING_CODE_KEY)
      } catch {
        /* ignore */
      }
      try {
        if (pending) {
          setBusy(true)
          setStatus(await installAttorneyZoom(pending))
          setMessage({ kind: 'ok', text: 'Zoom is connected.' })
        } else {
          setStatus(await getAttorneyZoomStatus())
        }
      } catch (err: any) {
        setMessage({ kind: 'error', text: err?.response?.data?.error || 'Could not reach Zoom. Please try again.' })
        setStatus(await getAttorneyZoomStatus().catch(() => null))
      } finally {
        setBusy(false)
      }
    })()
  }, [navigate, signedInAttorney])

  const connect = async () => {
    try {
      setBusy(true)
      setMessage(null)
      const { authorizeUrl } = await getAttorneyZoomConnectUrl()
      window.location.assign(authorizeUrl)
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.response?.data?.error || 'Could not start the Zoom connection.' })
      setBusy(false)
    }
  }

  const disconnect = async () => {
    try {
      setBusy(true)
      await disconnectAttorneyZoom()
      setStatus(await getAttorneyZoomStatus())
      setMessage({ kind: 'ok', text: 'Zoom is disconnected.' })
    } catch {
      setMessage({ kind: 'error', text: 'Could not disconnect Zoom. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  if (!signedInAttorney) return null

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <Link to="/attorney-dashboard" className="mb-8 flex justify-center">
          <BrandLogo size="lg" />
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-sky-600" aria-hidden />
            <h1 className="text-xl font-semibold text-slate-900">Zoom for ClearCaseIQ</h1>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Connect your Zoom account so video consultations get a meeting link automatically, clients get a Join
            button in their portal, and you can start a call from any case.
          </p>

          {message && (
            <p
              role="status"
              className={`mt-4 rounded-lg p-3 text-sm ${
                message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="mt-6">
            {!status ? (
              <p className="text-sm text-slate-500">{busy ? 'Connecting to Zoom…' : 'Loading…'}</p>
            ) : !status.configured ? (
              <p className="text-sm text-slate-600">Zoom is not available on this ClearCaseIQ environment.</p>
            ) : status.connected ? (
              <div className="space-y-4">
                <p className="flex items-center gap-2 text-sm text-slate-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
                  Connected{status.email ? ` as ${status.email}` : ''}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/attorney-dashboard"
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Go to your dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => void disconnect()}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Disconnect Zoom
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void connect()}
                disabled={busy}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? 'Opening Zoom…' : 'Connect Zoom'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
