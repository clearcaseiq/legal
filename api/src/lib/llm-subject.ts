import { prisma } from './prisma'
import type { LlmSubject } from './llm-deidentify'

function parseFacts(raw: unknown): any {
  if (raw && typeof raw === 'object') return raw
  if (typeof raw !== 'string' || !raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * The identifiers we know for a case — the claimant's name and the places tied
 * to them — so de-identification catches them even where free text gives no
 * cue like "Patient:". Never throws; an unknown case yields an empty subject.
 */
export async function loadLlmSubject(assessmentId: string | null | undefined): Promise<LlmSubject> {
  if (!assessmentId) return {}
  try {
    const a = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        venueCounty: true,
        facts: true,
        user: { select: { firstName: true, lastName: true, city: true } },
      },
    })
    if (!a) return {}
    const facts = parseFacts(a.facts)
    const pc = facts?.plaintiffContext || {}
    const fullName = (first?: string | null, last?: string | null) => [first, last].filter(Boolean).join(' ').trim()
    return {
      names: [fullName(a.user?.firstName, a.user?.lastName), fullName(pc.firstName, pc.lastName)].filter(Boolean),
      places: [facts?.incident?.location, a.venueCounty, a.user?.city, pc.city].filter(
        (p): p is string => typeof p === 'string' && p.trim().length > 0,
      ),
    }
  } catch {
    return {}
  }
}
