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
    decideLead(leadId, 'accept')
      .then(() => {
        window.sessionStorage.setItem(acceptanceKey, 'true')
        if (!cancelled) setAcceptanceStatus('accepted')
      })
      .catch((error) => {
        console.error('Failed to accept lead after routing fee payment:', error)
        if (!cancelled) setAcceptanceStatus('failed')
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-emerald-950 shadow-sm">
        {type === 'routing_fee' ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Payment received</p>
            <h1 className="mt-2 text-3xl font-bold">Congratulations — this case is now yours! 🎉</h1>
            <p className="mt-3 text-sm text-emerald-800">
              You can now manage everything for this matter — client details, documents, tasks,
              deadlines, and messages all live in your Case Workspace.
            </p>
            <p className="mt-3 text-sm text-emerald-800">
              {acceptanceStatus === 'accepting' && 'Finalizing your case…'}
              {acceptanceStatus === 'accepted' && 'Taking you to your Case Workspace so you can get started…'}
              {acceptanceStatus === 'failed' && 'Payment succeeded, but the case acceptance could not be finalized automatically. Please open the case from your attorney dashboard and try again.'}
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
        {sessionId && <p className="mt-4 text-xs text-emerald-700">Stripe session: {sessionId}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {type === 'routing_fee' ? (
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
