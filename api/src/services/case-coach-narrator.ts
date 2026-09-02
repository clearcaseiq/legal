/**
 * AI Case Coach — LLM narration layer (Phase 2).
 *
 * Takes the DETERMINISTIC coach feed and rewrites only the prose (the headline
 * and each insight's "why") in a crisp, senior-attorney coaching voice. It must
 * NOT add, remove, or reorder insights, and must NOT invent numbers, deadlines,
 * or dollar figures — those are fixed by the deterministic engine.
 *
 * Fails safe: with no API key or on any error, returns the deterministic feed
 * unchanged (source: 'deterministic').
 */
import { logger } from '../lib/logger'
import type { CaseIntelligence } from '../lib/case-intelligence'
import type { CaseCoachResult } from '../lib/case-coach'
import { resolveLlmWritingCandidates, llmChatCompleteWithFallback } from '../lib/llm-client'
import { prepareCaseIntelligenceForLlm, llmPhiMode } from '../lib/llm-prompt-sanitize'
import { recordAiRun } from '../lib/ai-run'

const COACH_CANDIDATES = resolveLlmWritingCandidates()

export interface NarratedCoachResult extends CaseCoachResult {
  narrationSource: 'ai' | 'deterministic'
}

function buildPrompt(intelIn: CaseIntelligence, coach: CaseCoachResult): string {
  const { intel, phiMode } = prepareCaseIntelligenceForLlm(intelIn)
  const known = intel.known.map((k) => `- ${k.label}: ${k.value}`).join('\n')
  const items = coach.insights
    .map((i) => {
      // In keys-only mode, drop engine "why" text — it may contain clinical detail.
      const why = phiMode === 'keys_only' ? '(use gap keys / title only)' : i.why
      return `- [${i.key}] (${i.priority}) ${i.title} | impact: ${i.impact} | why: ${why}`
    })
    .join('\n')

  const narrativeLine =
    phiMode === 'keys_only'
      ? 'INCIDENT NARRATIVE: [omitted — LLM_ALLOW_PHI=false]'
      : `INCIDENT NARRATIVE: ${intel.narrative || 'Not provided.'}`

  return `You are a senior personal-injury attorney coaching a colleague on a retained case.
Below is the case and a RANKED list of next-best actions produced by a deterministic engine.
PHI_MODE: ${phiMode}. Contact PII is always removed. Medical detail is omitted unless PHI_MODE=phi_allowed.

CASE TYPE: ${intel.claimType}
${narrativeLine}

ALREADY KNOWN:
${known || '(none)'}

RANKED ACTIONS (do NOT add, remove, or reorder these):
${items || '(none)'}

Your job: rewrite ONLY the prose so it reads like sharp, practical coaching.
- Keep every key exactly as given.
- Do NOT change any numbers, dates, dollar amounts, or deadlines.
- Each "why" must be one or two tight sentences, concrete and specific to this case.
- When PHI_MODE=keys_only, do not invent injuries, treatment, or clinical facts — coach from action titles and gap keys only.
- Also write a single "headline": the one most important thing to do next (<= 90 chars).

Respond with STRICT JSON only:
{
  "headline": "...",
  "insights": [ { "key": "...", "why": "..." } ]
}`
}

export async function narrateCaseCoach(
  intel: CaseIntelligence,
  coach: CaseCoachResult,
): Promise<NarratedCoachResult> {
  if (!COACH_CANDIDATES.length || coach.insights.length === 0) {
    return { ...coach, narrationSource: 'deterministic' }
  }

  const started = Date.now()
  const primary = COACH_CANDIDATES[0]
  try {
    const { result: completion, resolved, attempted } = await llmChatCompleteWithFallback({
      kind: 'coach_narrate',
      candidates: COACH_CANDIDATES,
      run: (candidate) =>
        candidate.client.chat.completions.create({
          model: candidate.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a senior personal-injury attorney. Always respond with valid JSON as specified. Never fabricate facts or figures.',
            },
            { role: 'user', content: buildPrompt(intel, coach) },
          ],
            temperature: 0.4,
            max_tokens: 900,
          response_format: { type: 'json_object' },
        }),
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) throw new Error('Empty response')

    const parsed = JSON.parse(responseText) as { headline?: unknown; insights?: unknown }
    const whyByKey = new Map<string, string>()
    if (Array.isArray(parsed.insights)) {
      for (const raw of parsed.insights as any[]) {
        const key = String(raw?.key || '')
        const why = String(raw?.why || '').trim()
        if (key && why) whyByKey.set(key, why)
      }
    }

    const insights = coach.insights.map((i) => ({ ...i, why: whyByKey.get(i.key) || i.why }))
    const headline = String(parsed.headline || '').trim() || coach.headline

    const usage = completion.usage
    await recordAiRun({
      kind: 'coach_narrate',
      assessmentId: coach.assessmentId,
      provider: resolved.provider,
      model: resolved.model,
      status: 'ok',
      latencyMs: Date.now() - started,
      inputSummary: {
        insightCount: coach.insights.length,
        phiMode: llmPhiMode(),
        usedFallback: attempted.length > 1,
        attempted,
      },
      outputSummary: { rewritten: whyByKey.size },
      tokenUsage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : null,
    })

    logger.info('Narrated case coach', {
      assessmentId: coach.assessmentId,
      rewritten: whyByKey.size,
      provider: resolved.provider,
      model: resolved.model,
    })
    return { ...coach, headline, insights, narrationSource: 'ai' }
  } catch (error: any) {
    await recordAiRun({
      kind: 'coach_narrate',
      assessmentId: coach.assessmentId,
      provider: primary.provider,
      model: primary.model,
      status: 'error',
      latencyMs: Date.now() - started,
      error: error?.message || String(error),
    })
    logger.warn('Case coach narration failed; using deterministic copy', {
      assessmentId: coach.assessmentId,
      error: error?.message,
    })
    return { ...coach, narrationSource: 'deterministic' }
  }
}
