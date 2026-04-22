import { AlertTriangle, X } from 'lucide-react'
import { clsx } from 'clsx'

type ErrorBannerProps = {
  title?: string
  message: string
  /** Structured / product-style (icon + title + body) vs compact inline */
  variant?: 'card' | 'inline'
  onDismiss?: () => void
  className?: string
}

/**
 * Consistent error surfaces — plaintiffs, attorneys, admin.
 */
export default function ErrorBanner({
  title = 'Something went wrong',
  message,
  variant = 'card',
  onDismiss,
  className,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={clsx(
        variant === 'card' &&
          'flex gap-3 rounded-xl border border-red-200/90 dark:border-red-900/50 bg-red-50/95 dark:bg-red-950/35 px-4 py-3 text-left',
        variant === 'inline' && 'text-sm text-red-700 dark:text-red-300',
        className
      )}
    >
      {variant === 'card' && (
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-900 dark:text-red-100">{title}</p>
        <p className="mt-0.5 text-sm text-red-800/90 dark:text-red-200/90">{message}</p>
      </div>
      {onDismiss && variant === 'card' && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-red-700 hover:bg-red-100/80 dark:hover:bg-red-900/30 dark:text-red-200"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
