import { MATCHING_RULE_TABS, type MatchingRuleTab } from './constants'

interface MatchingRulesTabBarProps {
  activeTab: MatchingRuleTab
  onChange: (tab: MatchingRuleTab) => void
}

export function MatchingRulesTabBar({ activeTab, onChange }: MatchingRulesTabBarProps) {
  return (
    <div className="sticky top-14 z-20 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="grid gap-2 sm:grid-cols-6">
        {MATCHING_RULE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
