/**
 * When an attorney records an answer to a liability Intelligent Question,
 * fold clear signals into the structured LiabilityRecord (and through to
 * facts.liability) so Overview AI Case Summary / underwriting liability can rise.
 */
import { logger } from './logger'
import { upsertLiabilityRecord } from './liability-record'

function questionIdOf(questionKey: string): string {
  return questionKey.startsWith('base:') ? questionKey.slice('base:'.length) : questionKey
}

/** Loose yes/no detector for short consultation answers. */
export function parseAffirmative(answer: string): boolean | null {
  const t = String(answer || '').trim().toLowerCase()
  if (!t) return null
  if (/^(yes|y|yeah|yep|yea|true|affirmative|absolutely|definitely)\b/.test(t)) return true
  if (/^(no|n|nope|nah|false|negative|never)\b/.test(t)) return false
  if (/\b(did not|didn't|does not|doesn't|was not|wasn't|no one|nobody)\b/.test(t)) return false
  if (/\b(admitted|apologized|apology|said (it was|they were) (their|his|her) fault)\b/.test(t)) return true
  return null
}

/** True when the answer asserts the other/defendant party is at fault. */
export function assertsDefendantAtFault(answer: string): boolean {
  const t = String(answer || '').trim().toLowerCase()
  if (!t) return false
  // Require an explicit other-party referent — bare "at fault" is ambiguous
  // (attorneys often write it when the *plaintiff* was ticketed as at-fault).
  if (/\b(their fault|other driver('s)? fault|defendant('s)? fault)\b/.test(t)) return true
  if (/\b(other driver|defendant|they|them|at[-\s]?fault driver)\b.{0,24}\b(at fault|faulty|liable|cited|ticket)\b/.test(t)) {
    return true
  }
  if (/\b(cited|ticketed|ticket)\b.{0,24}\b(other driver|defendant|them|they)\b/.test(t)) return true
  return false
}

/** True when the answer says the plaintiff/client received the citation. */
export function assertsPlaintiffCited(answer: string): boolean {
  const t = String(answer || '').trim().toLowerCase()
  if (!t) return false
  if (/\b(i|me|my|plaintiff|client|my client)\b.{0,24}\b(cited|ticket|ticketed)\b/.test(t)) return true
  if (/\b(cited|ticket|ticketed)\b.{0,24}\b(me|plaintiff|client|my client)\b/.test(t)) return true
  if (/\b(i (got|received)|got a|received a)\b.{0,16}\b(ticket|citation)\b/.test(t)) return true
  if (/\bplaintiff\b.{0,16}\b(at[-\s]?fault|cited|ticket)\b/.test(t)) return true
  return false
}

function citationTarget(answer: string): 'defendant' | 'plaintiff' | 'both' | null {
  const t = answer.toLowerCase()
  const plaintiffHit = assertsPlaintiffCited(t) || /\b(me|i\b|plaintiff|client|my client)\b/.test(t)
  const defendantHit =
    assertsDefendantAtFault(t) ||
    /\b(them|they|other driver|defendant|insured)\b/.test(t)
  if (plaintiffHit && defendantHit) return 'both'
  if (plaintiffHit) return 'plaintiff'
  if (defendantHit) return 'defendant'
  // Bare "yes" / "at fault" without who — do not guess; attorney must name the party.
  return null
}

/**
 * Map a saved (or cleared) question answer onto liability fields.
 * Returns null when the question is not a liability signal we understand.
 */
export function liabilityPatchFromQuestionAnswer(
  questionKey: string,
  answer: string | null | undefined,
): Record<string, any> | null {
  const id = questionIdOf(questionKey)
  const text = String(answer || '').trim()
  const cleared = !text

  switch (id) {
    case 'auto_liab_fault': {
      // "Did the other driver admit fault / apologize?" — Yes is a strong admission.
      // No only means there was no on-scene apology; it is NOT "liability disputed".
      if (cleared) return null
      const yes = parseAffirmative(text)
      if (yes === true || assertsDefendantAtFault(text) || /\b(admit|apolog|sorry|their fault)\b/i.test(text)) {
        return { faultPosture: 'admitted', defendantFaultPct: 100, comparativeNegPct: 0 }
      }
      if (yes === false) return null
      return null
    }
    case 'auto_liab_cited': {
      if (cleared) return { citationIssuedTo: 'none' }
      if (parseAffirmative(text) === false) return { citationIssuedTo: 'none' }
      const target = citationTarget(text)
      if (!target) return null
      const patch: Record<string, any> = { citationIssuedTo: target }
      if (target === 'defendant') {
        // Defendant ticket = strong liability for the plaintiff.
        patch.faultPosture = 'clear'
        patch.defendantFaultPct = 100
        patch.comparativeNegPct = 0
      } else if (target === 'plaintiff') {
        // Plaintiff ticket hurts liability. Use disputed posture + citation target;
        // avoid also stacking a large comparativeNegPct (underwriting already
        // subtracts that percent-for-percent and would crush the score to ~0).
        patch.faultPosture = 'disputed'
        patch.defendantFaultPct = 50
        patch.comparativeNegPct = 0
      } else if (target === 'both') {
        patch.faultPosture = 'shared'
        patch.defendantFaultPct = 50
        patch.comparativeNegPct = 0
      }
      return patch
    }
    case 'auto_liab_passengers': {
      if (cleared) return { hasWitnesses: false, witnessCount: 0 }
      const yes = parseAffirmative(text)
      if (yes === true) return { hasWitnesses: true, witnessCount: Math.max(1, Number((text.match(/\d+/) || [])[0]) || 1) }
      if (yes === false) return { hasWitnesses: false, witnessCount: 0 }
      if (/\b(witness|passenger|bystander)\b/i.test(text)) return { hasWitnesses: true, witnessCount: 1 }
      return null
    }
    case 'def_fault': {
      if (cleared) return { faultTheory: null }
      const patch: Record<string, any> = { faultTheory: text }
      const lower = text.toLowerCase()
      if (/\b(other driver|they were|defendant|at[-\s]?fault driver|hit me|ran (the )?(red|stop))\b/.test(lower)) {
        patch.faultPosture = 'clear'
        patch.defendantFaultPct = 100
      } else if (/\b(shared|both|partly my fault|comparative)\b/.test(lower)) {
        patch.faultPosture = 'shared'
        patch.defendantFaultPct = 50
        patch.comparativeNegPct = 50
      } else if (/\b(i was|my fault|i caused)\b/.test(lower)) {
        patch.faultPosture = 'denied'
        patch.defendantFaultPct = 0
        patch.comparativeNegPct = 100
      }
      return patch
    }
    default:
      return null
  }
}

export async function applyQuestionAnswerToLiability(
  assessmentId: string,
  questionKey: string,
  answer: string | null | undefined,
  opts?: { actorId?: string | null; actorName?: string | null },
): Promise<boolean> {
  const patch = liabilityPatchFromQuestionAnswer(questionKey, answer)
  if (!patch) return false
  try {
    await upsertLiabilityRecord(assessmentId, patch, {
      source: 'system',
      actorId: opts?.actorId ?? null,
      actorName: opts?.actorName ?? null,
    })
    logger.info('Applied question answer to liability record', {
      assessmentId,
      questionKey,
      patchKeys: Object.keys(patch),
    })
    return true
  } catch (error: any) {
    logger.warn('Failed to apply question answer to liability', {
      assessmentId,
      questionKey,
      error: error?.message,
    })
    return false
  }
}

const LIABILITY_QUESTION_IDS = new Set(['auto_liab_fault', 'auto_liab_cited', 'auto_liab_passengers', 'def_fault'])

/** Re-apply saved liability answers (e.g. before Overview underwriting). */
export async function syncLiabilityFromSavedQuestionAnswers(assessmentId: string): Promise<number> {
  const { prisma } = await import('./prisma')
  const rows = await prisma.caseQuestionAnswer
    .findMany({
      where: { assessmentId },
      select: { questionKey: true, answer: true },
    })
    .catch(() => [] as Array<{ questionKey: string; answer: string }>)

  // Merge into ONE upsert. Concurrent per-answer upserts were racing and could
  // leave a stale "defendant clear / 100%" posture on top of a plaintiff citation.
  const rank = (key: string) => {
    const id = questionIdOf(key)
    if (id === 'auto_liab_fault' || id === 'def_fault') return 0
    if (id === 'auto_liab_cited') return 1
    return 2
  }
  const ordered = [...rows].sort((a, b) => rank(a.questionKey) - rank(b.questionKey))

  const merged: Record<string, any> = {}
  let applied = 0
  for (const row of ordered) {
    const id = questionIdOf(row.questionKey)
    if (!LIABILITY_QUESTION_IDS.has(id)) continue
    const patch = liabilityPatchFromQuestionAnswer(row.questionKey, row.answer)
    if (!patch) continue
    Object.assign(merged, patch)
    applied += 1
  }
  if (applied === 0) return 0

  try {
    await upsertLiabilityRecord(assessmentId, merged, { source: 'system' })
    logger.info('Synced liability from question answers', {
      assessmentId,
      applied,
      patchKeys: Object.keys(merged),
      faultPosture: merged.faultPosture,
      citationIssuedTo: merged.citationIssuedTo,
    })
  } catch (error: any) {
    logger.warn('Failed to sync liability from question answers', {
      assessmentId,
      error: error?.message,
    })
    return 0
  }
  return applied
}
