import OpenAI from 'openai'
import { ENV } from '../env'
import { logger } from './logger'

/**
 * Unified LLM client that lets the app switch between OpenAI and Kimi
 * (Moonshot AI) without rewriting every call site. Kimi exposes an
 * OpenAI-compatible chat-completions API, so we reuse the `openai` SDK and
 * only change the baseURL, apiKey, and model.
 *
 * Image generation is NOT routed here — Kimi does not support image
 * generation, so incident-scene images continue to use the native OpenAI
 * DALL-E client.
 */

const provider = (ENV.AI_PROVIDER || 'openai').toLowerCase()

export const isKimiProvider = () => provider === 'kimi'

const openaiChatClient = ENV.OPENAI_API_KEY
  ? new OpenAI({ apiKey: ENV.OPENAI_API_KEY })
  : null

const kimiChatClient = ENV.KIMI_API_KEY
  ? new OpenAI({ apiKey: ENV.KIMI_API_KEY, baseURL: ENV.KIMI_BASE_URL })
  : null

/**
 * Return the configured chat-completion client. Prefers the provider
 * selected by AI_PROVIDER, but falls back to the other provider if the
 * chosen one is missing credentials.
 */
export function getLlmChatClient(): OpenAI | null {
  if (provider === 'kimi') {
    if (kimiChatClient) return kimiChatClient
    logger.warn(
      'AI_PROVIDER=kimi but KIMI_API_KEY is missing; falling back to OpenAI for text completions.',
    )
    return openaiChatClient
  }
  if (openaiChatClient) return openaiChatClient
  logger.warn(
    'AI_PROVIDER=openai but OPENAI_API_KEY is missing; falling back to Kimi for text completions.',
  )
  return kimiChatClient
}

/** Model to use for chat completions. */
export const LLM_CHAT_MODEL =
  provider === 'kimi' ? ENV.KIMI_MODEL : ENV.OPENAI_ANALYSIS_MODEL

/** Native OpenAI client reserved for image generation (DALL-E). */
export const openaiImageClient = ENV.OPENAI_API_KEY
  ? new OpenAI({ apiKey: ENV.OPENAI_API_KEY })
  : null

/** True when no chat-completion provider is configured at all. */
export function llmChatDisabled(): boolean {
  return !openaiChatClient && !kimiChatClient
}
