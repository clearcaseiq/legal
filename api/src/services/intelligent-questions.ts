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
import {
  resolveLlmWritingCandidates,
  llmChatCompleteWithFallback,
  llmTemperatureForProvider,
  llmMaxTokensForProvider,
} from '../lib/llm-client'
import { prepareCaseIntelligenceForLlm, llmPhiMode } from '../lib/llm-prompt-sanitize'
import { recordAiRun } from '../lib/ai-run'
import { normalizeQuestionText } from '../lib/task-identity'

function dedupeQuestions(questions: IntelligentQuestion[]): IntelligentQuestion[] {
  const seen = new Set<string>()
  const out: IntelligentQuestion[] = []
  // Prefer higher valueImpact when the same wording appears twice.
  const rank = { high: 3, medium: 2, low: 1 }
  const sorted = [...questions].sort((a, b) => (rank[b.valueImpact] || 0) - (rank[a.valueImpact] || 0))
  for (const q of sorted) {
    const norm = normalizeQuestionText(q.text)
    if (!norm || seen.has(norm)) continue
    // Also collapse near-duplicates that share a long stem (baseline + AI restatement).
    let duplicate = false
    for (const existing of seen) {
      if (norm.length >= 24 && existing.length >= 24 && (norm.includes(existing.slice(0, 28)) || existing.includes(norm.slice(0, 28)))) {
        duplicate = true
        break
      }
    }
    if (duplicate) continue
    seen.add(norm)
    out.push(q)
  }
  return out
}

const QUESTIONS_CANDIDATES = resolveLlmWritingCandidates()
const MAX_AI_QUESTIONS = 8
const MAX_TOTAL_QUESTIONS = 18
const VALID_SECTIONS: QuestionSection[] = ['Liability', 'Medical', 'Damages', 'Insurance', 'Case Strategy']

export interface IntelligentQuestionsResult {
  questions: IntelligentQuestion[]
  source: 'ai' | 'baseline'
  modelVersion: string
}

function buildPrompt(intelIn: CaseIntelligence, baseline: IntelligentQuestion[]): string {
  const { intel, phiMode } = prepareCaseIntelligenceForLlm(intelIn)
  const known = intel.known.map((k) => `- ${k.label}: ${k.value}`).join('\n')
  const gaps = intel.gaps
    .filter((g) => !g.resolved)
    .map((g) => {
      const stars = typeof g.severity === 'number' ? '★'.repeat(g.severity) : ''
      return `- ${g.label}${stars ? ` (${stars}, impact: ${g.valueImpact})` : ` (impact: ${g.valueImpact})`}`
    })
    .join('\n')
  const baselineList = baseline.map((q) => `- [${q.id}] (${q.section}) ${q.text}`).join('\n')

  const narrativeLine =
    phiMode === 'keys_only'
      ? 'INCIDENT NARRATIVE: [omitted — LLM_ALLOW_PHI=false; use gap keys only]'
      : `INCIDENT NARRATIVE: ${intel.narrative || 'Not provided.'}`

  return `You are an experienced personal-injury intake attorney preparing for a first consultation.
The AI has ALREADY collected the facts below — do NOT ask about anything already known.
PHI_MODE: ${phiMode}. Contact PII is always removed. Never ask for SSN, email, phone, or full street address.

CASE TYPE: ${intel.claimType}
${narrativeLine}

ALREADY KNOWN:
${known || '(none)'}

KNOWN GAPS (still missing):
${gaps || '(none)'}

CANDIDATE BASELINE QUESTIONS:
${baselineList || '(none)'}

Your job:
1. From the candidate baseline questions, list the ids that should be PRUNED because they are redundant with what's already known or irrelevant to this specific case.
2. Add up to ${MAX_AI_QUESTIONS} NEW, case-specific questions that a great attorney would ask given the narrative and gaps. Each must be a question the client can answer (not a task). Do NOT ask for any value/settlement numbers. Never ask for SSN, email, phone, or full street address.
3. When PHI_MODE=keys_only, do not invent clinical facts; prefer questions tied to open gap keys.

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
  const baselineDeduped = dedupeQuestions(baseline)
  if (!QUESTIONS_CANDIDATES.length) {
    return { questions: baselineDeduped, source: 'baseline', modelVersion: 'baseline-v1' }
  }

  const started = Date.now()
  const primary = QUESTIONS_CANDIDATES[0]
  try {
    const { result: completion, resolved, attempted } = await llmChatCompleteWithFallback({
      kind: 'intelligent_questions',
      candidates: QUESTIONS_CANDIDATES,
      run: (candidate) =>
        candidate.client.chat.completions.create({
          model: candidate.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert personal-injury intake attorney. Always respond with valid JSON as specified. Never repeat a baseline question with different wording.',
            },
            { role: 'user', content: buildPrompt(intel, baselineDeduped) },
          ],
          temperature: llmTemperatureForProvider(candidate.provider, 0.4),
          max_tokens: llmMaxTokensForProvider(candidate.provider, 1200),
          response_format: { type: 'json_object' },
        }),
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) throw new Error('Empty response')

    const parsed = JSON.parse(responseText) as { prune?: unknown; questions?: unknown }
    const pruneIds = new Set(Array.isArray(parsed.prune) ? parsed.prune.map((x) => String(x)) : [])

    // Never prune high-impact baseline questions — attorneys need the full
    // liability/medical/damages core even when the model thinks it's "known".
    const kept = baselineDeduped.filter(
      (q) => q.valueImpact === 'high' || !pruneIds.has(q.id),
    )

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

    const questions = dedupeQuestions([...kept, ...aiQuestions]).slice(0, MAX_TOTAL_QUESTIONS)
    const usage = completion.usage
    await recordAiRun({
      kind: 'intelligent_questions',
      assessmentId: intel.assessmentId,
      provider: resolved.provider,
      model: resolved.model,
      status: 'ok',
      latencyMs: Date.now() - started,
      inputSummary: {
        baselineCount: baselineDeduped.length,
        phiMode: llmPhiMode(),
        usedFallback: attempted.length > 1,
        attempted,
      },
      outputSummary: { kept: kept.length, added: aiQuestions.length, total: questions.length },
      tokenUsage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : null,
    })
    logger.info('Generated intelligent questions', {
      assessmentId: intel.assessmentId,
      kept: kept.length,
      added: aiQuestions.length,
      afterDedupe: questions.length,
      provider: resolved.provider,
      model: resolved.model,
    })
    return { questions, source: 'ai', modelVersion: `${resolved.model}` }
  } catch (error: any) {
    await recordAiRun({
      kind: 'intelligent_questions',
      assessmentId: intel.assessmentId,
      provider: primary.provider,
      model: primary.model,
      status: 'error',
      latencyMs: Date.now() - started,
      error: error?.message || String(error),
    })
    logger.warn('Intelligent question generation failed; using baseline', {
      assessmentId: intel.assessmentId,
      error: error?.message,
    })
    return { questions: baselineDeduped, source: 'baseline', modelVersion: 'baseline-v1' }
  }
}
