/**
 * Per-case AI assistant.
 *
 * Wraps the deterministic command-center copilot the way case-coach-narrator
 * wraps the coach feed: the grounding — readiness, value story, gaps, defense
 * risks, and the cited sources — is computed from the record, and the model
 * only turns that into an answer to what was actually asked. Previously the
 * copilot matched keywords, so anything outside its eight branches fell through
 * to a canned stage summary that ignored the question.
 *
 * It can also do one thing rather than just answer: drafting the demand letter.
 * That intent is detected deterministically rather than by asking the model to
 * pick a tool, because "draft the demand" writes to the case and a
 * false positive is expensive.
 */
import { logger } from '../lib/logger'
import { getLlmChatClient, LLM_CHAT_MODEL } from '../lib/llm-client'
import { answerCommandCenterCopilot } from '../lib/case-command-center'
import type { CaseCommandCenter } from '../lib/case-command-center'

const openai = getLlmChatClient()

export interface CaseAssistantAnswer {
  answer: string
  sources: Array<{ label: string; detail: string }>
  source: 'ai' | 'deterministic'
  /** Set when the assistant recognised a request to write the demand letter. */
  action?: { type: 'draft_demand'; guidance: string | null }
}

const DEMAND_VERB = /\b(draft|write|generate|prepare|create|start|put together|build)\b/
const DEMAND_NOUN = /\b(demand|demand letter|settlement demand)\b/

/**
 * True for "draft the demand letter", false for "is this demand-ready?".
 *
 * Requires an explicit authoring verb, so the many questions that merely
 * mention the demand stage stay questions.
 */
export function detectDemandDraftIntent(question: string): boolean {
  const q = question.toLowerCase()
  if (!DEMAND_NOUN.test(q)) return false
  if (!DEMAND_VERB.test(q)) return false
  // "when should we draft the demand" is asking, not instructing.
  if (/\b(when|should we|should i|do we need|is it time|how do i|how long)\b/.test(q)) return false
  return true
}

function buildPrompt(summary: CaseCommandCenter, question: string): string {
  const facts = [
    `Stage: ${summary.stage.title} — ${summary.stage.detail}`,
    `Readiness: ${summary.readiness.score}% (${summary.readiness.label}) — ${summary.readiness.detail}`,
    `Value story: ${summary.valueStory.detail}`,
    `Coverage: ${summary.coverageStory.detail}`,
    `Negotiation: ${summary.negotiationSummary.posture} ${summary.negotiationSummary.recommendedMove}`,
    `Treatment: ${summary.treatmentMonitor.status}. ${summary.treatmentMonitor.recommendedAction}`,
    `Next best action: ${summary.nextBestAction.title} — ${summary.nextBestAction.detail}`,
  ]
  const missing = summary.missingItems.map((m) => `- ${m.label}`).join('\n')
  const strengths = summary.strengths.map((s) => `- ${s.title}: ${s.detail}`).join('\n')
  const weaknesses = summary.weaknesses.map((s) => `- ${s.title}: ${s.detail}`).join('\n')
  const risks = summary.defenseRisks.map((s) => `- ${s.title}: ${s.detail}`).join('\n')
  const sources = summary.sources.map((s) => `- ${s.label}: ${s.detail}`).join('\n')

  return `You are assisting the legal team working a personal-injury case. Answer their question using ONLY the case record below.

CASE RECORD
${facts.join('\n')}

MISSING ITEMS:
${missing || '(none)'}

STRENGTHS:
${strengths || '(none)'}

WEAKNESSES:
${weaknesses || '(none)'}

DEFENSE RISKS:
${risks || '(none)'}

SUPPORTING DATA:
${sources || '(none)'}

QUESTION: ${question}

Rules:
- Use only the record above. If it does not answer the question, say plainly what is missing and what would answer it.
- Never invent a dollar amount, date, provider, deadline, or document that does not appear above.
- Be direct and practical, as one colleague to another. Two to five sentences. No preamble, no bullet lists, no headings.

Respond with STRICT JSON only:
{ "answer": "..." }`
}

/**
 * Answer a free-text question about a case.
 *
 * Falls back to the deterministic copilot with no provider configured, on any
 * error, or on an empty response — the caller always gets an answer and always
 * gets cited sources, since sources come from the record either way.
 */
export async function askCaseAssistant(
  summary: CaseCommandCenter,
  question: string,
): Promise<CaseAssistantAnswer> {
  const deterministic = answerCommandCenterCopilot(summary, question)

  if (detectDemandDraftIntent(question)) {
    return {
      answer: '',
      sources: summary.sources.slice(0, 3),
      source: 'deterministic',
      action: { type: 'draft_demand', guidance: question.trim() || null },
    }
  }

  if (!openai) {
    return { ...deterministic, source: 'deterministic' }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: LLM_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior personal-injury case manager. Always respond with valid JSON as specified. Never fabricate facts or figures.',
        },
        { role: 'user', content: buildPrompt(summary, question) },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) throw new Error('Empty response')

    const parsed = JSON.parse(responseText) as { answer?: unknown }
    const answer = typeof parsed.answer === 'string' ? parsed.answer.trim() : ''
    if (!answer) throw new Error('No answer in response')

    // Sources stay deterministic so a cited answer is always traceable to the record.
    return { answer, sources: summary.sources.slice(0, 4), source: 'ai' }
  } catch (error: any) {
    logger.warn('Case assistant answer failed; using deterministic copy', {
      assessmentId: summary.assessmentId,
      error: error?.message,
    })
    return { ...deterministic, source: 'deterministic' }
  }
}
