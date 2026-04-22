import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createCompletion } = vi.hoisted(() => ({
  createCompletion: vi.fn(),
}))

vi.mock('../env', () => ({
  ENV: {
    OPENAI_API_KEY: 'test-openai-key',
  },
}))

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: createCompletion,
      },
    }
  },
}))

import { analyzeCaseWithChatGPT } from './chatgpt'

describe('analyzeCaseWithChatGPT', () => {
  beforeEach(() => {
    createCompletion.mockReset()
  })

  it('normalizes partial incident data before building the LLM prompt', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      usage: { total_tokens: 123 },
    })

    await analyzeCaseWithChatGPT({
      assessmentId: 'asm-chatgpt-1',
      caseData: {
        claimType: 'auto',
        venue: { state: 'CA' },
        incident: {},
        damages: {},
        evidence: [],
      },
    })

    expect(createCompletion).toHaveBeenCalledOnce()
    const payload = createCompletion.mock.calls[0][0]
    const prompt = payload.messages[1].content as string

    expect(prompt).toContain('Incident Date: ')
    expect(prompt).toContain('Narrative: Narrative not yet provided.')
  })

  it('falls back gracefully when the model returns invalid JSON', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: 'not-json' } }],
      usage: { total_tokens: 77 },
    })

    const result = await analyzeCaseWithChatGPT({
      assessmentId: 'asm-chatgpt-2',
      caseData: {
        claimType: 'auto',
        venue: { state: 'CA' },
        incident: {},
        damages: {},
        evidence: [],
      },
    })

    expect(result.assessmentId).toBe('asm-chatgpt-2')
    expect(result.analysis.caseStrength.overall).toBe(50)
    expect(result.analysis.strengths).toContain('Basic incident information is available')
  })
})
