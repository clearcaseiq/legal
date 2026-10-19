export const RANGE_OPTIONS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 365, label: 'Last 12 months' },
]

export function rangeParams(days: number, now = new Date()) {
  return { from: new Date(now.getTime() - days * 86_400_000).toISOString(), to: now.toISOString() }
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return Math.round((s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2) * 10) / 10
}

export function formatAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return 'Never'
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days < 60 ? `${days}d ago` : new Date(iso).toLocaleDateString()
}

export function formatMinutes(minutes: number): string {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

export function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours}h`
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const SCREEN_LABELS: Record<string, string> = {
  overview: 'Overview',
  notifications: 'Notifications',
  guides: 'Guides',
  'leadgen/matches': 'New matches',
  'leadgen/quality': 'Match quality',
  'leadgen/marketplace': 'Marketplace performance',
  'leadgen/analytics': 'Lead analytics',
  'leadgen/intake': 'Intake',
  'cases/active': 'Active cases',
  'cases/calendar': 'Calendar',
  'cases/messages': 'Messages',
  'cases/documents': 'Documents & e-sign',
  'cases/tasks': 'Tasks hub',
  'cases/billing': 'Billing',
  'cases/copilot': 'Copilot',
  'cases/ai-manager': 'AI case manager',
  'cases/firm': 'Firm dashboard',
}

export function screenLabel(key: string): string {
  if (key.startsWith('case/')) {
    const section = key.slice(5).replace(/-/g, ' ')
    return `Case › ${section.charAt(0).toUpperCase()}${section.slice(1)}`
  }
  return SCREEN_LABELS[key] ?? key
}

const FEATURE_LABELS: Record<string, string> = {
  demand_generate: 'Generate demand',
  demand_package_build: 'Build demand package',
  demand_package_email: 'Email package to adjuster',
  ai_suggestion_accept: 'Accept AI suggestion',
  ai_suggestion_dismiss: 'Dismiss AI suggestion',
  task_primary_action: 'Task "Open" action',
  copilot_ask: 'Ask Copilot',
  global_search: 'Global search',
}

export const featureLabel = (key: string) => FEATURE_LABELS[key] ?? key

export const KIND_LABELS = {
  activity: 'Activity',
  case_change: 'Case change',
  document_access: 'Document access',
  audit: 'Request log',
} as const

export function humanizeAction(action: string): string {
  if (/^[A-Z]+\s/.test(action)) return action
  if (action === 'screen_viewed') return 'Viewed screen'
  if (action === 'feature_used') return 'Used feature'
  if (action === 'case_opened') return 'Opened case'
  if (action === 'login') return 'Signed in'
  const s = action.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
