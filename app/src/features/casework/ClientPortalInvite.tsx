/**
 * Whether the claimant is on the platform, and a way to invite them when not.
 *
 * Attorney-created and imported cases start owned by a placeholder account, so
 * the client has no dashboard, messages or document uploads until they accept
 * an invite. The invite is sent to the email saved on this tab.
 */
import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Loader2, Mail, UserCheck } from 'lucide-react'
import { getClientPortalStatus, inviteClientToPortal, type ClientPortalStatus } from '../../lib/api'

interface ClientPortalInviteProps {
  leadId: string
  /** The saved email; a change re-reads the status. */
  savedEmail: string
  /** Unsaved edits on the tab; the invite would go to the old address. */
  dirty: boolean
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function ClientPortalInvite({ leadId, savedEmail, dirty }: ClientPortalInviteProps) {
  const [status, setStatus] = useState<ClientPortalStatus | null>(null)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(() => {
    getClientPortalStatus(leadId)
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [leadId])

  useEffect(load, [load, savedEmail])

  if (!status) return null

  if (status.state === 'active') {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-slate-900">Client is on ClearCaseIQ</p>
          <p className="text-xs text-slate-600">They can follow the case, upload documents and message your team.</p>
        </div>
      </div>
    )
  }

  const send = async () => {
    setSending(true)
    setMessage(null)
    try {
      const next = await inviteClientToPortal(leadId)
      setStatus(next)
      setMessage({ tone: 'ok', text: `Invite sent to ${next.email}.` })
    } catch (err: any) {
      setMessage({ tone: 'err', text: err?.response?.data?.error || 'Could not send the invite.' })
      load()
    } finally {
      setSending(false)
    }
  }

  const copyLink = async () => {
    if (!status.inviteLink) return
    try {
      await navigator.clipboard.writeText(status.inviteLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage({ tone: 'err', text: 'Could not copy the link.' })
    }
  }

  const blockedReason = !status.email
    ? 'Add the client’s email below first'
    : dirty
      ? 'Save your changes first'
      : status.limitReached
        ? 'Invite limit reached'
        : status.nextInviteAt
          ? `You can resend after ${formatDate(status.nextInviteAt)}`
          : !status.inviteLink
            ? 'This email belongs to a non-client account'
            : null

  return (
    <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {status.state === 'invited' ? 'Client invited, not joined yet' : 'Client isn’t on ClearCaseIQ yet'}
            </p>
            <p className="text-xs text-slate-600">
              {status.state === 'invited' && status.lastInvitedAt
                ? `Last invite sent ${formatDate(status.lastInvitedAt)}${status.inviteCount > 1 ? ` (${status.inviteCount} sent)` : ''}. `
                : ''}
              {status.hasAccount
                ? 'This email already has an account, so the invite asks them to sign in and the case is added to it.'
                : 'Invite them to see case updates, upload documents and message your team.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status.inviteLink ? (
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              title="Copy the invite link to send it yourself, e.g. by text"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={send}
            disabled={sending || Boolean(blockedReason)}
            title={blockedReason || undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {status.state === 'invited' ? 'Resend invite' : 'Invite client'}
          </button>
        </div>
      </div>
      {blockedReason && !sending ? <p className="text-xs text-slate-500">{blockedReason}.</p> : null}
      {message ? (
        <p role={message.tone === 'err' ? 'alert' : 'status'} className={`text-xs ${message.tone === 'err' ? 'text-rose-700' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  )
}
