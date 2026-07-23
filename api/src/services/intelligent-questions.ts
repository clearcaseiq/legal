/**
 * Intelligent Questions — LLM personalization layer (Phase 1).
 *
 * Takes the deterministic Case Intelligence + baseline question bank and asks an
 * LLM to (a) prune baseline questions that no longer make sense for THIS case and
 * (b) add a few case-specific questions grounded in the collected facts. The LLM
 * only narrates/prioritizes: it never invents case values or scores.
 *
 * Fails safe: with no API key or on any error, returns the deterministic baseline.
 */
import { logger } from '../lib/logger'
import type { CaseIntelligence } from '../lib/case-intelligence'
import type { IntelligentQuestion, QuestionSection } from '../lib/intake-questions'
import { getLlmChatClient, LLM_CHAT_MODEL } from '../lib/llm-client'

const openai = getLlmChatClient()
const QUESTIONS_MODEL = LLM_CHAT_MODEL
const MAX_AI_QUESTIONS = 8
const MAX_TOTAL_QUESTIONS = 18
const VALID_SECTIONS: QuestionSection[] = ['Liability', 'Medical', 'Damages', 'Insurance', 'Case Strategy']

export interface IntelligentQuestionsResult {
  questions: IntelligentQuestion[]
  source: 'ai' | 'baseline'
  modelVersion: string
}

function buildPrompt(intel: CaseIntelligence, baseline: IntelligentQuestion[]): string {
  const known = intel.known.map((k) => `- ${k.label}: ${k.value}`).join('\n')
  const gaps = intel.gaps.map((g) => `- ${g.label} (${'★'.repeat(g.severity)}, impact: ${g.valueImpact})`).join('\n')
  const baselineList = baseline.map((q) => `- [${q.id}] (${q.section}) ${q.text}`).join('\n')

  return `You are an experienced personal-injury intake attorney preparing for a first consultation.
The AI has ALREADY collected the facts below — do NOT ask about anything already known.

CASE TYPE: ${intel.claimType}
INCIDENT NARRATIVE: ${intel.narrative || 'Not provided.'}

ALREADY KNOWN:
${known || '(none)'}

KNOWN GAPS (still missing):
${gaps || '(none)'}

CANDIDATE BASELINE QUESTIONS:
${baselineList || '(none)'}

Your job:
1. From the candidate baseline questions, list the ids that should be PRUNED because they are redundant with what's already known or irrelevant to this specific case.
2. Add up to ${MAX_AI_QUESTIONS} NEW, case-specific questions that a great attorney would ask given the narrative and gaps. Each must be a question the client can answer (not a task). Do NOT ask for any value/settlement numbers.

Respond with STRICT JSON only, in this shape:
{
  "prune": ["id1", "id2"],
  "questions": [
    { "section": "Liability|Medical|Damages|Insurance|Case Strategy", "text": "...", "whyAsked": "one sentence on why it matters", "valueImpact": "high|medium|low", "confidence": 0.0-1.0 }
  ]
}`
}

function sanitizeSection(value: unknown): QuestionSection {
  const v = String(value || '').trim() as QuestionSection
  return VALID_SECTIONS.includes(v) ? v : 'Case Strategy'
}

function sanitizeImpact(value: unknown): 'high' | 'medium' | 'low' {
  const v = String(value || '').toLowerCase()
  return v === 'high' || v === 'low' ? v : 'medium'
}

export async function generateIntelligentQuestions(
  intel: CaseIntelligence,
  baseline: IntelligentQuestion[],
): Promise<IntelligentQuestionsResult> {
  if (!openai) {
    return { questions: baseline, source: 'baseline', modelVersion: 'baseline-v1' }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: QUESTIONS_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert personal-injury intake attorney. Always respond with valid JSON as specified.' },
        { role: 'user', content: buildPrompt(intel, baseline) },
      ],
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) throw new Error('Empty response')

    const parsed = JSON.parse(responseText) as { prune?: unknown; questions?: unknown }
    const pruneIds = new Set(Array.isArray(parsed.prune) ? parsed.prune.map((x) => String(x)) : [])

    const kept = baseline.filter((q) => !pruneIds.has(q.id))

    const aiQuestions: IntelligentQuestion[] = Array.isArray(parsed.questions)
      ? parsed.questions.slice(0, MAX_AI_QUESTIONS).map((raw: any, i: number) => ({
          id: `ai_${i}`,
          section: sanitizeSection(raw?.section),
          text: String(raw?.text || '').trim(),
          whyAsked: String(raw?.whyAsked || '').trim(),
          valueImpact: sanitizeImpact(raw?.valueImpact),
          confidence: typeof raw?.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.7,
          source: 'ai' as const,
        })).filter((q: IntelligentQuestion) => q.text.length > 0)
      : []

    const questions = [...kept, ...aiQuestions].slice(0, MAX_TOTAL_QUESTIONS)
    logger.info('Generated intelligent questions', { assessmentId: intel.assessmentId, kept: kept.length, added: aiQuestions.length })
    return { questions, source: 'ai', modelVersion: `${QUESTIONS_MODEL}` }
  } catch (error: any) {
    logger.warn('Intelligent question generation failed; using baseline', { assessmentId: intel.assessmentId, error: error?.message })
    return { questions: baseline, source: 'baseline', modelVersion: 'baseline-v1' }
  }
}
