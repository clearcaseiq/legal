import { describe, expect, it, vi } from 'vitest'

vi.mock('../env', () => ({
  ENV: {
    OPENAI_API_KEY: 'sk-test',
    OPENAI_ANALYSIS_MODEL: 'gpt-4o-mini',
    OPENAI_PLANNING_MODEL: 'gpt-4o',
    OPENAI_WRITING_MODEL: undefined,
  },
}))

vi.mock('openai', () => {
  class OpenAI {
    apiKey: string
    baseURL?: string
    chat = {
      completions: {
        create: vi.fn(),
      },
    }
    constructor(opts: { apiKey: string; baseURL?: string }) {
      this.apiKey = opts.apiKey
      this.baseURL = opts.baseURL
    }
  }
  return { default: OpenAI }
})

/**
 * Fallback is between OpenAI models now, not between vendors. Kimi used to be
 * the second candidate; these tests exist to prove that removing it did not
 * also remove the retry, which is the part that kept planning working when a
 * model call failed.
 */
describe('planning / writing candidate order', () => {
  it('prefers the planning model, then the analysis model', async () => {
    const { resolveLlmPlanningCandidates } = await import('./llm-client')
    const c = resolveLlmPlanningCandidates()
    expect(c.length).toBe(2)
    expect(c[0]).toMatchObject({ provider: 'openai', model: 'gpt-4o' })
    expect(c[1]).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini' })
  })

  it('falls through to the next model on failure', async () => {
    const { resolveLlmPlanningCandidates, llmChatCompleteWithFallback } = await import('./llm-client')
    const candidates = resolveLlmPlanningCandidates()
    const { result, resolved, attempted } = await llmChatCompleteWithFallback({
      kind: 'test',
      candidates,
      run: async (c) => {
        if (c.model === 'gpt-4o') throw new Error('planning model down')
        return { ok: true, via: c.model }
      },
    })
    expect(result).toEqual({ ok: true, via: 'gpt-4o-mini' })
    expect(resolved.model).toBe('gpt-4o-mini')
    expect(attempted[0].error).toMatch(/planning model down/)
    expect(attempted).toHaveLength(2)
  })

  it('collapses to one candidate when writing has no dedicated model', async () => {
    const { resolveLlmWritingCandidates } = await import('./llm-client')
    // OPENAI_WRITING_MODEL is unset above, so both slots resolve to the
    // analysis model and the duplicate is dropped rather than retried against
    // itself.
    const c = resolveLlmWritingCandidates()
    expect(c).toHaveLength(1)
    expect(c[0]).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini' })
  })
})
