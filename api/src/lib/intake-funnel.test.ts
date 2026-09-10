/**
 * The intake funnel aggregation.
 *
 * Every number here is one an admin would act on — reorder a step, rewrite a
 * question, cut a field — so the arithmetic is worth pinning, particularly the
 * decisions that discard data: the idle-gap cap and the minimum sample count.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()

vi.mock('./prisma', () => ({ prisma: { intakeLead: { findMany: () => findMany() } } }))
vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { buildIntakeFunnelReport } from './intake-funnel'

const T0 = Date.parse('2026-09-01T10:00:00.000Z')

/** A lead whose steps are `seconds` apart, in the order given. */
function lead(
  steps: Array<[string, number]>,
  opts: { completed?: boolean; device?: string | null } = {},
) {
  let at = T0
  const history = steps.map(([step, seconds]) => {
    at += seconds * 1000
    return { step, at: new Date(at).toISOString() }
  })
  return {
    stepHistory: JSON.stringify(history),
    currentStep: steps[steps.length - 1]?.[0] ?? null,
    status: opts.completed ? 'completed' : 'in_progress',
    assessmentId: opts.completed ? 'asm-1' : null,
    deviceType: opts.device === undefined ? null : opts.device,
  }
}

function device(report: Awaited<ReturnType<typeof buildIntakeFunnelReport>>, name: string) {
  const found = report.byDevice.find((d) => d.device === name)
  if (!found) throw new Error(`no device ${name} in report`)
  return found
}

function step(report: Awaited<ReturnType<typeof buildIntakeFunnelReport>>, name: string) {
  const found = report.steps.find((s) => s.step === name)
  if (!found) throw new Error(`no step ${name} in report`)
  return found
}

beforeEach(() => {
  findMany.mockReset()
})

describe('buildIntakeFunnelReport', () => {
  it('counts reach, completion and where claimants stop', async () => {
    findMany.mockResolvedValue([
      lead([['injury', 0], ['treatment', 30], ['contact', 30]], { completed: true }),
      lead([['injury', 0], ['treatment', 30]]),
      lead([['injury', 0]]),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(report.totalLeads).toBe(3)
    expect(report.completedLeads).toBe(1)
    expect(report.completionRate).toBeCloseTo(1 / 3)

    expect(step(report, 'injury').reached).toBe(3)
    expect(step(report, 'treatment').reached).toBe(2)
    expect(step(report, 'contact').reached).toBe(1)

    // Only the two who stopped without finishing count as drop-offs, each at
    // their own last step. The completed lead's last step is not a drop.
    expect(step(report, 'injury').droppedHere).toBe(1)
    expect(step(report, 'treatment').droppedHere).toBe(1)
    expect(step(report, 'contact').droppedHere).toBe(0)
    expect(step(report, 'treatment').dropRate).toBeCloseTo(0.5)
  })

  it('orders steps the way claimants meet them, across branches', async () => {
    // No single lead sees every step: the wizard branches by injury type, so the
    // order has to be inferred rather than read off any one path.
    findMany.mockResolvedValue([
      lead([['injury', 0], ['vehicle', 10], ['contact', 10]]),
      lead([['injury', 0], ['slip', 10], ['contact', 10]]),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(report.steps[0].step).toBe('injury')
    expect(report.steps[report.steps.length - 1].step).toBe('contact')
  })

  it('reports the median rather than the mean, so one slow lead cannot skew it', async () => {
    // Six leads on 'injury': five at 10s and one at 600s. A mean would report
    // 108s, which describes nobody.
    findMany.mockResolvedValue([
      ...Array.from({ length: 5 }, () => lead([['injury', 0], ['contact', 10]])),
      lead([['injury', 0], ['contact', 600]]),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(step(report, 'injury').medianSeconds).toBe(10)
    expect(step(report, 'injury').timedSamples).toBe(6)
  })

  it('discards a gap too long to be time on a screen', async () => {
    // Five credible samples plus one abandoned tab picked up an hour later.
    // The long one measures absence, not attention.
    findMany.mockResolvedValue([
      ...Array.from({ length: 5 }, () => lead([['injury', 0], ['contact', 20]])),
      lead([['injury', 0], ['contact', 60 * 60]]),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(step(report, 'injury').timedSamples).toBe(5)
    expect(step(report, 'injury').medianSeconds).toBe(20)
    // Dropped from the timings, but the lead still counts for reach.
    expect(step(report, 'injury').reached).toBe(6)
  })

  it('withholds timings rather than publishing a median of two', async () => {
    findMany.mockResolvedValue([lead([['injury', 0], ['contact', 15]])])

    const report = await buildIntakeFunnelReport(30)

    expect(step(report, 'injury').medianSeconds).toBeNull()
    expect(step(report, 'injury').p90Seconds).toBeNull()
    expect(step(report, 'injury').timedSamples).toBe(1)
  })

  it('gives the last step no dwell, since nothing followed it', async () => {
    findMany.mockResolvedValue(
      Array.from({ length: 6 }, () => lead([['injury', 0], ['contact', 20]])),
    )

    const report = await buildIntakeFunnelReport(30)

    expect(step(report, 'contact').timedSamples).toBe(0)
    expect(step(report, 'contact').medianSeconds).toBeNull()
  })

  it('counts a lead with an assessment as complete even when status lags', async () => {
    findMany.mockResolvedValue([
      { stepHistory: JSON.stringify([{ step: 'injury', at: new Date(T0).toISOString() }]), currentStep: 'injury', status: 'in_progress', assessmentId: 'asm-9' },
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(report.completedLeads).toBe(1)
    expect(step(report, 'injury').droppedHere).toBe(0)
  })

  it('ranks the worst drop-off steps by volume', async () => {
    findMany.mockResolvedValue([
      ...Array.from({ length: 3 }, () => lead([['injury', 0], ['treatment', 10]])),
      lead([['injury', 0]]),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(report.worstDropOff[0]).toMatchObject({ step: 'treatment', droppedHere: 3 })
    expect(report.worstDropOff[1]).toMatchObject({ step: 'injury', droppedHere: 1 })
  })

  it('survives malformed and truncated history rows', async () => {
    // `stepHistory` is a JSON string column capped at 60 entries, so a row can
    // be cut mid-write. One bad row must not take the whole report down.
    findMany.mockResolvedValue([
      { stepHistory: '[{"step":"injury","at":"2026-09', currentStep: 'injury', status: 'in_progress', assessmentId: null },
      { stepHistory: '{"not":"an array"}', currentStep: null, status: 'in_progress', assessmentId: null },
      { stepHistory: '[{"step":"","at":"nonsense"}]', currentStep: null, status: 'in_progress', assessmentId: null },
      lead([['injury', 0], ['contact', 12]]),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(report.totalLeads).toBe(1)
    expect(step(report, 'injury').reached).toBe(1)
  })

  it('reports empty rather than dividing by zero when there are no leads', async () => {
    findMany.mockResolvedValue([])

    const report = await buildIntakeFunnelReport(30)

    expect(report).toMatchObject({ totalLeads: 0, completedLeads: 0, completionRate: null, steps: [] })
  })
})

/**
 * The split that tells a layout problem from a question problem.
 *
 * Rolled up, a phone giving up at the upload step and a desktop giving up there
 * are one number. These pin the arithmetic that separates them, and the two
 * places it declines to report: a rate from too few leads, and leads from
 * before the column existed.
 */
describe('abandonment by device', () => {
  const many = (n: number, opts: { completed?: boolean; device: string }) =>
    Array.from({ length: n }, () => lead([['injury', 0], ['upload', 20]], opts))

  it('reports completion separately for each device', async () => {
    findMany.mockResolvedValue([
      ...many(15, { device: 'mobile', completed: true }),
      ...many(25, { device: 'mobile' }),
      ...many(30, { device: 'desktop', completed: true }),
      ...many(10, { device: 'desktop' }),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(device(report, 'mobile')).toMatchObject({ leads: 40, completedLeads: 15 })
    expect(device(report, 'mobile').completionRate).toBeCloseTo(0.375)
    expect(device(report, 'desktop').completionRate).toBeCloseTo(0.75)
  })

  /** The device most claimants use leads, not the one that converts worst. */
  it('puts the busiest device first', async () => {
    findMany.mockResolvedValue([
      ...many(20, { device: 'desktop' }),
      ...many(50, { device: 'mobile' }),
      ...many(5, { device: 'tablet' }),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(report.byDevice.map((d) => d.device)).toEqual(['mobile', 'desktop', 'tablet'])
  })

  /** The whole point: naming the step each device gives up on. */
  it('names where each device abandons', async () => {
    findMany.mockResolvedValue([
      ...Array.from({ length: 4 }, () =>
        lead([['injury', 0], ['upload', 20]], { device: 'mobile' }),
      ),
      lead([['injury', 0]], { device: 'mobile' }),
      ...Array.from({ length: 3 }, () =>
        lead([['injury', 0], ['damages', 20]], { device: 'desktop' }),
      ),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(device(report, 'mobile').worstStep).toEqual({ step: 'upload', droppedHere: 4 })
    expect(device(report, 'desktop').worstStep).toEqual({ step: 'damages', droppedHere: 3 })
  })

  /**
   * A rate off a handful of leads gets quoted in a meeting as though it were
   * measured, and this one is meant to justify a redesign.
   */
  it('withholds a completion rate built from too few leads', async () => {
    findMany.mockResolvedValue(many(4, { device: 'tablet' }))

    const report = await buildIntakeFunnelReport(30)

    expect(device(report, 'tablet')).toMatchObject({ leads: 4, completionRate: null })
  })

  /**
   * The User-Agent is not retained, so leads from before the column cannot be
   * backfilled. Filing them as `unknown` would sit a bucket of pre-launch
   * traffic beside the real devices and read as one.
   */
  it('leaves leads from before the column was added out of the split', async () => {
    findMany.mockResolvedValue([
      ...many(20, { device: 'mobile' }),
      ...Array.from({ length: 100 }, () => lead([['injury', 0]])),
    ])

    const report = await buildIntakeFunnelReport(30)

    expect(report.byDevice).toHaveLength(1)
    expect(report.totalLeads).toBe(120)
  })

  it('reports no split at all rather than an empty bucket', async () => {
    findMany.mockResolvedValue([lead([['injury', 0]])])

    const report = await buildIntakeFunnelReport(30)

    expect(report.byDevice).toEqual([])
  })
})
