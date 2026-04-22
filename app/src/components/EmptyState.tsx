import type { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
  /** Compact padding for embedded lists */
  compact?: boolean
}

/**
 * Consistent empty / zero-data states (plaintiff, attorney, admin).
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'surface-panel flex flex-col items-center justify-center text-center',
        compact ? 'py-10 px-4' : 'py-14 px-6',
        className
      )}
    >
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      )}
      <h3 className="text-ui-lg font-semibold font-display text-slate-900 dark:text-slate-100 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-md text-ui-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      )}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}
