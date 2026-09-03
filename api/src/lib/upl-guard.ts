/**
 * The unauthorized-practice-of-law boundary, enforced on what a specialist
 * actually sends.
 *
 * Phase 1 put the boundary in *copy*: a line on the specialist login screen and
 * a disclaimer in the AI panel. That is training, not a control. A specialist is
 * a non-lawyer, and the failure mode is not someone deciding to give legal
 * advice — it is someone under time pressure being helpful, sliding from "can
 * you find the claim number" to "honestly, you've got a strong case here, I
 * wouldn't take their first offer". By the time that is sent it is done.
 *
 * So the check runs server-side, on the free text, before it leaves. It is the
 * only claimant-facing surface where a specialist composes prose: everything
 * else they can write is either an allowlisted typed fact value or an internal
 * note.
 *
 * ## Why this blocks rather than warns
 *
 * A warning that can be clicked through is a slower version of no control. The
 * flagged phrase is returned to the specialist so they can see exactly what to
 * rewrite, and every one of these has a compliant phrasing — "you have a strong
 * case" becomes "I'll flag this for the attorney to review".
 *
 * ## What this is not
 *
 * It is a keyword check, so it catches the phrasings people actually reach for
 * and misses paraphrase. It reduces a large surface to a smaller one; it does
 * not make UPL impossible, and it is not a substitute for supervision or for
 * the audit trail. Anything a specialist writes is still attributable to them.
 */

export type UplCategory =
  | 'case_merit'
  | 'valuation'
  | 'legal_recommendation'
  | 'attorney_relationship'
  | 'liability_opinion'
  | 'settlement_advice'

export type UplViolation = {
  category: UplCategory
  /** The text that matched, so the specialist can find it. */
  matched: string
  /** What to say instead. Every one of these has a compliant alternative. */
  guidance: string
}

type Rule = {
  category: UplCategory
  pattern: RegExp
  guidance: string
}

const REFER_TO_ATTORNEY = 'Only an attorney can answer that. Say you will flag the question for the attorney assigned to the case.'

/** Adjectives that grade a claim rather than describe it. */
const MERIT_ADJECTIVE = '(?:strong|solid|great|good|weak|bad|poor|slam[- ]dunk|losing|winning|valid|legitimate|airtight)'
/** Optional hedges and intensifiers people put in front of them. */
const INTENSIFIER =
  '(?:(?:really|pretty|very|quite|fairly|definitely|probably|certainly|clearly|absolutely|extremely|super)\\s+)?'

const RULES: Rule[] = [
  // Assessing whether the claim is any good.
  {
    category: 'case_merit',
    pattern: new RegExp(
      // "you have a strong case", "this is a pretty weak claim",
      // "your case is solid", "that's a good claim"
      `\\b(?:you|your\\s+case|your\\s+claim|this|that|it|these)\\b(?:'s|s)?\\s+` +
        `(?:probably\\s+|definitely\\s+|likely\\s+|certainly\\s+|honestly\\s+)?` +
        `(?:do|does|is|are|was|were|will|would|should|have|has|seems?|looks?)?\\s*` +
        `(?:n[o']?t\\s+)?(?:be\\s+|have\\s+|like\\s+)?(?:a\\s+|an\\s+)?` +
        INTENSIFIER +
        `${MERIT_ADJECTIVE}\\s+(?:case|claim|argument|shot|chance|lawsuit)\\b`,
      'i',
    ),
    guidance: REFER_TO_ATTORNEY,
  },
  {
    category: 'case_merit',
    pattern: /\byou\s+(?:will|would|should|can|could|might|are going to|'?ll)\s+(?:definitely\s+|probably\s+|likely\s+|easily\s+)?win\b/i,
    guidance: REFER_TO_ATTORNEY,
  },
  {
    category: 'case_merit',
    pattern: new RegExp(
      `\\b(?:you|your\\s+case|your\\s+claim)\\s+(?:has|have|'?ve\\s+got)\\s+(?:a\\s+)?${MERIT_ADJECTIVE}\\s+(?:chance|likelihood|odds)\\b`,
      'i',
    ),
    guidance: REFER_TO_ATTORNEY,
  },

  // Putting a number on the case.
  //
  // These require an actual figure or an estimate word. "The attorney will
  // discuss what your case may be worth" is the compliant phrasing this module
  // tells specialists to use, and an earlier version of this rule blocked it —
  // a guard that forbids its own recommended alternative just teaches people to
  // route around the guard.
  {
    category: 'valuation',
    pattern:
      /\bworth\s+(?:somewhere\s+)?(?:around|about|roughly|approximately|at least|up to|north of|in the (?:range|neighborhood|ballpark))?\s*(?:\$|\d)/i,
    guidance:
      'Case value is an attorney judgment. You can confirm documented amounts already on file, such as billed medical charges, without estimating what the case is worth.',
  },
  {
    category: 'valuation',
    pattern: /\b(?:you|you'?ll|you will|you should|you can)\s+(?:can\s+)?(?:expect|get|receive|recover|walk away with)\s+(?:around|about|roughly|approximately|at least|up to)?\s*\$?\d/i,
    guidance:
      'Do not predict a recovery amount. Say the attorney will discuss what the case may be worth.',
  },
  {
    category: 'valuation',
    pattern: /\b(?:settle|settling|settlement)\s+(?:for|at)\s+(?:around|about|roughly|approximately|at least)?\s*\$?\d/i,
    guidance:
      'Do not suggest a settlement figure. Say the attorney will discuss settlement.',
  },

  // Telling the claimant what to do.
  {
    category: 'legal_recommendation',
    pattern: /\b(?:my|our)\s+(?:legal\s+)?advice\b|\bI(?:'m| am)\s+advising you\b|\blegally speaking,?\s+you\b/i,
    guidance:
      'Do not frame anything as advice. You gather information and pass questions to the attorney.',
  },
  {
    category: 'legal_recommendation',
    pattern:
      /\byou\s+(?:should|need to|have to|must|ought to)\s+(?:definitely\s+)?(sue|file (?:a\s+)?(?:suit|lawsuit|claim)|take (?:them|him|her) to court|counter-?sue|refuse|reject|sign|not sign|decline)\b/i,
    guidance: REFER_TO_ATTORNEY,
  },
  {
    category: 'legal_recommendation',
    pattern: /\b(?:don'?t|do not|never)\s+(?:talk|speak|give a statement|say anything)\s+to\s+(?:the\s+)?(?:adjuster|insurance|insurer|other side|defense)\b/i,
    guidance:
      'Whether to speak with an insurer is a legal decision. Refer the question to the attorney.',
  },
  {
    category: 'legal_recommendation',
    pattern: /\byou\s+(?:are|'re)\s+(?:legally\s+)?(?:entitled|required|obligated)\s+to\b/i,
    guidance: REFER_TO_ATTORNEY,
  },

  // Implying a lawyer-client relationship the specialist does not have.
  {
    category: 'attorney_relationship',
    pattern: /\b(?:as|I'?m|I am)\s+your\s+(?:attorney|lawyer|legal\s+(?:representative|counsel|advisor))\b/i,
    guidance:
      'You are a case specialist, not an attorney, and saying otherwise is the clearest form of the violation. Identify your role plainly.',
  },
  {
    category: 'attorney_relationship',
    pattern: /\b(?:attorney[-\s]client|lawyer[-\s]client)\s+(?:privilege|relationship)\b/i,
    guidance:
      'Do not characterize privilege or the existence of a relationship. The attorney addresses that.',
  },

  // Deciding who was at fault.
  {
    category: 'liability_opinion',
    pattern:
      /\b(?:they|he|she|the\s+(?:\w+\s+){0,2}?(?:driver|defendant|party|employer|company|store|hospital|doctor|landlord|manufacturer))\s+(?:is|was|are|were)\s+(?:clearly\s+|obviously\s+|definitely\s+|certainly\s+|100%\s+|entirely\s+|fully\s+)?(?:at fault|liable|negligent|responsible)\b/i,
    guidance:
      'Fault is a legal conclusion. Record what the claimant says happened without endorsing it.',
  },
  {
    category: 'liability_opinion',
    pattern: /\b(?:it|this|that|none of (?:it|this))\s+(?:was|is|were)\s+(?:not\s+|in no way\s+)?(?:your|their|his|her)\s+fault\b/i,
    guidance:
      'Fault is a legal conclusion. Record what the claimant says happened without endorsing it.',
  },

  // Advising on an offer in hand.
  {
    category: 'settlement_advice',
    pattern:
      /\b(?:accept|take|reject|turn down|hold out for|don'?t accept|do not accept)\s+(?:the|their|this|that)\s+(?:first\s+|initial\s+|current\s+|low\s+)?(?:offer|settlement)\b/i,
    guidance: REFER_TO_ATTORNEY,
  },
  {
    category: 'settlement_advice',
    pattern: /\b(?:that|their|this)\s+offer\s+is\s+(?:too\s+)?(?:low|high|fair|unfair|reasonable|insulting)\b/i,
    guidance: REFER_TO_ATTORNEY,
  },
]

/**
 * Phrases that make what follows the claimant's account rather than the
 * specialist's opinion.
 *
 * This is the one distinction the guard has to preserve to be usable at all.
 * Writing down what someone told you is the specialist's entire job; agreeing
 * with its legal conclusion is the violation. "The employer was responsible" is
 * an opinion. "You mentioned the employer was responsible" is a record.
 *
 * Also covers refusals — "I can't advise whether they were at fault" restates
 * the forbidden thing in order to decline it.
 */
const ATTRIBUTION =
  /(?:you\s+(?:said|told\s+me|mentioned|reported|indicated|believe|felt|think|described|noted)|according\s+to\s+you|you'?re\s+saying|I\s+(?:noted|recorded|wrote\s+down|have\s+it\s+down)\s+(?:that\s+)?|per\s+your|in\s+your\s+(?:words|account)|(?:can'?t|cannot|not\s+able\s+to|unable\s+to)\s+(?:say|advise|tell\s+you|comment)|(?:I'?m|I\s+am)\s+not\s+(?:able|allowed|permitted)|the\s+attorney\s+will|(?:ask|flag|raise)\s+(?:it\s+|this\s+|that\s+)?(?:with|for)\s+the\s+attorney)[^.!?]{0,80}$/i

/**
 * How far back to look for an attribution phrase.
 *
 * Bounded to the current sentence: attribution does not carry across a full
 * stop. "You said you were fine. They were clearly at fault." is an opinion in
 * the second sentence, whatever the first one attributed.
 */
function isAttributed(text: string, matchIndex: number): boolean {
  const sentenceStart = Math.max(
    text.lastIndexOf('.', matchIndex - 1),
    text.lastIndexOf('!', matchIndex - 1),
    text.lastIndexOf('?', matchIndex - 1),
    text.lastIndexOf('\n', matchIndex - 1),
  )
  const preceding = text.slice(sentenceStart + 1, matchIndex)
  return ATTRIBUTION.test(preceding)
}

export type UplCheck =
  | { ok: true }
  | { ok: false; violations: UplViolation[] }

/**
 * Check specialist-composed text bound for a claimant.
 *
 * Deduplicated by category: three phrasings of the same overreach is one thing
 * to fix, and a list of near-identical complaints reads as noise the specialist
 * learns to dismiss.
 */
export function checkUplBoundary(...texts: (string | null | undefined)[]): UplCheck {
  const subject = texts.filter(Boolean).join('\n\n')
  if (!subject.trim()) return { ok: true }

  const found = new Map<UplCategory, UplViolation>()
  for (const rule of RULES) {
    if (found.has(rule.category)) continue

    // Scan every occurrence, not just the first: an attributed mention early on
    // must not mask an unattributed opinion later in the same message.
    const scanner = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`)
    let match: RegExpExecArray | null
    while ((match = scanner.exec(subject)) !== null) {
      if (match[0].length === 0) break
      if (isAttributed(subject, match.index)) continue
      found.set(rule.category, {
        category: rule.category,
        matched: match[0].trim(),
        guidance: rule.guidance,
      })
      break
    }
  }

  if (found.size === 0) return { ok: true }
  return { ok: false, violations: [...found.values()] }
}

/** One-line summary for logs and audit records. */
export function describeUplViolations(violations: UplViolation[]): string {
  return violations.map((v) => `${v.category}: "${v.matched}"`).join('; ')
}
