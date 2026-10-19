/**
 * Workspace usage beacon: which screens and features attorneys and firm staff
 * use, and for how long they are active.
 *
 * Attorney screens carry PHI, so the beacon accepts only names from the fixed
 * lists below plus a lead id, and rejects anything else outright rather than
 * dropping it: a client that starts sending URLs or free text should fail
 * loudly in development, not leak quietly in production.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { recordAttorneyActivity } from './attorney-activity'

/** Case workspace sections, as they appear in /attorney-dashboard/cases/:leadId/:section. */
export const CASE_SCREENS = [
  'overview',
  'client-info',
  'timeline',
  'tasks',
  'workflow',
  'copilot',
  'rose',
  'documents',
  'medical',
  'liability',
  'insurance',
  'damages',
  'demand',
  'negotiation',
  'settlement',
  'time',
  'billing',
  'referrals',
] as const

/** Workspace pages outside a single case, as paths under /attorney-dashboard/. */
export const APP_SCREENS = [
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
] as const

export const FEATURES = [
  'demand_generate',
  'demand_package_build',
  'demand_package_email',
  'ai_suggestion_accept',
  'ai_suggestion_dismiss',
  'task_primary_action',
  'copilot_ask',
  'global_search',
] as const

export const MAX_BEACON_EVENTS = 50
export const MAX_BEACON_LEADS = 5
/** A heartbeat credits a minute only if the last credited one was at least this long ago. */
export const HEARTBEAT_MIN_GAP_MS = 50_000

export type BeaconEvent =
  | { type: 'screen'; key: string; leadId?: string }
  | { type: 'feature'; key: string; leadId?: string }
  | { type: 'heartbeat' }

const LEAD_ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const has = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v)

/** Screen key as stored: `case/<section>` inside a case, the page path otherwise. */
export const screenKey = (e: { key: string; leadId?: string }) => (e.leadId ? `case/${e.key}` : e.key)

export function parseBeacon(body: unknown): { events: BeaconEvent[] } | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Expected an object' }
  const extra = Object.keys(body).filter((k) => k !== 'events')
  if (extra.length) return { error: `Unexpected field: ${extra[0]}` }
  const raw = (body as any).events
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'events must be a non-empty array' }
  if (raw.length > MAX_BEACON_EVENTS) return { error: `At most ${MAX_BEACON_EVENTS} events per request` }

  const events: BeaconEvent[] = []
  for (const e of raw) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) return { error: 'Each event must be an object' }
    const unknownKey = Object.keys(e).find((k) => !['type', 'key', 'leadId'].includes(k))
    if (unknownKey) return { error: `Unexpected event field: ${unknownKey}` }
    if (e.leadId !== undefined && !(typeof e.leadId === 'string' && LEAD_ID_RE.test(e.leadId))) {
      return { error: 'Invalid leadId' }
    }
    if (e.type === 'heartbeat') {
      if (e.key !== undefined || e.leadId !== undefined) return { error: 'A heartbeat carries no key or leadId' }
      events.push({ type: 'heartbeat' })
    } else if (e.type === 'screen') {
      const ok = e.leadId ? has(CASE_SCREENS, e.key) : has(APP_SCREENS, e.key)
      if (!ok) return { error: `Unknown screen: ${String(e.key).slice(0, 40)}` }
      events.push({ type: 'screen', key: e.key, ...(e.leadId ? { leadId: e.leadId } : {}) })
    } else if (e.type === 'feature') {
      if (!has(FEATURES, e.key)) return { error: `Unknown feature: ${String(e.key).slice(0, 40)}` }
      events.push({ type: 'feature', key: e.key, ...(e.leadId ? { leadId: e.leadId } : {}) })
    } else {
      return { error: `Unknown event type: ${String(e.type).slice(0, 20)}` }
    }
  }
  const leads = new Set(events.map((e) => ('leadId' in e ? e.leadId : undefined)).filter(Boolean))
  if (leads.size > MAX_BEACON_LEADS) return { error: `At most ${MAX_BEACON_LEADS} cases per request` }
  return { events }
}

/** Raw screen/feature events are kept this long; the daily rollup is kept for good. */
export const RAW_USAGE_RETENTION_DAYS = 180
export const RAW_USAGE_ACTIONS = ['screen_viewed', 'feature_used'] as const

/** Deletes expired raw usage events. Compliance events (login, case_opened) are never touched. */
export async function sweepRawUsageEvents(now = new Date()): Promise<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - RAW_USAGE_RETENTION_DAYS * 86_400_000)
  const { count } = await prisma.attorneyActivityEvent.deleteMany({
    where: { action: { in: [...RAW_USAGE_ACTIONS] }, occurredAt: { lt: cutoff } },
  })
  return { deleted: count }
}

export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10)

function parseCounts(raw: string | null | undefined): Record<string, number> {
  try {
    const v = JSON.parse(raw || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

export function mergeCounts(raw: string | null | undefined, keys: string[]): string | null {
  const counts = parseCounts(raw)
  for (const k of keys) counts[k] = (Number(counts[k]) || 0) + 1
  return Object.keys(counts).length ? JSON.stringify(counts) : null
}

// Per process, like the case-open dedupe; a second instance can credit one
// extra minute at most.
const lastBeat = new Map<string, number>()

export function creditHeartbeat(userId: string, now = Date.now()): boolean {
  const last = lastBeat.get(userId)
  if (last !== undefined && now - last < HEARTBEAT_MIN_GAP_MS) return false
  lastBeat.set(userId, now)
  if (lastBeat.size > 10_000) {
    for (const [k, at] of lastBeat) if (now - at > 10 * 60_000) lastBeat.delete(k)
  }
  return true
}

export type UsageActor = { userId: string; role: 'attorney' | 'staff'; lawFirmId: string | null }

/**
 * Applies a parsed beacon. `leadAssessments` maps each lead the caller may see
 * to its assessment; events on any other lead are dropped.
 */
export async function recordUsage(
  actor: UsageActor,
  events: BeaconEvent[],
  leadAssessments: Map<string, string>,
  now = new Date(),
): Promise<void> {
  const allowed = events.filter((e) => !('leadId' in e) || !e.leadId || leadAssessments.has(e.leadId))
  const screens = allowed.filter((e): e is Extract<BeaconEvent, { type: 'screen' }> => e.type === 'screen')
  const features = allowed.filter((e): e is Extract<BeaconEvent, { type: 'feature' }> => e.type === 'feature')
  const minutes = allowed.some((e) => e.type === 'heartbeat') && creditHeartbeat(actor.userId, now.getTime()) ? 1 : 0
  if (!screens.length && !features.length && !minutes) return

  const day = utcDay(now)
  try {
    const existing = await (prisma as any).attorneyUsageDaily.findUnique({
      where: { userId_day: { userId: actor.userId, day } },
      select: { screens: true, features: true },
    })
    const data = {
      lawFirmId: actor.lawFirmId,
      screens: mergeCounts(existing?.screens, screens.map(screenKey)),
      features: mergeCounts(existing?.features, features.map((f) => f.key)),
    }
    await (prisma as any).attorneyUsageDaily.upsert({
      where: { userId_day: { userId: actor.userId, day } },
      create: { userId: actor.userId, day, activeMinutes: minutes, ...data },
      update: { ...data, activeMinutes: { increment: minutes } },
    })
  } catch (error: any) {
    logger.warn('Attorney usage rollup failed', { error: error?.message })
  }

  const base = { lawFirmId: actor.lawFirmId, actor: { id: actor.userId, role: actor.role }, withoutContext: true }
  for (const s of screens) {
    recordAttorneyActivity({
      ...base,
      action: 'screen_viewed',
      entityType: 'screen',
      entityId: screenKey(s),
      leadId: s.leadId ?? null,
      assessmentId: s.leadId ? leadAssessments.get(s.leadId) : null,
    })
  }
  for (const f of features) {
    recordAttorneyActivity({
      ...base,
      action: 'feature_used',
      entityType: 'feature',
      entityId: f.key,
      leadId: f.leadId ?? null,
      assessmentId: f.leadId ? leadAssessments.get(f.leadId) : null,
    })
  }
}
