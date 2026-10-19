/**
 * First-party usage tracking for the attorney workspace: which screens and
 * features are used, and active minutes. Sent only to our own API (never an
 * analytics vendor; see analyticsBoundary.ts), and only as names from the
 * fixed lists the server accepts plus a lead id - no URLs, no case content.
 */
import api from './http'
import { TAB_TO_SECTION, resolveCaseSection } from '../features/casework/caseSections'

export type UsageFeature =
  | 'demand_generate'
  | 'demand_package_build'
  | 'demand_package_email'
  | 'ai_suggestion_accept'
  | 'ai_suggestion_dismiss'
  | 'task_primary_action'
  | 'copilot_ask'
  | 'global_search'

type UsageEvent =
  | { type: 'screen'; key: string; leadId?: string }
  | { type: 'feature'; key: UsageFeature; leadId?: string }
  | { type: 'heartbeat' }

/** Mirrors APP_SCREENS in api/src/lib/attorney-usage.ts. */
const APP_SCREENS = new Set([
  'overview',
  'notifications',
  'guides',
  'leadgen/matches',
  'leadgen/quality',
  'leadgen/marketplace',
  'leadgen/analytics',
  'leadgen/intake',
  'cases/active',
  'cases/calendar',
  'cases/messages',
  'cases/documents',
  'cases/tasks',
  'cases/billing',
  'cases/copilot',
  'cases/ai-manager',
  'cases/firm',
])

const PREFIX = '/attorney-dashboard/'
const FLUSH_DELAY_MS = 10_000
const HEARTBEAT_MS = 60_000
/** No input for this long and the minute does not count as active. */
const IDLE_AFTER_MS = 5 * 60_000
const MAX_EVENTS = 50
const MAX_LEADS = 5

/** The screen a workspace path shows, or null for paths that are not tracked. */
export function screenFromPath(pathname: string): { key: string; leadId?: string } | null {
  if (!pathname.startsWith(PREFIX)) return null
  const rest = pathname.slice(PREFIX.length).replace(/\/+$/, '')
  const parts = rest.split('/')
  // Pre-acceptance review is part of New Matches, not a case file.
  if (parts[0] === 'leadgen' && parts[1] === 'matches') return { key: 'leadgen/matches' }
  if (APP_SCREENS.has(rest)) return { key: rest }
  if ((parts[0] === 'cases' || parts[0] === 'lead') && parts[1] && !APP_SCREENS.has(`cases/${parts[1]}`)) {
    return { key: TAB_TO_SECTION[resolveCaseSection(parts[2])], leadId: parts[1] }
  }
  return null
}

/** Splits a queue into requests the server accepts (event and case limits). */
export function chunkEvents(events: UsageEvent[]): UsageEvent[][] {
  const chunks: UsageEvent[][] = []
  let current: UsageEvent[] = []
  let leads = new Set<string>()
  for (const e of events) {
    const lead = 'leadId' in e ? e.leadId : undefined
    const needsNewLead = lead && !leads.has(lead)
    if (current.length >= MAX_EVENTS || (needsNewLead && leads.size >= MAX_LEADS)) {
      chunks.push(current)
      current = []
      leads = new Set()
    }
    current.push(e)
    if (lead) leads.add(lead)
  }
  if (current.length) chunks.push(current)
  return chunks
}

let queue: UsageEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let lastScreen = ''

function schedule() {
  if (flushTimer) return
  flushTimer = setTimeout(() => void flushUsage(), FLUSH_DELAY_MS)
}

export async function flushUsage(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  const pending = queue
  queue = []
  for (const events of chunkEvents(pending)) {
    try {
      await api.post('/v1/attorney-dashboard/usage', { events })
    } catch {
      /* usage is best-effort */
    }
  }
}

function enqueue(e: UsageEvent) {
  queue.push(e)
  if (queue.length >= MAX_EVENTS) void flushUsage()
  else schedule()
}

export function trackScreen(key: string, leadId?: string) {
  const id = `${leadId || ''}:${key}`
  if (id === lastScreen) return
  lastScreen = id
  enqueue({ type: 'screen', key, ...(leadId ? { leadId } : {}) })
}

export function trackFeature(key: UsageFeature, leadId?: string | null) {
  enqueue({ type: 'feature', key, ...(leadId ? { leadId } : {}) })
}

/** Starts the active-minute heartbeat; returns the cleanup. */
export function startUsageHeartbeat(): () => void {
  let lastInput = Date.now()
  const onInput = () => {
    lastInput = Date.now()
  }
  const inputs = ['pointerdown', 'keydown', 'scroll', 'mousemove'] as const
  inputs.forEach((ev) => window.addEventListener(ev, onInput, { passive: true }))
  const onHide = () => {
    if (document.visibilityState === 'hidden') void flushUsage()
  }
  document.addEventListener('visibilitychange', onHide)
  const timer = window.setInterval(() => {
    if (document.visibilityState !== 'visible' || Date.now() - lastInput > IDLE_AFTER_MS) return
    queue.push({ type: 'heartbeat' })
    void flushUsage()
  }, HEARTBEAT_MS)
  return () => {
    window.clearInterval(timer)
    inputs.forEach((ev) => window.removeEventListener(ev, onInput))
    document.removeEventListener('visibilitychange', onHide)
    lastScreen = ''
    void flushUsage()
  }
}
