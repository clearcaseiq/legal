/**
 * Signature requests (envelopes) as rows in the Documents > Signatures view, plus
 * the row layout and step trail that upload requests share so both kinds of
 * request read the same way.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Ban,
  Bell,
  Check,
  Download,
  ExternalLink,
  Link2,
  Lock,
  Mail,
  MessageSquare,
  MoreHorizontal,
  PenLine,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  correctSignerEmail,
  deleteEnvelope,
  downloadSignedEnvelope,
  listEnvelopes,
  refreshEnvelopes,
  remindEnvelope,
  textEnvelope,
  voidEnvelope,
  type DocumentEnvelope,
  type EnvelopeStatus,
} from '../lib/api-esign'

const POLL_MS = 20000
/** An open envelope idle this many days is flagged as overdue for a nudge. */
const OVERDUE_DAYS = 5

const OPEN_STATUSES: EnvelopeStatus[] = ['draft', 'sent', 'viewed']

export function isEnvelopeOpen(env: DocumentEnvelope): boolean {
  return OPEN_STATUSES.includes(env.status)
}

/**
 * Envelope titles carry the client's name for the firm's records
 * ("HIPAA authorization — Jane Doe"); inside the client's own case it is noise.
 */
export function displayTitle(title: string | null | undefined): string {
  const value = String(title ?? '').trim()
  return value.split(' — ')[0].trim() || value || 'Document'
}

export function fmtShortDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function daysSince(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const ms = Date.now() - new Date(dateStr).getTime()
  return Number.isFinite(ms) ? Math.floor(ms / 86400000) : null
}

function providerLabel(provider?: string | null): string {
  return String(provider || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

// ---------------------------------------------------------------------------
// Shared row layout
// ---------------------------------------------------------------------------

export type StepTone = 'amber' | 'brand' | 'emerald' | 'rose' | 'slate'

const STEP_TONES: Record<StepTone, string> = {
  amber: 'bg-amber-50 text-amber-700',
  brand: 'bg-brand-50 text-brand-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
}

/** Requested → Received → Reviewed, Sent → Viewed → Signed: the current step is a pill. */
export function StepTrail({ steps, current, tone }: { steps: string[]; current: number; tone: StepTone }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px]">
      {steps.map((label, i) => (
        <span key={label} className="inline-flex items-center gap-1">
          {i > 0 ? <span className={i <= current ? 'text-slate-400' : 'text-slate-200'}>→</span> : null}
          <span
            className={`rounded-full px-1.5 py-0.5 font-semibold ${
              i < current ? 'text-slate-500' : i === current ? STEP_TONES[tone] : 'text-slate-300'
            }`}
          >
            {label}
          </span>
        </span>
      ))}
    </span>
  )
}

export function RequestRow({
  kind,
  title,
  subtitle,
  trail,
  actions,
  children,
}: {
  kind: 'upload' | 'signature'
  title: string
  subtitle: ReactNode
  trail: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const Icon = kind === 'upload' ? Upload : PenLine
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
            kind === 'upload' ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600'
          }`}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-[10rem] flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="shrink-0">{trail}</div>
        <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
      </div>
      {children}
    </li>
  )
}

export const rowButtonCls =
  'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50'

export type Channel = 'email' | 'text'

/** A follow-up button that asks how to reach the client: email or text. */
export function ChannelButton({
  label,
  busy,
  busyLabel = 'Sending…',
  disabled,
  icon: Icon = Bell,
  className = rowButtonCls,
  title,
  onSend,
}: {
  label: string
  busy?: boolean
  busyLabel?: string
  disabled?: boolean
  icon?: typeof Bell | null
  className?: string
  title?: string
  onSend: (channel: Channel) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const pick = (channel: Channel) => {
    setOpen(false)
    onSend(channel)
  }
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy || disabled}
        aria-expanded={open}
        title={title}
        className={className}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null} {busy ? busyLabel : label}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => pick('email')}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Mail className="h-3.5 w-3.5" /> By email
          </button>
          <button
            type="button"
            onClick={() => pick('text')}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <MessageSquare className="h-3.5 w-3.5" /> By text
          </button>
        </div>
      ) : null}
    </div>
  )
}

type MenuItem = { label: string; icon: typeof Bell; onSelect: () => void; danger?: boolean; disabled?: boolean }

function RowMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  if (!items.length) return null
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium disabled:opacity-50 ${
                item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

/** Envelopes for a case, kept live by polling the provider while any are open. */
export function useCaseEnvelopes(leadId: string, reloadKey: number) {
  const [envelopes, setEnvelopes] = useState<DocumentEnvelope[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const reload = useCallback(async () => {
    try {
      setEnvelopes(await listEnvelopes(leadId))
    } catch {
      setEnvelopes((prev) => prev ?? [])
    }
  }, [leadId])

  useEffect(() => {
    void reload()
  }, [reload, reloadKey])

  const hasOpen = (envelopes || []).some(isEnvelopeOpen)
  useEffect(() => {
    if (!hasOpen) return
    const t = setInterval(async () => {
      try {
        setEnvelopes(await refreshEnvelopes(leadId))
      } catch {
        /* transient; next tick retries */
      }
    }, POLL_MS)
    return () => clearInterval(t)
  }, [hasOpen, leadId])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      setEnvelopes(await refreshEnvelopes(leadId))
    } finally {
      setRefreshing(false)
    }
  }, [leadId])

  return { envelopes, setEnvelopes, reload, refresh, refreshing }
}

const SIGN_STEPS = ['Sent', 'Viewed', 'Signed']

function envelopeTrail(env: DocumentEnvelope) {
  if (env.status === 'declined') return <StepTrail steps={['Sent', 'Declined']} current={1} tone="rose" />
  if (env.status === 'voided') return <StepTrail steps={['Sent', 'Voided']} current={1} tone="slate" />
  if (env.status === 'expired') return <StepTrail steps={['Sent', 'Expired']} current={1} tone="amber" />
  if (env.status === 'signed') return <StepTrail steps={SIGN_STEPS} current={2} tone="emerald" />
  if (env.clientSignedAt) return <StepTrail steps={['Sent', 'Client signed', 'Countersigned']} current={1} tone="amber" />
  return <StepTrail steps={SIGN_STEPS} current={env.viewedAt || env.status === 'viewed' ? 1 : 0} tone={env.viewedAt ? 'brand' : 'amber'} />
}

function envelopeSubtitle(env: DocumentEnvelope): ReactNode {
  const parts = ['Signature', providerLabel(env.provider)].filter(Boolean)
  if (env.status === 'signed') return `${parts.join(' · ')} · signed ${fmtShortDate(env.signedAt || env.updatedAt)}`
  if (env.status === 'declined') return `${parts.join(' · ')} · declined ${fmtShortDate(env.declinedAt || env.updatedAt)}`
  if (env.status === 'voided') return `${parts.join(' · ')} · voided ${fmtShortDate(env.updatedAt)}`
  if (env.clientSignedAt) {
    return (
      <span className="font-medium text-amber-700">
        Client signed {fmtShortDate(env.clientSignedAt)} · waiting on countersignature
        {env.countersignerName ? ` by ${env.countersignerName}` : ''}
      </span>
    )
  }
  const waiting = daysSince(env.sentAt || env.createdAt)
  const base = `${parts.join(' · ')} · sent ${fmtShortDate(env.sentAt || env.createdAt)}`
  if (waiting != null && waiting >= OVERDUE_DAYS) {
    return (
      <>
        {base} · <span className="font-medium text-amber-700">waiting {waiting} days</span>
      </>
    )
  }
  return base
}

export function EnvelopeRow({
  leadId,
  env,
  canManage,
  onUpdated,
  onReload,
  onMessage,
}: {
  leadId: string
  env: DocumentEnvelope
  canManage: boolean
  onUpdated: (env: DocumentEnvelope) => void
  onReload: () => void
  onMessage: (tone: 'ok' | 'err', text: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [email, setEmail] = useState(env.signerEmail)
  const open = isEnvelopeOpen(env)
  const title = displayTitle(env.title)

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true)
    try {
      await fn()
    } catch (err: any) {
      onMessage('err', err?.response?.data?.error || fallback)
    } finally {
      setBusy(false)
    }
  }

  const remind = (channel: Channel) =>
    run(async () => {
      if (channel === 'text') {
        const { deliveredTo } = await textEnvelope(leadId, env.id, { reminder: true })
        onMessage('ok', `Reminder texted to ${deliveredTo}.`)
      } else {
        await remindEnvelope(leadId, env.id)
        onMessage('ok', `Reminder emailed to ${env.signerEmail}.`)
      }
    }, channel === 'text' ? 'Could not text the reminder.' : 'Could not send a reminder.')

  const download = () => run(() => downloadSignedEnvelope(env.id, `${title}.pdf`), 'Could not download the signed document.')

  const voidIt = () => {
    if (!window.confirm(`Void "${title}"? The signing link will stop working.`)) return
    void run(async () => {
      onUpdated(await voidEnvelope(leadId, env.id))
      onMessage('ok', `Voided "${title}".`)
    }, 'Could not void this request.')
  }

  const remove = () => {
    const message = open
      ? `Delete "${title}"? It hasn't been signed yet — the request will be cancelled and the signing link will stop working.`
      : `Delete "${title}" from this list?`
    if (!window.confirm(message)) return
    void run(async () => {
      await deleteEnvelope(leadId, env.id)
      onReload()
      onMessage('ok', `Deleted "${title}".`)
    }, 'Could not delete this signature request.')
  }

  const copyLink = async () => {
    if (!env.signingUrl) return
    try {
      await navigator.clipboard.writeText(env.signingUrl)
      onMessage('ok', 'Signing link copied.')
    } catch {
      /* clipboard unavailable */
    }
  }

  const correct = () =>
    run(async () => {
      const next = email.trim()
      if (!next) return
      onUpdated(await correctSignerEmail(leadId, env.id, next))
      onMessage('ok', `Re-sent to ${next}.`)
      setCorrecting(false)
    }, 'Could not update the recipient.')

  const menu: MenuItem[] = []
  if (canManage && open && env.signingUrl) {
    menu.push({ label: 'Copy signing link', icon: Link2, onSelect: () => void copyLink() })
    menu.push({ label: 'Open signing link', icon: ExternalLink, onSelect: () => window.open(env.signingUrl!, '_blank', 'noopener') })
  }
  if (canManage && open) {
    menu.push({ label: 'Fix client email', icon: Mail, onSelect: () => setCorrecting(true), disabled: busy })
    menu.push({ label: 'Void', icon: Ban, onSelect: voidIt, danger: true, disabled: busy })
  }
  if (canManage && env.status !== 'signed') {
    menu.push({ label: 'Delete', icon: Trash2, onSelect: remove, danger: true, disabled: busy })
  }

  let primary: ReactNode = null
  if (env.status === 'signed') {
    primary = (
      <>
        <button type="button" onClick={() => void download()} disabled={busy} className={rowButtonCls}>
          <Download className="h-3.5 w-3.5" /> {busy ? 'Downloading…' : 'Download'}
        </button>
        <span className="text-slate-300" title="Signed documents are locked. Send a new request to change any terms.">
          <Lock className="h-3.5 w-3.5" />
        </span>
      </>
    )
  } else if (open && env.clientSignedAt && env.countersignUrl) {
    primary = (
      <a href={env.countersignUrl} target="_blank" rel="noopener noreferrer" className={`${rowButtonCls} border-amber-200 text-amber-700`}>
        <PenLine className="h-3.5 w-3.5" /> Countersign
      </a>
    )
  } else if (open && canManage && !env.clientSignedAt) {
    primary = <ChannelButton label="Remind" busy={busy} onSend={(channel) => void remind(channel)} />
  }

  return (
    <RequestRow
      kind="signature"
      title={title}
      subtitle={envelopeSubtitle(env)}
      trail={envelopeTrail(env)}
      actions={
        <>
          {primary}
          <RowMenu items={menu} />
        </>
      }
    >
      {correcting ? (
        <div className="mt-2 flex items-center gap-2 pl-12">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="corrected@example.com"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => void correct()}
            disabled={busy || !email.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Re-send
          </button>
          <button type="button" onClick={() => setCorrecting(false)} className="p-1.5 text-slate-400 hover:text-slate-700" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </RequestRow>
  )
}
