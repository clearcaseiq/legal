/**
 * Public AI Help Assistant chat endpoint.
 *
 * Powers the in-app support chatbot. It answers questions about how the
 * ClearCaseIQ platform works, grounded in the Help Center knowledge base, and
 * steers legal/case-specific questions to a real attorney or the human support
 * team. No auth required so prospective users can ask before signing up.
 *
 * Guardrails:
 * - Clearly an AI assistant (never impersonates a person or an attorney).
 * - Never gives legal advice or case-specific predictions.
 * - Grounded only in the KB below; won't invent policies or numbers.
 * - Degrades gracefully to a canned answer + "contact support" when no LLM is
 *   configured, so the widget always does something useful.
 */

import { Router } from 'express'
import { z } from 'zod'
import { logger } from '../lib/logger'
import { getLlmChatClient, LLM_CHAT_MODEL, llmChatDisabled } from '../lib/llm-client'

const router = Router()

const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .min(1)
    .max(20),
  // UI language of the visitor; the assistant answers in this language.
  language: z.enum(['en', 'es', 'zh']).optional().default('en'),
})

const LANGUAGE_NAMES: Record<'en' | 'es' | 'zh', string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Simplified Chinese',
}

// Curated knowledge base — kept in sync with the Help Center. The assistant is
// told to answer ONLY from this, so it can't drift into inventing policy.
const KNOWLEDGE_BASE = `
ABOUT CLEARCASEIQ
- ClearCaseIQ is a legal technology platform (a corporation, NOT a law firm) that helps people injured in accidents understand whether they may have a personal injury case before speaking with an attorney. It does not provide legal advice and using it does not create an attorney-client relationship.
- The free case assessment takes just a few minutes. You answer a few questions about your accident and injuries.
- After the assessment you see "Case Readiness" (a qualitative signal of how developed your case is), an estimated case value range, and typical timelines. These are informational only and are not guarantees or predictions of success.

ACCOUNTS
- You can start the assessment without an account. Creating an account lets you save progress, upload evidence, and track your case.
- Login help: users log in at the plaintiff login; attorneys and firm staff use the attorney/firm login. If you can't log in, use "forgot password" or submit a support request.

EVIDENCE / DOCUMENTS
- Recommended documents: medical bills, injury photos, police reports, and wage-loss documentation. More documentation improves the assessment.
- Supported files: images (JPG, PNG), PDFs, and common document formats. You can upload from a computer or take photos on your phone.
- Uploaded photos/PDFs are automatically checked for relevance (e.g. a photo that isn't of damage or injuries may be flagged).

ATTORNEY MATCHING
- ClearCaseIQ matches your case with attorneys who handle your injury type and practice in your area. Your case is only sent to attorneys AFTER you approve submission — nothing is shared automatically.
- Cases are sent to participating firms one at a time in the order you set, so each can decide whether to offer representation. Medical records are shared only if you signed a HIPAA authorization.
- You never pay ClearCaseIQ. Participating firms have commercial agreements with ClearCaseIQ for technology and marketing services.

PRIVACY & SECURITY
- Data is encrypted and stored securely. Only you can see your case until you authorize sending it to selected firms.
- Privacy requests can be submitted via the support request form or emailed to legal@clearcaseiq.com.

CASE VALUE ESTIMATES
- Estimates are based on patterns from similar injury cases (injury type, treatment, documentation). They are not guarantees. Adding evidence and records can change the range.

SUPPORT
- For platform help or to report a problem, submit a support request in the Help Center (it creates a ticket the team triages, usually within one business day) or email support@clearcaseiq.com.
- The assistant should suggest submitting a support request for: login/account problems, technical bugs, privacy requests, or anything it can't answer from this knowledge base.
`.trim()

const SYSTEM_PROMPT = `You are the ClearCaseIQ Assistant, an AI help assistant on the ClearCaseIQ website. You are NOT a lawyer and NOT a human employee — if asked, say you're an AI assistant.

Your job: help visitors understand how the ClearCaseIQ platform works, using ONLY the knowledge base below. Be warm, concise (2-4 sentences unless a list is clearer), and plain-spoken.

Hard rules:
- Do NOT give legal advice, legal opinions, or predictions about whether someone will win, how much a specific case is worth, or what they should do legally. For those, tell them ClearCaseIQ isn't a law firm and can't give legal advice, and that an attorney they choose can advise on their specific situation. Say "an attorney you choose", never "your matched attorney" — this widget answers anonymous visitors who have no attorney, and the Terms describe the claimant selecting the firm rather than us assigning one.
- Do NOT invent policies, prices, timelines, features, or numbers that aren't in the knowledge base. If you don't know, say so and point them to a support request.
- Never claim to be a person or an attorney. Never promise outcomes.
- For account/login trouble, technical bugs, or privacy requests, guide them to submit a support request in the Help Center (or email support@clearcaseiq.com) — and mention it creates a ticket the team triages, usually within one business day.
- Keep it friendly and free of legal jargon.

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}`

const FALLBACK_REPLIES: Record<'en' | 'es' | 'zh', string> = {
  en: "I can help with questions about how ClearCaseIQ works, like the free case assessment, uploading evidence, attorney matching, privacy, and case value estimates. I'm not able to give legal advice; an attorney you choose can help with your specific situation. If you have an account or technical issue, the best next step is to submit a support request in the Help Center and our team will follow up, usually within one business day.",
  es: 'Puedo ayudarle con preguntas sobre cómo funciona ClearCaseIQ: la evaluación gratuita del caso, la carga de evidencia, la conexión con abogados, la privacidad y las estimaciones del valor del caso. No puedo dar asesoría legal; un abogado que usted elija puede ayudarle con su situación específica. Si tiene un problema técnico o de cuenta, el mejor siguiente paso es enviar una solicitud de soporte en el Centro de Ayuda y nuestro equipo le responderá, normalmente dentro de un día hábil.',
  zh: '我可以回答关于 ClearCaseIQ 平台的问题，例如免费案件评估、上传证据、律师匹配、隐私以及案件价值估算。我无法提供法律建议；您选择的律师可以就您的具体情况提供帮助。如果您遇到账户或技术问题，最好的下一步是在帮助中心提交支持请求，我们的团队通常会在一个工作日内跟进。',
}

router.post('/', async (req, res) => {
  const parsed = ChatSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }
  const { messages, language } = parsed.data
  const fallbackReply = FALLBACK_REPLIES[language]

  // No provider configured -> still be useful.
  if (llmChatDisabled()) {
    return res.status(200).json({ reply: fallbackReply, escalate: true, degraded: true })
  }

  const client = getLlmChatClient()
  if (!client) {
    return res.status(200).json({ reply: fallbackReply, escalate: true, degraded: true })
  }

  const languageInstruction = `\n\nRespond in ${LANGUAGE_NAMES[language]}. If the user writes in a different language, respond in the language the user writes in.`

  try {
    const completion = await client.chat.completions.create({
      model: LLM_CHAT_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT + languageInstruction }, ...messages],
      temperature: 0.3,
      max_tokens: 500,
    })
    const reply = completion.choices[0]?.message?.content?.trim()
    if (!reply) {
      return res.status(200).json({ reply: fallbackReply, escalate: true })
    }
    // Nudge escalation when the model signals it can't help from the KB.
    // Matches English plus the Spanish/Chinese phrasings the prompt steers toward.
    const escalate = /support request|can'?t help|cannot help|not able to|contact (our )?support|solicitud de soporte|equipo de soporte|支持请求|支持团队/i.test(reply)
    return res.status(200).json({ reply, escalate })
  } catch (err) {
    logger.warn('Support chat completion failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return res.status(200).json({ reply: fallbackReply, escalate: true, degraded: true })
  }
})

export default router
