import { resolveEvidenceFileUrl } from '../lib/evidenceFileUrl'

function initialsFromName(name?: string | null): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

type ChatAvatarProps = {
  url?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fallbackClassName?: string
}

const sizeClass = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

/** Circular chat avatar: uploaded photo when present, otherwise initials. */
export default function ChatAvatar({
  url,
  name,
  size = 'md',
  className = '',
  fallbackClassName = 'bg-slate-200 text-slate-600',
}: ChatAvatarProps) {
  const resolved = resolveEvidenceFileUrl(url || '')
  const base = `${sizeClass[size]} shrink-0 rounded-full object-cover ${className}`

  if (resolved) {
    return <img src={resolved} alt="" className={base} />
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold ${base} ${fallbackClassName}`}
      aria-hidden
    >
      {initialsFromName(name)}
    </span>
  )
}
