/**
 * The intake preview must come from the engine, and must not create anything.
 *
 * The bug this closes: the wizard computed its own range in the browser, so the
 * claimant saw one figure on the final intake step and a different one on the
 * snapshot seconds later. This endpoint exists so there is one formula, and it
 * shares the create route's schema so there is also only one fact mapping.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'

let app: any
let createAssessment: ReturnType<typeof vi.spyOn>

beforeAll(async () => {
  const { buildApp } = await import('./build-app')
  app = await buildApp()

  // Spy rather than replace the client: mocking the whole module starves the
  // middleware that legitimately uses other models.
  const { prisma } = await import('./lib/prisma')
  createAssessment = vi.spyOn(prisma.assessment, 'create')
}, 120_000)

/** The delayed-appendicitis case that surfaced the discrepancy. */
function body(damages: Record<string, any> = {}) {
  return {
    claimType: 'medmal',
    venue: { state: 'CA', county: 'Los Angeles' },
    incident: {
      date: '2026-06-01',
      narrative: 'Sent home from the ER without testing; appendicitis diagnosed days later.',
    },
    injuries: [{ description: 'moderate', bodyParts: [{ part: 'abdomen', severity: 'moderate' }] }],
    damages: { med_charges: 30000, ...damages },
  }
}

const post = (b: Record<string, any>) => request(app).post('/v1/assessments/preview').send(b)

describe('POST /v1/assessments/preview', () => {
  it('returns a band from the underwriting engine', async () => {
    const res = await post(body())

    expect(res.status).toBe(200)
    expect(res.body.settlement.low).toBeGreaterThan(0)
    expect(res.body.settlement.high).toBeGreaterThan(res.body.settlement.low)
    expect(res.body.preliminary).toBe(true)
  })

  it('brackets the expected value, so no surface has to derive one', async () => {
    const { low, expected, high } = (await post(body())).body.settlement

    expect(expected).toBeGreaterThanOrEqual(low)
    expect(expected).toBeLessThanOrEqual(high)
  })

  it('reports the model version, so a preview can be told from a stored valuation', async () => {
    expect((await post(body())).body.modelVersion).toContain('underwriting')
  })

  it('carries the liability-scaled trial band rather than a second trial formula', async () => {
    const { trial } = (await post(body())).body

    expect(trial.high).toBeGreaterThan(trial.low)
  })

  it('creates no assessment, so previewing costs the claimant nothing', async () => {
    await post(body())

    expect(createAssessment).not.toHaveBeenCalled()
  })

  it('rejects a body the create route would also reject, rather than valuing nothing', async () => {
    expect((await post({ venue: { state: 'CA' } })).status).toBe(400)
  })

  it('is deterministic, so the figure does not move between the preview and the snapshot', async () => {
    const [a, b] = await Promise.all([post(body()), post(body())])

    expect(a.body.settlement).toEqual(b.body.settlement)
  })

  it('values a case with more medical bills higher', async () => {
    const small = await post(body({ med_charges: 5000 }))
    const large = await post(body({ med_charges: 60000 }))

    expect(large.body.settlement.expected).toBeGreaterThan(small.body.settlement.expected)
  })

  it('does not inherit the old preview ceiling of 2.4x reported bills', async () => {
    // The browser formula put this case at $72,000. The engine weighs liability,
    // which is the whole reason the two disagreed.
    const { high } = (await post(body({ med_charges: 30000 }))).body.settlement

    expect(high).toBeLessThan(30000 * 2.4)
  })

  it('does not require accepted consents, since the preview renders on that step', async () => {
    const withoutConsents = body()

    expect('consents' in withoutConsents).toBe(false)
    expect((await post(withoutConsents)).status).toBe(200)
  })
})
