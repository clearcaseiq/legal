import { formatLastSeen, useCounterpartPresence, type Presence } from '../lib/presence'

type Props = {
  presence?: Presence | null
  /** `dot` sits on an avatar corner; `inline` is a dot with an "Online" / "Last seen" label. */
  variant?: 'dot' | 'inline'
  /** Names who the label is about ("Client online") where the name is not beside it. */
  subject?: string
  className?: string
}

/** Looks the person up itself, for places without the presence map in scope (table cells, cards). */
export function CounterpartPresence({
  attorneyId,
  userId,
  assessmentId,
  ...rest
}: Omit<Props, 'presence'> & { attorneyId?: string | null; userId?: string | null; assessmentId?: string | null }) {
  const presence = useCounterpartPresence()
  const match =
    (attorneyId && presence.attorneys[attorneyId]) ||
    (userId && presence.clients[userId]) ||
    (assessmentId && presence.cases[assessmentId]) ||
    null
  return <PresenceIndicator presence={match} {...rest} />
}

export default function PresenceIndicator({ presence, variant = 'inline', subject, className = '' }: Props) {
  if (!presence) return null
  const lastSeen = presence.online ? null : formatLastSeen(presence.lastSeenAt)
  const state = presence.online ? 'online' : lastSeen ? `last seen ${lastSeen}` : 'offline'
  const label = subject ? `${subject} ${state}` : state.charAt(0).toUpperCase() + state.slice(1)

  if (variant === 'dot') {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className={`block h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${presence.online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} ${className}`}
      />
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${presence.online ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'} ${className}`}>
      <span className="relative flex h-2 w-2" aria-hidden>
        {presence.online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${presence.online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
      </span>
      {label}
    </span>
  )
}
