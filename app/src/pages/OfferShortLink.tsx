/**
 * `/o/<code>` — the link in a routed-case text message.
 *
 * The offer text has to fit in two SMS segments, and the real destination
 * (`/attorney-dashboard/lead/<cuid>/overview`) is around eighty characters. The
 * same six-character code the attorney replies ACCEPT with is already in the
 * message, so the link reuses it and this page trades it back for the case.
 *
 * Behind the attorney guard, so an attorney opening the link on a phone they
 * are not signed in on lands on the attorney login and arrives here again
 * afterwards. That is also why resolution is a call rather than a redirect the
 * server could serve: the answer depends on who is asking.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { resolveOfferCode } from '../lib/api'

export default function OfferShortLink() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!code) {
      setFailed(true)
      return
    }
    let cancelled = false
    resolveOfferCode(code)
      .then(({ path }) => {
        if (cancelled) return
        // `replace`, so Back returns to whatever the attorney was doing rather
        // than to this page, which would resolve and bounce them forward again.
        navigate(path, { replace: true })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [code, navigate])

  if (failed) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900">We couldn't open that case</h1>
        <p className="mt-2 text-sm text-gray-600">
          This link may have been sent to a different account, or the case may no longer be
          available. Your new matches are always on your dashboard.
        </p>
        <Link
          to="/attorney-dashboard/leadgen/matches"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to new matches
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center" role="status" aria-live="polite">
      <p className="text-sm text-gray-600">Opening the case&hellip;</p>
    </div>
  )
}
