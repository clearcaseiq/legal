import { describe, expect, it, vi } from 'vitest'

const deleteMany = vi.fn().mockResolvedValue({ count: 3 })
vi.mock('./prisma', () => ({ prisma: { attorneyActivityEvent: { deleteMany: (...a: unknown[]) => deleteMany(...a) } } }))

import {
  HEARTBEAT_MIN_GAP_MS,
  MAX_BEACON_EVENTS,
  creditHeartbeat,
  mergeCounts,
  parseBeacon,
  screenKey,
  sweepRawUsageEvents,
} from './attorney-usage'

describe('parseBeacon', () => {
  it('accepts known screens, features and heartbeats', () => {
    const res = parseBeacon({
      events: [
        { type: 'screen', key: 'cases/active' },
        { type: 'screen', key: 'liability', leadId: 'lead_1' },
        { type: 'feature', key: 'demand_generate', leadId: 'lead_1' },
        { type: 'heartbeat' },
      ],
    })
    expect('events' in res && res.events).toHaveLength(4)
  })

  it.each([
    ['an unknown event name', { events: [{ type: 'screen', key: 'secret-page' }] }],
    ['an unknown feature', { events: [{ type: 'feature', key: 'export_everything' }] }],
    ['a case section without a case', { events: [{ type: 'screen', key: 'liability' }] }],
    ['an app page with a case', { events: [{ type: 'screen', key: 'cases/active', leadId: 'l1' }] }],
    ['a URL as a key', { events: [{ type: 'screen', key: '/attorney-dashboard/cases/abc/medical?x=1' }] }],
    ['an extra event field', { events: [{ type: 'screen', key: 'cases/active', note: 'Jane Doe neck pain' }] }],
    ['an extra top-level field', { events: [{ type: 'heartbeat' }], url: 'https://x' }],
    ['a heartbeat with a lead', { events: [{ type: 'heartbeat', leadId: 'l1' }] }],
    ['a malformed lead id', { events: [{ type: 'screen', key: 'medical', leadId: 'a b/c' }] }],
    ['an empty batch', { events: [] }],
    ['too many events', { events: Array.from({ length: MAX_BEACON_EVENTS + 1 }, () => ({ type: 'heartbeat' })) }],
    ['too many cases', { events: ['a', 'b', 'c', 'd', 'e', 'f'].map((leadId) => ({ type: 'screen', key: 'medical', leadId })) }],
  ])('rejects %s', (_label, body) => {
    expect(parseBeacon(body)).toHaveProperty('error')
  })
})

describe('usage helpers', () => {
  it('prefixes case screens', () => {
    expect(screenKey({ key: 'medical', leadId: 'l1' })).toBe('case/medical')
    expect(screenKey({ key: 'cases/tasks' })).toBe('cases/tasks')
  })

  it('adds to existing counts and tolerates bad JSON', () => {
    expect(JSON.parse(mergeCounts('{"a":2}', ['a', 'b'])!)).toEqual({ a: 3, b: 1 })
    expect(JSON.parse(mergeCounts('not json', ['a'])!)).toEqual({ a: 1 })
    expect(mergeCounts(null, [])).toBeNull()
  })

  it('credits at most one active minute per gap', () => {
    const t = 1_000_000
    expect(creditHeartbeat('u-hb', t)).toBe(true)
    expect(creditHeartbeat('u-hb', t + 10_000)).toBe(false)
    expect(creditHeartbeat('u-hb', t + HEARTBEAT_MIN_GAP_MS)).toBe(true)
  })

  it('sweeps only raw screen and feature events older than 180 days', async () => {
    const now = new Date('2026-10-18T00:00:00Z')
    expect(await sweepRawUsageEvents(now)).toEqual({ deleted: 3 })
    const where = deleteMany.mock.calls[0][0].where
    expect(where.action.in).toEqual(['screen_viewed', 'feature_used'])
    expect(where.occurredAt.lt).toEqual(new Date('2026-04-21T00:00:00Z'))
  })
})
