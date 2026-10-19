/**
 * Platform admin: what attorneys are doing on the platform (engagement,
 * feature usage, value delivered) and the access timeline behind it.
 */
import { Router, type Router as ExpressRouter } from 'express'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import {
  attorneyTimeline,
  computeAttorneyMetrics,
  resolveAttorneyIdentities,
  timelineToCsv,
  usageBreakdown,
  type TimelineEntry,
  type TimelineKind,
} from '../lib/attorney-activity-metrics'

const router: ExpressRouter = Router()
const guard = [authMiddleware, adminMiddleware, requireAdminCapability('oversight')] as const

const DAY_MS = 86_400_000
const MAX_RANGE_DAYS = 366
const MAX_EXPORT_ROWS = 10_000
const KINDS: TimelineKind[] = ['activity', 'case_change', 'document_access', 'audit']

function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** `from`/`to` query params, defaulting to the last 30 days and capped at a year. */
export function parseRange(query: Record<string, unknown>, now = new Date()): { from: Date; to: Date } {
  const to = parseDate(query.to) ?? now
  let from = parseDate(query.from) ?? new Date(to.getTime() - 30 * DAY_MS)
  if (from > to) from = new Date(to.getTime() - 30 * DAY_MS)
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) from = new Date(to.getTime() - MAX_RANGE_DAYS * DAY_MS)
  return { from, to }
}

function parseKinds(v: unknown): TimelineKind[] | undefined {
  if (typeof v !== 'string' || !v) return undefined
  const kinds = v.split(',').filter((k): k is TimelineKind => KINDS.includes(k as TimelineKind))
  return kinds.length ? kinds : undefined
}

router.get('/attorney-activity', ...guard, async (req: AuthRequest, res) => {
  try {
    const range = parseRange(req.query as Record<string, unknown>)
    const firm = typeof req.query.firm === 'string' && req.query.firm ? req.query.firm : undefined
    const identities = await resolveAttorneyIdentities({ lawFirmId: firm })
    const metrics = await computeAttorneyMetrics(identities, range)
    const firms = [
      ...new Map(
        identities.filter((a) => a.lawFirmId).map((a) => [a.lawFirmId!, { id: a.lawFirmId!, name: a.lawFirmName || a.lawFirmId! }]),
      ).values(),
    ].sort((x, y) => x.name.localeCompare(y.name))
    res.json({ range: { from: range.from.toISOString(), to: range.to.toISOString() }, firms, attorneys: metrics })
  } catch (error: any) {
    logger.error('Failed to load attorney activity', { error: error.message })
    res.status(500).json({ error: 'Failed to load attorney activity' })
  }
})

router.get('/attorney-activity/:attorneyId', ...guard, async (req: AuthRequest, res) => {
  try {
    const [identity] = await resolveAttorneyIdentities({ attorneyId: req.params.attorneyId })
    if (!identity) return res.status(404).json({ error: 'No attorney account found' })
    const range = parseRange(req.query as Record<string, unknown>)
    const before = parseDate(req.query.before) ?? undefined
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const [[metrics], usage, timeline] = await Promise.all([
      computeAttorneyMetrics([identity], range),
      usageBreakdown(identity.userIds, range),
      attorneyTimeline(identity, { before, from: range.from, limit, kinds: parseKinds(req.query.kinds) }),
    ])
    res.json({ range: { from: range.from.toISOString(), to: range.to.toISOString() }, ...metrics, usage, timeline })
  } catch (error: any) {
    logger.error('Failed to load attorney activity detail', { error: error.message, attorneyId: req.params.attorneyId })
    res.status(500).json({ error: 'Failed to load attorney activity' })
  }
})

router.get('/attorney-activity/:attorneyId/export.csv', ...guard, async (req: AuthRequest, res) => {
  try {
    const [identity] = await resolveAttorneyIdentities({ attorneyId: req.params.attorneyId })
    if (!identity) return res.status(404).json({ error: 'No attorney account found' })
    const range = parseRange(req.query as Record<string, unknown>)
    const kinds = parseKinds(req.query.kinds)

    const entries: TimelineEntry[] = []
    let before: Date | undefined = new Date(range.to.getTime() + 1)
    while (before && entries.length < MAX_EXPORT_ROWS) {
      const page = await attorneyTimeline(identity, { before, from: range.from, limit: 500, kinds })
      entries.push(...page.entries)
      before = page.nextBefore ? new Date(page.nextBefore) : undefined
    }

    await writeAdminAudit(req as any, {
      action: 'attorney_activity_exported',
      entityType: 'attorney',
      entityId: identity.attorneyId,
      metadata: { from: range.from.toISOString(), to: range.to.toISOString(), kinds: kinds ?? KINDS, rows: entries.length },
    })

    const name = `attorney-activity-${identity.attorneyId}-${range.from.toISOString().slice(0, 10)}-${range.to.toISOString().slice(0, 10)}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
    res.send(timelineToCsv(entries.slice(0, MAX_EXPORT_ROWS)))
  } catch (error: any) {
    logger.error('Failed to export attorney activity', { error: error.message, attorneyId: req.params.attorneyId })
    res.status(500).json({ error: 'Failed to export attorney activity' })
  }
})

export default router
