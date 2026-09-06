export const WORKBENCH_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'intake', label: 'Assisted intake' },
  { id: 'documents', label: 'Documents' },
  { id: 'communications', label: 'Communications' },
  { id: 'activity', label: 'Activity' },
] as const

export type WorkbenchTab = (typeof WORKBENCH_TABS)[number]['id']

export function isWorkbenchTab(value: string | null): value is WorkbenchTab {
  return !!value && WORKBENCH_TABS.some((tab) => tab.id === value)
}

/**
 * Tabs, so the page stops being one column of everything.
 *
 * The selected tab lives in the query string rather than in state: a specialist
 * who reloads mid-call, or pastes a case link to a colleague, should land where
 * they were. It also keeps this working under both mounts of the workspace
 * (`/assistance/:id` and the admin shell) without either needing a child route.
 */
export function WorkbenchTabNav({
  active,
  onChange,
  counts,
}: {
  active: WorkbenchTab
  onChange: (tab: WorkbenchTab) => void
  counts?: Partial<Record<WorkbenchTab, number>>
}) {
  return (
    <div className="-mx-4 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800 sm:-mx-6 sm:px-6">
      <nav className="flex gap-1" role="tablist" aria-label="Case sections">
        {WORKBENCH_TABS.map((tab) => {
          const isActive = tab.id === active
          const count = counts?.[tab.id]
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {count != null && count > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
