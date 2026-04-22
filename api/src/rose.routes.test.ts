import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createConversationState: vi.fn((conversationId: string) => ({
    conversation_id: conversationId,
    current_step: 'story_capture',
  })),
  processUserTurn: vi.fn(),
}))

vi.mock('./lib/auth', () => ({
  optionalAuthMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

vi.mock('./services/chatgpt', () => ({
  analyzeCaseWithChatGPT: vi.fn().mockResolvedValue({ summary: 'mock' }),
}))

vi.mock('./lib/rose-engine', () => ({
  createConversationState: mocks.createConversationState,
  processUserTurn: mocks.processUserTurn,
}))

import roseRouter from './routes/rose'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

function buildTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/v1/rose', roseRouter)
  return app
}

describe('rose conversation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetUniversalPrismaMock()
    mocks.createConversationState.mockImplementation((conversationId: string) => ({
      conversation_id: conversationId,
      current_step: 'story_capture',
    }))
  })

  it('starts story-first conversations with a phase', async () => {
    const app = buildTestApp()

    const res = await request(app).post('/v1/rose/conversation/start').send({})

    expect(res.status).toBe(200)
    expect(res.body.phase).toBe('story_capture')
    expect(res.body.message).toContain('Tell me what happened in your own words')
  })

  it('returns recap review metadata during confirmation', async () => {
    const app = buildTestApp()
    const start = await request(app).post('/v1/rose/conversation/start').send({})

    mocks.processUserTurn.mockResolvedValue({
      state: {
        current_step: 'recap_confirmation',
        ready_for_submission: true,
        completion_score: 1,
        pending_review: {
          plaintiff_summary: 'Rear-end collision with neck pain.',
          attorney_summary: 'Auto case with treatment and contact captured.',
          missing_required_fields: [],
          disposition: 'standard_review',
          confirmation_prompt: "Here's what I understand so far.",
        },
      },
      escalation: {
        disposition: 'standard_review',
        priority: 'medium',
        reason: 'Required intake fields are complete.',
      },
      review: {
        plaintiff_summary: 'Rear-end collision with neck pain.',
        attorney_summary: 'Auto case with treatment and contact captured.',
        missing_required_fields: [],
        disposition: 'standard_review',
        confirmation_prompt: "Here's what I understand so far.",
      },
    })

    const res = await request(app)
      .post(`/v1/rose/conversation/${start.body.conversation_id}/turn`)
      .send({ message: 'I was rear-ended at a red light.' })

    expect(res.status).toBe(200)
    expect(res.body.phase).toBe('recap_confirmation')
    expect(res.body.message).toBe("Here's what I understand so far.")
    expect(res.body.review.plaintiff_summary).toContain('Rear-end collision')
  })

  it('returns assessment metadata after recap confirmation', async () => {
    const app = buildTestApp()
    const start = await request(app).post('/v1/rose/conversation/start').send({})

    mocks.processUserTurn.mockResolvedValue({
      state: {
        current_step: 'completed',
        ready_for_submission: true,
        completion_score: 1,
      },
      escalation: {
        disposition: 'standard_review',
        priority: 'medium',
        reason: 'User confirmed the recap.',
      },
      finalSummary: {
        plaintiff_summary: 'You reported a rear-end collision and neck pain.',
        attorney_summary: 'Auto accident intake ready for review.',
        structured_payload: {
          case_type: 'auto_accident',
          incident_date: '2024-01-15',
          incident_location: 'Los Angeles, CA',
          incident_summary: 'Rear-ended at a red light.',
          injuries: ['neck pain'],
          treatment_level: 'doctor',
          plaintiff_contact: {
            full_name: 'Jane Doe',
            phone: '555-111-2222',
            state: 'CA',
          },
          escalation: { disposition: 'standard_review', reason: 'User confirmed the recap.' },
        },
      },
    })

    const res = await request(app)
      .post(`/v1/rose/conversation/${start.body.conversation_id}/turn`)
      .send({ message: "Yes, that's right." })

    expect(res.status).toBe(200)
    expect(res.body.phase).toBe('completed')
    expect(res.body.assessment_id).toBe('mock-id')
    expect(res.body.message).toContain('I have everything I need')
  })
})
