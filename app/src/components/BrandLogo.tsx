import { useId } from 'react'
import { clsx } from 'clsx'

const MARK_PX = { sm: 28, md: 34, lg: 42 } as const

export type BrandLogoSize = keyof typeof MARK_PX

/** Premium file-mark: structured case file, trusted approval badge, warmer accent contrast. */
export function BrandMark({ size = 'md', className }: { size?: BrandLogoSize; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const shellGradId = `cciq-shell-${uid}`
  const panelGradId = `cciq-panel-${uid}`
  const badgeGradId = `cciq-badge-${uid}`
  const w = MARK_PX[size]

  return (
    <svg
      width={w}
      height={w}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={shellGradId} x1="4" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5279aa" />
          <stop offset="0.48" stopColor="#34547a" />
          <stop offset="1" stopColor="#17283c" />
        </linearGradient>
        <linearGradient id={panelGradId} x1="9" y1="7" x2="22" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef4fa" />
        </linearGradient>
        <linearGradient id={badgeGradId} x1="18.4" y1="18.4" x2="27.3" y2="27.2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>

      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="9" fill={`url(#${shellGradId})`} />
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="9" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <path d="M6.6 7.15c0-1.18.96-2.15 2.15-2.15h8.55l5.55 5.52v13.2c0 1.8-1.46 3.28-3.27 3.28H8.75A2.15 2.15 0 0 1 6.6 24.85V7.15z" fill={`url(#${panelGradId})`} />
      <path d="M17.3 5v4.08c0 1.12.91 2.02 2.03 2.02h3.52L17.3 5z" fill="#dce8f5" />
      <rect x="9.35" y="8.75" width="1.85" height="14.45" rx="0.92" fill="#34547a" />
      <rect x="12.8" y="10.1" width="6.65" height="1.55" rx="0.78" fill="#9eb6d0" />
      <rect x="12.8" y="13.1" width="6" height="1.55" rx="0.78" fill="#c4d4e5" />
      <rect x="12.8" y="16.1" width="4.4" height="1.55" rx="0.78" fill="#d3dfeb" />
      <circle cx="22.55" cy="22.45" r="5.05" fill={`url(#${badgeGradId})`} />
      <circle cx="22.55" cy="22.45" r="4.48" stroke="rgba(255,255,255,0.28)" strokeWidth="1.15" />
      <path
        d="M19.95 22.35l1.6 1.58 3.55-4.08"
        stroke="white"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.7" cy="7.45" r="1.2" fill="#fcd34d" fillOpacity="0.9" />
    </svg>
  )
}

type BrandLogoProps = {
  showWordmark?: boolean
  size?: BrandLogoSize
  /** Text colors: default header on light/dark page; footer on slate-900 */
  mode?: 'header' | 'footer'
  className?: string
  appName?: string
}

/**
 * Mark + wordmark. IQ uses accent for a subtle “intelligence” cue.
 */
export default function BrandLogo({
  showWordmark = true,
  size = 'md',
  mode = 'header',
  className,
  appName = 'ClearCaseIQ',
}: BrandLogoProps) {
  const isFooter = mode === 'footer'
  const split = appName.match(/^(.*)(IQ)$/i)
  const base = split ? split[1] : appName
  const iqPart = split ? split[2] : null
  const wordSize =
    size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base md:text-[1.05rem]'

  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <BrandMark size={size} />
      {showWordmark && (
        <span className={clsx('font-display font-bold tracking-[-0.02em] leading-none', wordSize)}>
          {iqPart ? (
            isFooter ? (
              <>
                <span className="text-white">{base}</span>
                <span className="ml-0.5 text-amber-300">{iqPart}</span>
              </>
            ) : (
              <>
                <span className="text-slate-900 dark:text-slate-100">{base}</span>
                <span className="ml-0.5 text-accent-600 dark:text-accent-400">{iqPart}</span>
              </>
            )
          ) : isFooter ? (
            <span className="text-white">{appName}</span>
          ) : (
            <span className="text-slate-900 dark:text-slate-100">{appName}</span>
          )}
        </span>
      )}
    </span>
  )
}
