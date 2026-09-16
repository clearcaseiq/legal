/**
 * The intake preview asks the server, with the payload submit would send.
 *
 * The final intake step used to compute a range itself — the medical-bill
 * bracket midpoint times 0.8 and 2.4 — which disagreed with the modelled band
 * the claimant read on their snapshot seconds later, and only ever by
 * overstating. These pin the two properties that keep the figures identical:
 * the preview goes to the engine, and it carries the create payload unaltered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const post = vi.fn()

vi.mock('./http', () => ({ default: { post } }))

beforeEach(() => {
  post.mockReset()
  post.mockResolvedValue({
    data: {
      settlement: { low: 19000, expected: 35000, high: 45000 },
      trial: { low: 15000, expected: 81000, high: 146000 },
      liabilityGrade: 'Moderate',
      documentationScore: 45,
      modelVersion: 'ca-pi-underwriting-v1',
      preliminary: true,
    },
  })
})

/** A payload of the shape createAssessment takes. */
const payload = {
  claimType: 'medmal',
  venue: { state: 'CA', county: 'Los Angeles' },
  incident: { date: '2026-06-01', narrative: 'sent home from the ER' },
  damages: { med_charges: 30000 },
  consents: { tos: true, privacy: true, ml_use: true },
}

describe('previewAssessmentValuation', () => {
  it('posts to the preview endpoint beside the create route', async () => {
    const { previewAssessmentValuation } = await import('./api-plaintiff')
    await previewAssessmentValuation(payload)

    expect(post).toHaveBeenCalledWith('/v1/assessments/preview', payload)
  })

  it('passes the payload through untouched, so it cannot diverge from submit', async () => {
    const { previewAssessmentValuation } = await import('./api-plaintiff')
    await previewAssessmentValuation(payload)

    expect(post.mock.calls[0][1]).toBe(payload)
  })

  it("returns the engine's band rather than deriving one", async () => {
    const { previewAssessmentValuation } = await import('./api-plaintiff')
    const preview = await previewAssessmentValuation(payload)

    expect(preview.settlement).toEqual({ low: 19000, expected: 35000, high: 45000 })
    expect(preview.preliminary).toBe(true)
  })

  it('rejects rather than falling back to a figure of its own', async () => {
    post.mockRejectedValueOnce(new Error('503'))
    const { previewAssessmentValuation } = await import('./api-plaintiff')

    await expect(previewAssessmentValuation(payload)).rejects.toThrow()
  })
})
