import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { decideLead } from '../lib/api'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session_id')
  const type = searchParams.get('type')
  const leadId = searchParams.get('leadId')
  const [acceptanceStatus, setAcceptanceStatus] = useState<'idle' | 'accepting' | 'accepted' | 'failed'>('idle')
  const [acceptanceError, setAcceptanceError] = useState<string | null>(null)
  const caseWorkspacePath = leadId ? `/attorney-dashboard/lead/${leadId}/overview` : '/attorney-dashboard'
  // Carry a one-time flag into the workspace so it can greet the attorney with a
  // "Congratulations, this case is now yours" banner right after the purchase.
  const caseWorkspacePathAfterAccept = leadId
    ? `/attorney-dashboard/lead/${leadId}/overview?accepted=1`
    : '/attorney-dashboard'

  useEffect(() => {
    if (type !== 'routing_fee' || !leadId) return

    let cancelled = false
    const acceptanceKey = `caseiq:routing-fee-accepted:${leadId}:${sessionId || 'latest'}`
    if (window.sessionStorage.getItem(acceptanceKey)) {
      setAcceptanceStatus('accepted')
      return
    }

    setAcceptanceStatus('accepting')
    let conflictAcknowledged = false
    try {
      conflictAcknowledged = window.sessionStorage.getItem(`caseiq:conflict-ack:${leadId}`) === '1'
    } catch {
      conflictAcknowledged = false
    }
    decideLead(leadId, 'accept', undefined, undefined, { conflictAcknowledged })
      .then(() => {
        window.sessionStorage.setItem(acceptanceKey, 'true')
        try {
          window.sessionStorage.removeItem(`caseiq:conflict-ack:${leadId}`)
        } catch {
          /* ignore */
        }
        if (!cancelled) setAcceptanceStatus('accepted')
      })
      .catch((error) => {
        console.error('Failed to accept lead after routing fee payment:', error)
        if (cancelled) return
        // Surface the server's reason. The common one is a stale second tab that
        // already declined this case: without it the attorney sees a celebration
        // for a case they will never receive and no explanation of the charge.
        setAcceptanceError(error?.response?.data?.error || null)
        setAcceptanceStatus('failed')
      })

    return () => {
      cancelled = true
    }
  }, [leadId, sessionId, type])

  // Once the routing fee is paid and the case is accepted, drop the attorney
  // straight into the Case Workspace rather than leaving them on this receipt
  // screen. Small delay so the "payment received" confirmation is visible.
  useEffect(() => {
    if (type !== 'routing_fee' || !leadId || acceptanceStatus !== 'accepted') return
    const timer = setTimeout(() => {
      navigate(caseWorkspacePathAfterAccept, { replace: true })
    }, 1600)
    return () => clearTimeout(timer)
  }, [acceptanceStatus, type, leadId, caseWorkspacePathAfterAccept, navigate])

  // Never congratulate the attorney on a case the accept did not actually secure —
  // they have been charged and the case is not theirs, so this has to read as a
  // problem to resolve, not a purchase confirmation.
  const acceptanceFailed = type === 'routing_fee' && acceptanceStatus === 'failed'

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div
        className={
          acceptanceFailed
            ? 'rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-950 shadow-sm'
            : 'rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-emerald-950 shadow-sm'
        }
      >
        {acceptanceFailed ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Payment received — case not assigned
            </p>
            <h1 className="mt-2 text-3xl font-bold">We could not finalize this case.</h1>
            <p className="mt-3 text-sm text-amber-900">
              {acceptanceError || 'The case acceptance could not be completed.'}
            </p>
            <p className="mt-3 text-sm text-amber-900">
              Your card was charged for the routing fee but the case was not assigned to you.
              Contact support and we will reverse the charge.
            </p>
          </>
        ) : type === 'routing_fee' ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Payment received</p>
            <h1 className="mt-2 text-3xl font-bold">Congratulations. This case is now yours! 🎉</h1>
            <p className="mt-3 text-sm text-emerald-800">
              You can now manage everything for this matter. Client details, documents, tasks,
              deadlines, and messages all live in your Case Workspace.
            </p>
            <p className="mt-3 text-sm text-emerald-800">
              {acceptanceStatus === 'accepting' && 'Finalizing your case…'}
              {acceptanceStatus === 'accepted' && 'Taking you to your Case Workspace so you can get started…'}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Payment received</p>
            <h1 className="mt-2 text-3xl font-bold">Thanks, your payment is being processed.</h1>
            <p className="mt-3 text-sm text-emerald-800">
              Stripe will notify CaseIQ when the payment is finalized. Your payment status will update automatically.
            </p>
          </>
        )}
        {type === 'payment_method' && (
          <p className="mt-3 text-sm text-emerald-800">
            Your payment method has been saved for automatic routing-fee charges.
          </p>
        )}
        {sessionId && (
          <p className={`mt-4 text-xs ${acceptanceFailed ? 'text-amber-700' : 'text-emerald-700'}`}>
            Stripe session: {sessionId}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {acceptanceFailed ? (
            <Link to="/attorney-dashboard/leadgen/matches" className="btn-primary">
              Back to New Matches
            </Link>
          ) : type === 'routing_fee' ? (
            <Link to={caseWorkspacePathAfterAccept} className="btn-primary">
              Open Case Workspace
            </Link>
          ) : (
            <Link to="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
          )}
          <Link to="/" className="btn-outline">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}
