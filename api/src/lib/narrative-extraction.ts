/**
 * Negation- and synonym-aware narrative signal extraction.
 *
 * This replaces brittle `narrative.includes('keyword')` scans used by the severity
 * and liability scorers. It is deterministic (no ML/network) and preserves
 * explainability: every positive signal carries the exact sentence span it came from,
 * and clinically-negated mentions (e.g. "no loss of consciousness", "denies numbness")
 * no longer count as positive signals.
 */

export interface PhraseMatch {
  /** The phrase that was searched for. */
  phrase: string
  /** The sentence the phrase was found in (the explainability source span). */
  span: string
  /** Whether this occurrence was negated in its sentence. */
  negated: boolean
}

export interface NarrativeMatcher {
  /** Original (lowercased) narrative text. */
  text: string
  /**
   * Negation-aware presence test. Returns true only when the phrase appears at least
   * once *without* a negation cue in front of it in the same sentence. A drop-in,
   * stricter replacement for `narrative.includes(phrase)`.
   */
  includes: (phrase: string) => boolean
  /** True if ANY of the phrases is present (negation-aware). */
  includesAny: (phrases: string[]) => boolean
  /** Source-span sentences for a phrase's non-negated occurrences (for explainability). */
  spansFor: (phrase: string) => string[]
  /** All non-negated phrase matches recorded during scoring (for explainability). */
  matchedSpans: () => PhraseMatch[]
}

// Cues that flip the meaning of a following clinical/fault phrase. Conservative on
// purpose: only a short window immediately before the phrase is inspected.
const NEGATION_CUES = [
  'no ', 'not ', 'without ', 'denies ', 'denied ', 'deny ', 'negative for ',
  'ruled out', "n't ", 'never ', 'no evidence of ', 'absent ', 'free of ',
  'unremarkable for ', 'no signs of ', 'no sign of ',
]

// How many characters before a phrase we scan for a negation cue (same sentence only).
const NEGATION_WINDOW = 28

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean)
}

function isNegatedAt(sentence: string, phraseIdx: number): boolean {
  const windowStart = Math.max(0, phraseIdx - NEGATION_WINDOW)
  const before = sentence.slice(windowStart, phraseIdx)
  return NEGATION_CUES.some((cue) => before.includes(cue))
}

/**
 * Build a matcher over a narrative. Synonyms can be supplied so callers treat a set
 * of surface forms as one canonical signal; by default a phrase matches only itself.
 */
export function makeNarrativeMatcher(
  narrative: string | undefined | null,
  synonyms: Record<string, string[]> = {},
): NarrativeMatcher {
  const text = (narrative || '').toLowerCase()
  const sentences = splitSentences(text)
  const recorded: PhraseMatch[] = []

  function evaluate(phrase: string): { present: boolean; spans: string[] } {
    const needle = phrase.toLowerCase()
    const forms = [needle, ...(synonyms[needle] || []).map((s) => s.toLowerCase())]
    const spans: string[] = []
    let present = false
    for (const sentence of sentences) {
      for (const form of forms) {
        if (!form) continue
        let from = 0
        let idx = sentence.indexOf(form, from)
        while (idx !== -1) {
          if (!isNegatedAt(sentence, idx)) {
            present = true
            const span = sentence.trim()
            if (!spans.includes(span)) spans.push(span)
            recorded.push({ phrase: needle, span, negated: false })
          } else {
            recorded.push({ phrase: needle, span: sentence.trim(), negated: true })
          }
          from = idx + form.length
          idx = sentence.indexOf(form, from)
        }
      }
    }
    return { present, spans }
  }

  return {
    text,
    includes: (phrase: string) => evaluate(phrase).present,
    includesAny: (phrases: string[]) => phrases.some((p) => evaluate(p).present),
    spansFor: (phrase: string) => evaluate(phrase).spans,
    matchedSpans: () => recorded.filter((m) => !m.negated),
  }
}
