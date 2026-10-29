import OpenAI from 'openai'
import { ENV } from '../env'
import { logger } from './logger'
import { llmAllowPhi, sanitizeLlmMessages } from './llm-prompt-sanitize'
import { createLlmDeidentifier, LLM_SUBJECT, restoreLlmAnswer, type LlmSubject } from './llm-deidentify'

/**
 * The app's single text-completion provider: OpenAI.
 *
 * This used to switch between OpenAI and Kimi (Moonshot AI) on `AI_PROVIDER`.
 * Kimi was removed because claimant narratives and medical detail are PHI, and
 * that traffic needs to sit with one provider we hold a BAA with. Consolidating
 * also retired a class of bug the old code documented: an OpenAI model name
 * paired with the Kimi client, which failed silently.
 *
 * Resilience did not come from having a second vendor — it came from having a
 * second candidate. `resolveLlmPlanningCandidates` and its writing counterpart
 * still return a list, now a stronger OpenAI model followed by the standard
 * analysis model, so `llmChatCompleteWithFallback` still has somewhere to go
 * when the first attempt fails.
 *
 * Image generation uses `openaiImageClient` below and never routes through the
 * chat path.
 *
 * Privacy: every chat.completions payload is PII-redacted (SSN, email, phone,
 * street address) before it leaves the process — see llm-prompt-sanitize.ts —
 * and, until a BAA is signed, fully de-identified — see llm-deidentify.ts. The
 * image client is not wrapped; its prompts must be de-identified by the caller.
 */

const PLACEHOLDER_INSTRUCTION =
  'Bracketed placeholders such as [NAME#1], [DATE#2 2026 +45d] or [PLACE#1] stand in for identifying details that were removed. ' +
  'A DATE placeholder gives the year and the number of days from the earliest date in this request. ' +
  'Copy a placeholder exactly as written wherever you refer to what it stands for; never guess or invent what it hides.'

function messageTexts(messages: any[]): string[] {
  const out: string[] = []
  for (const m of messages) {
    if (typeof m?.content === 'string') out.push(m.content)
    else if (Array.isArray(m?.content)) for (const part of m.content) if (typeof part?.text === 'string') out.push(part.text)
  }
  return out
}

function mapMessageTexts(messages: any[], fn: (text: string) => string): any[] {
  return messages.map((m) => {
    if (typeof m?.content === 'string') return { ...m, content: fn(m.content) }
    if (Array.isArray(m?.content)) {
      return { ...m, content: m.content.map((part: any) => (typeof part?.text === 'string' ? { ...part, text: fn(part.text) } : part)) }
    }
    return m
  })
}

/**
 * Wrap chat.completions.create so contact/identity PII can never ride along
 * in prompts, regardless of which call site built the messages. Without a BAA
 * (LLM_ALLOW_PHI=false) every identifier is also swapped for a placeholder on
 * the way out and restored in the answer, so callers see real names and dates
 * while the vendor never does.
 */
function withPromptSanitizer(client: OpenAI): OpenAI {
  const completions = client.chat.completions as any
  if (completions.__cciPiiWrapped) return client
  const originalCreate = completions.create.bind(completions)
  completions.create = (body: any, options?: any) => {
    if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) return originalCreate(body, options)
    if (llmAllowPhi()) return originalCreate({ ...body, messages: sanitizeLlmMessages(body.messages) }, options)

    const subject: LlmSubject = body[LLM_SUBJECT] || {}
    const deid = createLlmDeidentifier(subject, messageTexts(body.messages))
    const masked = mapMessageTexts(body.messages, deid.mask)
    const messages = deid.count() > 0 ? [{ role: 'system', content: PLACEHOLDER_INSTRUCTION }, ...masked] : masked
    return Promise.resolve(originalCreate({ ...body, messages }, options)).then((completion: any) => {
      if (subject.restore === false || !Array.isArray(completion?.choices)) return completion
      for (const choice of completion.choices) {
        if (typeof choice?.message?.content === 'string') {
          choice.message.content = restoreLlmAnswer(deid, choice.message.content)
        }
      }
      return completion
    })
  }
  completions.__cciPiiWrapped = true
  return client
}

const openaiChatClient = ENV.OPENAI_API_KEY
  ? withPromptSanitizer(new OpenAI({ apiKey: ENV.OPENAI_API_KEY }))
  : null

type LlmChatResolved = {
  client: OpenAI
  model: string
  provider: 'openai'
}

/** Build the candidate list for a task, dropping duplicate models. */
function candidatesFor(models: Array<string | undefined>): LlmChatResolved[] {
  if (!openaiChatClient) return []
  const seen = new Set<string>()
  const out: LlmChatResolved[] = []
  for (const model of models) {
    if (!model || seen.has(model)) continue
    seen.add(model)
    out.push({ client: openaiChatClient, model, provider: 'openai' })
  }
  return out
}

/** Resolve the chat client and its matching model together. */
export function resolveLlmChat(): LlmChatResolved | null {
  if (!openaiChatClient) return null
  return {
    client: openaiChatClient,
    model: ENV.OPENAI_ANALYSIS_MODEL,
    provider: 'openai',
  }
}

/**
 * Return the configured chat-completion client, or null when no API key is
 * set.
 */
export function getLlmChatClient(): OpenAI | null {
  return resolveLlmChat()?.client ?? null
}

/** Model paired with the active chat client (see resolveLlmChat). */
export function getLlmChatModel(): string {
  return resolveLlmChat()?.model ?? ENV.OPENAI_ANALYSIS_MODEL
}

/** Model paired with the active chat client (see resolveLlmChat). */
export const LLM_CHAT_MODEL = getLlmChatModel()

/**
 * Models for Workflow/Task planning, strongest first. The analysis model
 * trails the planning model so a failure on the stronger model still produces
 * a plan rather than an error.
 */
export function resolveLlmPlanningCandidates(): LlmChatResolved[] {
  return candidatesFor([ENV.OPENAI_PLANNING_MODEL, ENV.OPENAI_ANALYSIS_MODEL])
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
 * Models for the writing paths (coach narration, intelligent questions).
 * Falls back to the standard analysis model when OPENAI_WRITING_MODEL is
 * unset, and again as the second candidate when it is.
 */
export function resolveLlmWritingCandidates(): LlmChatResolved[] {
  return candidatesFor([ENV.OPENAI_WRITING_MODEL, ENV.OPENAI_ANALYSIS_MODEL])
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

/**
 * Try chat.completions across candidates in order, strongest model first.
 * Returns the first successful completion plus which candidate produced it.
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
  return !openaiChatClient
}
