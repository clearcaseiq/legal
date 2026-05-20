import { useId } from 'react'
import { clsx } from 'clsx'

const MARK_PX = { sm: 28, md: 34, lg: 42 } as const

export type BrandLogoSize = keyof typeof MARK_PX

/** Shield + scales mark: legal protection, case analysis, and verified readiness. */
export function BrandMark({ size = 'md', className }: { size?: BrandLogoSize; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const shieldGradId = `cciq-shield-${uid}`
  const goldGradId = `cciq-gold-${uid}`
  const lensGradId = `cciq-lens-${uid}`
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
        <linearGradient id={shieldGradId} x1="5" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4d78aa" />
          <stop offset="0.52" stopColor="#173963" />
          <stop offset="1" stopColor="#071629" />
        </linearGradient>
        <linearGradient id={goldGradId} x1="10" y1="7" x2="23" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={lensGradId} x1="18" y1="18" x2="29" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e3a5f" />
          <stop offset="1" stopColor="#071629" />
        </linearGradient>
      </defs>

      <path
        d="M16 2.8 27 6.7v8.25c0 6.6-4.45 11.35-11 14.25C9.45 26.3 5 21.55 5 14.95V6.7L16 2.8Z"
        fill={`url(#${shieldGradId})`}
      />
      <path
        d="M16 5.05 24.9 8.2v6.6c0 5.05-3.35 8.95-8.9 11.55-5.55-2.6-8.9-6.5-8.9-11.55V8.2L16 5.05Z"
        stroke="#6f9ac7"
        strokeWidth="1.25"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <path d="M10.4 12.4h11.2" stroke={`url(#${goldGradId})`} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 8.7v9.2" stroke={`url(#${goldGradId})`} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12.1 11.3 9.2 17h5.8l-2.9-5.7Z" fill={`url(#${goldGradId})`} />
      <path d="M19.9 11.3 17 17h5.8l-2.9-5.7Z" fill={`url(#${goldGradId})`} />
      <rect x="12.6" y="18.2" width="6.8" height="1.75" rx="0.88" fill={`url(#${goldGradId})`} />
      <circle cx="22.25" cy="22.2" r="5.4" fill={`url(#${lensGradId})`} stroke="#5f86b3" strokeWidth="1.2" />
      <path
        d="M19.45 22.1l1.75 1.75 3.8-4.05"
        stroke="#fbbf24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m25.9 25.85 3.3 3.25" stroke="#f59e0b" strokeWidth="1.9" strokeLinecap="round" />
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
