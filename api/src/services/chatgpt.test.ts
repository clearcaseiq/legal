import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createCompletion } = vi.hoisted(() => ({
  createCompletion: vi.fn(),
}))

const { ENV } = vi.hoisted(() => ({
  ENV: { OPENAI_API_KEY: 'test-openai-key', LLM_ALLOW_PHI: true },
}))

vi.mock('../env', () => ({ ENV }))

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
    ENV.LLM_ALLOW_PHI = true
  })

  it('withholds the narrative and medical bill amounts while LLM_ALLOW_PHI is false', async () => {
    ENV.LLM_ALLOW_PHI = false
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      usage: { total_tokens: 10 },
    })

    await analyzeCaseWithChatGPT({
      assessmentId: 'asm-chatgpt-phi',
      caseData: {
        claimType: 'auto',
        venue: { state: 'CA' },
        incident: { narrative: 'Rear-ended on the 405; herniated disc at L4-L5, two epidural injections.' },
        damages: { med_charges: 18450, med_paid: 3200 },
        evidence: [],
      },
    })

    const prompt = createCompletion.mock.calls[0][0].messages[1].content as string
    expect(prompt).not.toContain('herniated')
    expect(prompt).not.toContain('18450')
    expect(prompt).not.toContain('3200')
    expect(prompt).toContain('LLM_ALLOW_PHI=false')
    expect(prompt).toContain('Medical Bills: provided (amounts withheld)')
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
