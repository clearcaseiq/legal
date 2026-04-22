import { clsx } from 'clsx'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-md bg-gradient-to-r from-slate-200/80 via-slate-100 to-slate-200/80 dark:from-slate-700/80 dark:via-slate-600/50 dark:to-slate-700/80 bg-[length:200%_100%] animate-shimmer',
        className
      )}
      {...props}
    />
  )
}
