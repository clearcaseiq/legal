import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createCompletion, ENV } = vi.hoisted(() => ({
  createCompletion: vi.fn(),
  ENV: { OPENAI_API_KEY: 'test-openai-key', LLM_ALLOW_PHI: false },
}))

vi.mock('../env', () => ({ ENV }))
vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: createCompletion } }
  },
}))

import { translateText } from './translate'

describe('translateText', () => {
  beforeEach(() => {
    createCompletion.mockReset()
    createCompletion.mockResolvedValue({ choices: [{ message: { content: 'Me duele la espalda.' } }] })
  })

  it('returns the original message without calling the model while LLM_ALLOW_PHI is false', async () => {
    ENV.LLM_ALLOW_PHI = false
    expect(await translateText('My back still hurts.', 'es', 'en')).toBe('My back still hurts.')
    expect(createCompletion).not.toHaveBeenCalled()
  })

  it('translates once LLM_ALLOW_PHI is true', async () => {
    ENV.LLM_ALLOW_PHI = true
    expect(await translateText('My back still hurts.', 'es', 'en')).toBe('Me duele la espalda.')
    expect(createCompletion).toHaveBeenCalledOnce()
  })
})
