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
import OpenAI from 'openai'
import { logger } from '../lib/logger'
import { ENV } from '../env'
import type { CaseIntelligence } from '../lib/case-intelligence'
import type { CaseCoachResult } from '../lib/case-coach'

const openai = (ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY)
  ? new OpenAI({ apiKey: ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY })
  : null

const COACH_MODEL = process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini'

export interface NarratedCoachResult extends CaseCoachResult {
  narrationSource: 'ai' | 'deterministic'
}

function buildPrompt(intel: CaseIntelligence, coach: CaseCoachResult): string {
  const known = intel.known.map((k) => `- ${k.label}: ${k.value}`).join('\n')
  const items = coach.insights
    .map((i) => `- [${i.key}] (${i.priority}) ${i.title} | impact: ${i.impact} | why: ${i.why}`)
    .join('\n')

  return `You are a senior personal-injury attorney coaching a colleague on a retained case.
Below is the case and a RANKED list of next-best actions produced by a deterministic engine.

CASE TYPE: ${intel.claimType}
INCIDENT NARRATIVE: ${intel.narrative || 'Not provided.'}

ALREADY KNOWN:
${known || '(none)'}

RANKED ACTIONS (do NOT add, remove, or reorder these):
${items || '(none)'}

Your job: rewrite ONLY the prose so it reads like sharp, practical coaching.
- Keep every key exactly as given.
- Do NOT change any numbers, dates, dollar amounts, or deadlines.
- Each "why" must be one or two tight sentences, concrete and specific to this case.
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
  if (!openai || coach.insights.length === 0) {
    return { ...coach, narrationSource: 'deterministic' }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: COACH_MODEL,
      messages: [
        { role: 'system', content: 'You are a senior personal-injury attorney. Always respond with valid JSON as specified. Never fabricate facts or figures.' },
        { role: 'user', content: buildPrompt(intel, coach) },
      ],
      temperature: 0.4,
      max_tokens: 900,
      response_format: { type: 'json_object' },
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

    logger.info('Narrated case coach', { assessmentId: coach.assessmentId, rewritten: whyByKey.size })
    return { ...coach, headline, insights, narrationSource: 'ai' }
  } catch (error: any) {
    logger.warn('Case coach narration failed; using deterministic copy', { assessmentId: coach.assessmentId, error: error?.message })
    return { ...coach, narrationSource: 'deterministic' }
  }
}
