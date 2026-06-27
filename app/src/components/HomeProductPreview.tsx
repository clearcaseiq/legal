import { ActivityIcon, ScaleIcon, ShieldCheckIcon, TrendingUpIcon } from './StartupIcons'

/**
 * Abstract product preview for marketing hero — no live data.
 */
export default function HomeProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent-500/10 via-brand-600/5 to-transparent blur-2xl motion-reduce:hidden" aria-hidden />
      <div className="relative rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          <span className="ml-3 text-sm font-medium text-slate-500 dark:text-slate-400">Sample case assessment</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-3 dark:border-brand-900/60 dark:bg-brand-950/30">
            <p className="text-base font-semibold text-brand-900 dark:text-brand-100">What your free case assessment shows</p>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-800/80 dark:text-brand-200/80">
              Answer a few questions and get a plain-English preview of your case strength, estimated range, liability factors, timeline, and next steps.
            </p>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-semibold text-slate-900 dark:text-slate-50">Sample case assessment</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Example results</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-sm font-medium px-3 py-1.5 border border-emerald-200/80 dark:border-emerald-800">
              <ActivityIcon className="h-3.5 w-3.5" aria-hidden />
              Likely worth reviewing
            </span>
          </div>
          {/* Attorney acceptance — the signal injured people care about most */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-3 dark:border-emerald-800/60 dark:bg-emerald-950/40">
            <div className="flex items-center gap-2">
              <ScaleIcon className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden />
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700/80 dark:text-emerald-400/80">Attorney acceptance</p>
                <p className="text-base font-semibold text-emerald-900 dark:text-emerald-100">Very Likely</p>
              </div>
            </div>
            <span className="font-display text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">88%</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="min-w-0 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/50 p-2.5 text-center sm:p-3">
              <TrendingUpIcon className="h-4 w-4 text-brand-700 dark:text-brand-300 mx-auto mb-1" aria-hidden />
              <p className="text-[11px] uppercase tracking-wide text-brand-600/80 dark:text-brand-400/80 sm:text-xs">Estimated range</p>
              <p className="text-sm font-semibold tabular-nums text-brand-900 dark:text-brand-100 sm:text-base">$35k–$90k</p>
            </div>
            <div className="min-w-0 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 p-2.5 text-center sm:p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 sm:text-xs">Liability strength</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 sm:text-base">72%</p>
            </div>
            <div className="min-w-0 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 p-2.5 text-center sm:p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 sm:text-xs">Likely timeline</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">12–18 mo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-2.5">
            <ShieldCheckIcon className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0" aria-hidden />
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Your information is encrypted. We only share your case with vetted attorneys if you choose attorney review.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
