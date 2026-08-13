import { describe, expect, it, vi } from 'vitest'

vi.mock('../env', () => ({
  ENV: {
    OPENAI_API_KEY: 'sk-test',
    OPENAI_ANALYSIS_MODEL: 'gpt-4o-mini',
    OPENAI_PLANNING_MODEL: 'gpt-4o',
    OPENAI_WRITING_MODEL: undefined,
    KIMI_API_KEY: 'kimi-test',
    KIMI_BASE_URL: 'https://api.moonshot.ai/v1',
    KIMI_MODEL: 'kimi-k3',
    KIMI_PLANNING_MODEL: undefined,
    AI_PROVIDER: 'openai',
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

describe('planning / writing candidate order', () => {
  it('prefers OpenAI gpt-4o then Kimi for planning', async () => {
    const { resolveLlmPlanningCandidates } = await import('./llm-client')
    const c = resolveLlmPlanningCandidates()
    expect(c.length).toBe(2)
    expect(c[0]).toMatchObject({ provider: 'openai', model: 'gpt-4o' })
    expect(c[1]).toMatchObject({ provider: 'kimi', model: 'kimi-k3' })
  })

  it('falls through candidates on failure', async () => {
    const { resolveLlmPlanningCandidates, llmChatCompleteWithFallback } = await import('./llm-client')
    const candidates = resolveLlmPlanningCandidates()
    const { result, resolved, attempted } = await llmChatCompleteWithFallback({
      kind: 'test',
      candidates,
      run: async (c) => {
        if (c.provider === 'openai') throw new Error('openai down')
        return { ok: true, via: c.provider }
      },
    })
    expect(result).toEqual({ ok: true, via: 'kimi' })
    expect(resolved.provider).toBe('kimi')
    expect(attempted[0].error).toMatch(/openai down/)
    expect(attempted).toHaveLength(2)
  })
})
