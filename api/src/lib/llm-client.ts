import OpenAI from 'openai'
import { ENV } from '../env'
import { logger } from './logger'
import { sanitizeLlmMessages } from './llm-prompt-sanitize'

/**
 * Unified LLM client that lets the app switch between OpenAI and Kimi
 * (Moonshot AI) without rewriting every call site. Kimi exposes an
 * OpenAI-compatible chat-completions API, so we reuse the `openai` SDK and
 * only change the baseURL, apiKey, and model.
 *
 * Image generation is NOT routed here — Kimi does not support image
 * generation, so incident-scene images continue to use the native OpenAI
 * DALL-E client.
 *
 * Privacy: every chat.completions payload is PII-redacted (SSN, email, phone,
 * street address) before it leaves the process — see llm-prompt-sanitize.ts.
 */

const provider = (ENV.AI_PROVIDER || 'openai').toLowerCase()

export const isKimiProvider = () => provider === 'kimi'

/**
 * Wrap chat.completions.create so contact/identity PII can never ride along
 * in prompts, regardless of which call site built the messages.
 */
function withPromptSanitizer(client: OpenAI): OpenAI {
  const completions = client.chat.completions as any
  if (completions.__cciPiiWrapped) return client
  const originalCreate = completions.create.bind(completions)
  completions.create = (body: any, options?: any) => {
    if (body && typeof body === 'object' && Array.isArray(body.messages)) {
      body = { ...body, messages: sanitizeLlmMessages(body.messages) }
    }
    return originalCreate(body, options)
  }
  completions.__cciPiiWrapped = true
  return client
}

const openaiChatClient = ENV.OPENAI_API_KEY
  ? withPromptSanitizer(new OpenAI({ apiKey: ENV.OPENAI_API_KEY }))
  : null

const kimiChatClient = ENV.KIMI_API_KEY
  ? withPromptSanitizer(new OpenAI({ apiKey: ENV.KIMI_API_KEY, baseURL: ENV.KIMI_BASE_URL }))
  : null

type LlmChatResolved = {
  client: OpenAI
  model: string
  provider: 'openai' | 'kimi'
}

/**
 * Resolve the chat client + matching model together. Prefers AI_PROVIDER, but
 * falls back to the other provider when credentials are missing — and always
 * pairs the fallback client with that provider's model (using an OpenAI model
 * name against Kimi was a common cause of silent incident-extraction failures).
 */
export function resolveLlmChat(): LlmChatResolved | null {
  if (provider === 'kimi') {
    if (kimiChatClient) {
      return { client: kimiChatClient, model: ENV.KIMI_MODEL, provider: 'kimi' }
    }
    if (openaiChatClient) {
      logger.warn(
        'AI_PROVIDER=kimi but KIMI_API_KEY is missing; falling back to OpenAI for text completions.',
      )
      return {
        client: openaiChatClient,
        model: ENV.OPENAI_ANALYSIS_MODEL,
        provider: 'openai',
      }
    }
    return null
  }

  if (openaiChatClient) {
    return {
      client: openaiChatClient,
      model: ENV.OPENAI_ANALYSIS_MODEL,
      provider: 'openai',
    }
  }
  if (kimiChatClient) {
    logger.warn(
      'AI_PROVIDER=openai but OPENAI_API_KEY is missing; falling back to Kimi for text completions.',
    )
    return { client: kimiChatClient, model: ENV.KIMI_MODEL, provider: 'kimi' }
  }
  return null
}

/**
 * Return the configured chat-completion client. Prefers the provider
 * selected by AI_PROVIDER, but falls back to the other provider if the
 * chosen one is missing credentials.
 */
export function getLlmChatClient(): OpenAI | null {
  return resolveLlmChat()?.client ?? null
}

/** Model paired with the active chat client (see resolveLlmChat). */
export function getLlmChatModel(): string {
  return resolveLlmChat()?.model ?? (provider === 'kimi' ? ENV.KIMI_MODEL : ENV.OPENAI_ANALYSIS_MODEL)
}

/** Model for the active chat provider, including credential fallbacks. */
export const LLM_CHAT_MODEL = getLlmChatModel()

/**
 * Stronger (or explicitly configured) model for Workflow/Task planning.
 *
 * Planning always prefers OpenAI (gpt-4o by default) with Kimi as backup —
 * independent of AI_PROVIDER — based on the planning bake-off (latency/cost).
 */
export function resolveLlmPlanningCandidates(): LlmChatResolved[] {
  const out: LlmChatResolved[] = []
  if (openaiChatClient) {
    out.push({
      client: openaiChatClient,
      model: ENV.OPENAI_PLANNING_MODEL,
      provider: 'openai',
    })
  }
  if (kimiChatClient) {
    out.push({
      client: kimiChatClient,
      model: ENV.KIMI_PLANNING_MODEL || ENV.KIMI_MODEL,
      provider: 'kimi',
    })
  }
  return out
}

export function resolveLlmPlanning(): LlmChatResolved | null {
  return resolveLlmPlanningCandidates()[0] ?? null
}

export function getLlmPlanningClient(): OpenAI | null {
  return resolveLlmPlanning()?.client ?? null
}

export function getLlmPlanningModel(): string {
  return resolveLlmPlanning()?.model ?? ENV.OPENAI_PLANNING_MODEL
}

export const LLM_PLANNING_MODEL = getLlmPlanningModel()

/**
 * Optional writing model (coach narration, intelligent questions). Falls back
 * to the standard chat model when OPENAI_WRITING_MODEL is unset.
 * Candidates: OpenAI first, then Kimi (same backup posture as planning).
 */
export function resolveLlmWritingCandidates(): LlmChatResolved[] {
  const out: LlmChatResolved[] = []
  if (openaiChatClient) {
    out.push({
      client: openaiChatClient,
      model: ENV.OPENAI_WRITING_MODEL || ENV.OPENAI_ANALYSIS_MODEL,
      provider: 'openai',
    })
  }
  if (kimiChatClient) {
    out.push({
      client: kimiChatClient,
      model: ENV.KIMI_MODEL,
      provider: 'kimi',
    })
  }
  // If AI_PROVIDER prefers Kimi and OpenAI is missing, candidates already cover it.
  // If only Kimi exists, out has one entry.
  if (out.length === 0) {
    const base = resolveLlmChat()
    if (base) out.push(base)
  }
  return out
}

export function resolveLlmWriting(): LlmChatResolved | null {
  return resolveLlmWritingCandidates()[0] ?? null
}

export function getLlmWritingClient(): OpenAI | null {
  return resolveLlmWriting()?.client ?? null
}

export function getLlmWritingModel(): string {
  return resolveLlmWriting()?.model ?? getLlmChatModel()
}

/** Native OpenAI client reserved for image generation (DALL-E). */
export const openaiImageClient = ENV.OPENAI_API_KEY
  ? new OpenAI({ apiKey: ENV.OPENAI_API_KEY })
  : null

/** kimi-k3 currently rejects temperatures other than 1. */
export function llmTemperatureForProvider(
  provider: 'openai' | 'kimi' | string | null | undefined,
  preferred = 0.3,
): number {
  return provider === 'kimi' ? 1 : preferred
}

/** kimi-k3 spends tokens on reasoning — needs a higher completion ceiling. */
export function llmMaxTokensForProvider(
  provider: 'openai' | 'kimi' | string | null | undefined,
  preferred = 1600,
): number {
  return provider === 'kimi' ? Math.max(preferred, 8192) : preferred
}

/**
 * Try chat.completions across candidates in order (OpenAI → Kimi for planning).
 * Returns the first successful completion plus which provider won.
 */
export async function llmChatCompleteWithFallback<T>(params: {
  kind: string
  candidates: LlmChatResolved[]
  run: (resolved: LlmChatResolved) => Promise<T>
}): Promise<{ result: T; resolved: LlmChatResolved; attempted: Array<{ provider: string; model: string; error?: string }> }> {
  const attempted: Array<{ provider: string; model: string; error?: string }> = []
  if (!params.candidates.length) {
    throw new Error(`No LLM candidates configured for ${params.kind}`)
  }

  let lastError: unknown
  for (let i = 0; i < params.candidates.length; i++) {
    const candidate = params.candidates[i]
    try {
      const result = await params.run(candidate)
      if (i > 0) {
        logger.warn('LLM fallback succeeded', {
          kind: params.kind,
          provider: candidate.provider,
          model: candidate.model,
          failedBefore: attempted,
        })
      }
      attempted.push({ provider: candidate.provider, model: candidate.model })
      return { result, resolved: candidate, attempted }
    } catch (error: any) {
      lastError = error
      attempted.push({
        provider: candidate.provider,
        model: candidate.model,
        error: error?.message || String(error),
      })
      const hasNext = i < params.candidates.length - 1
      logger.warn('LLM candidate failed; trying next if available', {
        kind: params.kind,
        provider: candidate.provider,
        model: candidate.model,
        error: error?.message || String(error),
        hasNext,
      })
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/** True when no chat-completion provider is configured at all. */
export function llmChatDisabled(): boolean {
  return !openaiChatClient && !kimiChatClient
}
