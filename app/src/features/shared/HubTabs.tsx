import { Suspense, type ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'

export type HubTab = {
  id: string
  label: string
  badge?: number
  render: () => ReactNode
}

/**
 * A sidebar destination that groups related pages as tabs. The open tab is
 * `?tab=`; other query params belong to the page inside and are left alone.
 */
export function HubTabs({ tabs, label }: { tabs: HubTab[]; label: string }) {
  const [params, setParams] = useSearchParams()
  if (!tabs.length) return null
  const requested = params.get('tab')
  const active = tabs.find((t) => t.id === requested) ?? tabs[0]

  const select = (id: string) => {
    const next = new URLSearchParams()
    if (id !== tabs[0].id) next.set('tab', id)
    setParams(next)
  }

  return (
    <div className="space-y-4">
      {tabs.length > 1 ? (
        <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map((t) => {
            const on = t.id === active.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => select(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                  on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
                {t.badge && t.badge > 0 ? (
                  <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-4 text-white">
                    {t.badge > 99 ? '99+' : t.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
      <Suspense fallback={<div className="py-10 text-center text-sm text-slate-400">Loading…</div>}>
        <div key={active.id}>{active.render()}</div>
      </Suspense>
    </div>
  )
}

/** Redirect a retired page to its hub tab, keeping its query params (e.g. `?dm=`). */
export function RedirectToHubTab({ to, tab }: { to: string; tab?: string }) {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  if (tab) params.set('tab', tab)
  const qs = params.toString()
  return <Navigate to={`${to}${qs ? `?${qs}` : ''}`} replace />
}
