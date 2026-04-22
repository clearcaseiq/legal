import { Skeleton } from './Skeleton'

export function DashboardPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-16" aria-busy="true" aria-label="Loading dashboard">
      <div className="w-full max-w-lg space-y-4">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-4 w-full max-w-md mx-auto" />
        <div className="flex gap-2 justify-center pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl mt-6" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Loading your case…</p>
    </div>
  )
}

export function AttorneyDashboardSkeleton() {
  return (
    <div className="space-y-8 py-4" aria-busy="true" aria-label="Loading attorney dashboard">
      <div className="flex flex-wrap justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Loading your dashboard…</p>
    </div>
  )
}

export function AttorneyDashboardPanelSkeleton({
  message = 'Loading section...'
}: {
  message?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy="true" aria-label={message}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">{message}</p>
      </div>
    </div>
  )
}

export function DashboardTabPanelSkeleton({
  message = 'Loading section...'
}: {
  message?: string
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={message}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <Skeleton className="h-6 w-56" />
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  )
}

export function ResultsPanelSkeleton({
  message = 'Loading case report...'
}: {
  message?: string
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={message}>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <Skeleton className="h-7 w-64 mx-auto" />
          <Skeleton className="h-4 w-80 max-w-full mx-auto" />
          <Skeleton className="h-28 w-28 rounded-full mx-auto" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  )
}
