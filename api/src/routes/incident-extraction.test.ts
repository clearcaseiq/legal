import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { extractIncidentDetails, ENV } = vi.hoisted(() => ({
  extractIncidentDetails: vi.fn(),
  ENV: { OPENAI_API_KEY: 'test-openai-key', LLM_ALLOW_PHI: false },
}))

vi.mock('../env', () => ({ ENV }))
vi.mock('../lib/incident-extraction', () => ({ extractIncidentDetails }))

import router from './incident-extraction'

const app = express().use(express.json()).use('/v1/incident-extraction', router)
const narrative = 'Rear-ended at a light on Wilshire; neck pain, went to urgent care that night.'

describe('POST /v1/incident-extraction', () => {
  beforeEach(() => {
    extractIncidentDetails.mockReset()
  })

  it('reports detection as switched off, without extracting, while LLM_ALLOW_PHI is false', async () => {
    ENV.LLM_ALLOW_PHI = false
    const res = await request(app).post('/v1/incident-extraction').send({ narrative }).expect(200)
    expect(res.body).toEqual({ extraction: null, disabled: true })
    expect(extractIncidentDetails).not.toHaveBeenCalled()
  })

  it('extracts once LLM_ALLOW_PHI is true', async () => {
    ENV.LLM_ALLOW_PHI = true
    extractIncidentDetails.mockResolvedValue({ crashType: 'rear_end' })
    const res = await request(app).post('/v1/incident-extraction').send({ narrative }).expect(200)
    expect(res.body).toEqual({ extraction: { crashType: 'rear_end' } })
  })
})
