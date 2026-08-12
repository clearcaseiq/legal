/**
 * When an attorney records an answer to a medical Intelligent Question,
 * fold clear signals into assessment facts so Overview severity / underwriting
 * value can move (mirrors question-liability-sync for fault).
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { parseAffirmative } from './question-liability-sync'

function questionIdOf(questionKey: string): string {
  return questionKey.startsWith('base:') ? questionKey.slice('base:'.length) : questionKey
}

export type SurgeryStatus = 'recommended' | 'scheduled' | 'completed'

export interface MedicalFactsPatch {
  surgeryStatus?: SurgeryStatus | null
  symptoms?: string[]
  imagingOrdered?: boolean | null
  medicalNote?: string | null
}

/** Detect surgery timing language in a free-text answer. */
export function parseSurgeryStatus(answer: string): SurgeryStatus | null {
  const t = String(answer || '').toLowerCase()
  if (!t || !/\bsurgery\b|\bsurgical\b|\boperation\b|\boperate\b/.test(t)) return null
  if (/\b(had|underwent|completed|performed|done|post[-\s]?op)\b/.test(t)) return 'completed'
  if (
    /\b(next week|tomorrow|scheduled|going (in|to get)|will (get|have)|upcoming|booked)\b/.test(t) ||
    /\bneed (to |ti )?get surgery\b/.test(t) ||
    /\bgetting surgery\b/.test(t)
  ) {
    return 'scheduled'
  }
  if (/\b(recommend|recommended|doctor (said|wants)|suggested|may need|might need)\b/.test(t)) {
    return 'recommended'
  }
  // Bare mention of needing surgery → treat as scheduled/planned care.
  if (/\b(need|needs|needing)\b.{0,20}\bsurgery\b/.test(t)) return 'scheduled'
  return 'recommended'
}

/** Neuro / radicular symptom tokens worth writing into facts for underwriting. */
export function parseNeuroSymptoms(answer: string): string[] {
  const t = String(answer || '').toLowerCase()
  if (!t) return []
  const out: string[] = []
  if (/\bnumb(ness|ing)?\b/.test(t)) out.push('numbness')
  if (/\btingl(e|ing)\b/.test(t)) out.push('tingling')
  if (/\bheadache?s?\b/.test(t)) out.push('severe headaches')
  if (/\bdizz(y|iness)\b/.test(t)) out.push('dizziness')
  if (/\bradiat(e|ing)\b/.test(t)) out.push('radiating pain')
  return out
}

/**
 * Map a saved (or cleared) medical question answer onto a facts patch.
 * Returns null when the question is not a medical signal we understand.
 */
export function medicalPatchFromQuestionAnswer(
  questionKey: string,
  answer: string | null | undefined,
): MedicalFactsPatch | null {
  const id = questionIdOf(questionKey)
  const text = String(answer || '').trim()
  const cleared = !text

  switch (id) {
    case 'auto_med_worse':
    case 'def_worse': {
      if (cleared) {
        return { surgeryStatus: null, symptoms: [], medicalNote: null }
      }
      const yes = parseAffirmative(text)
      // Explicit "No" always clears surgery/symptoms from this question — do not
      // keep a prior "Will have surgery" write-through when the attorney flips No.
      if (yes === false) {
        return { surgeryStatus: null, symptoms: [], medicalNote: null }
      }
      const surgeryStatus = parseSurgeryStatus(text)
      const symptoms = parseNeuroSymptoms(text)
      const patch: MedicalFactsPatch = {
        medicalNote: text,
        symptoms,
      }
      if (surgeryStatus) patch.surgeryStatus = surgeryStatus
      return patch
    }
    case 'auto_med_mri': {
      if (cleared) return { imagingOrdered: null }
      const yes = parseAffirmative(text)
      if (yes === true || /\b(mri|imaging|ordered|recommended|scheduled)\b/i.test(text)) {
        return { imagingOrdered: true, medicalNote: text }
      }
      if (yes === false) return { imagingOrdered: false }
      return null
    }
    default:
      return null
  }
}

const SURGERY_RANK: Record<string, number> = {
  completed: 3,
  scheduled: 2,
  recommended: 1,
}

function mergeSurgeryStatus(
  current: string | null | undefined,
  next: SurgeryStatus | null | undefined,
): SurgeryStatus | null {
  if (next === null) return null
  if (!next) return (current as SurgeryStatus) || null
  if (!current) return next
  return (SURGERY_RANK[next] || 0) >= (SURGERY_RANK[current] || 0) ? next : (current as SurgeryStatus)
}

/**
 * Apply one medical question answer onto assessment facts (treatment + symptoms).
 */
export async function applyQuestionAnswerToMedical(
  assessmentId: string,
  questionKey: string,
  answer: string | null | undefined,
): Promise<boolean> {
  const patch = medicalPatchFromQuestionAnswer(questionKey, answer)
  if (!patch) return false
  try {
    await writeMedicalPatchToFacts(assessmentId, patch)
    logger.info('Applied question answer to medical facts', {
      assessmentId,
      questionKey,
      patchKeys: Object.keys(patch),
    })
    return true
  } catch (error: any) {
    logger.warn('Failed to apply question answer to medical facts', {
      assessmentId,
      questionKey,
      error: error?.message,
    })
    return false
  }
}

const MEDICAL_QUESTION_IDS = new Set(['auto_med_worse', 'auto_med_mri', 'def_worse'])

/** Re-apply saved medical answers before Overview underwriting. */
export async function syncMedicalFromSavedQuestionAnswers(assessmentId: string): Promise<number> {
  const rows = await prisma.caseQuestionAnswer
    .findMany({
      where: { assessmentId },
      select: { questionKey: true, answer: true },
    })
    .catch(() => [] as Array<{ questionKey: string; answer: string }>)

  const merged: MedicalFactsPatch = { symptoms: [] }
  let applied = 0
  let clearedWorsening = false
  for (const row of rows) {
    const id = questionIdOf(row.questionKey)
    if (!MEDICAL_QUESTION_IDS.has(id)) continue
    const patch = medicalPatchFromQuestionAnswer(row.questionKey, row.answer)
    if (!patch) continue
    applied += 1
    if (patch.surgeryStatus !== undefined) {
      merged.surgeryStatus = mergeSurgeryStatus(merged.surgeryStatus, patch.surgeryStatus)
      if (patch.surgeryStatus === null && (id === 'auto_med_worse' || id === 'def_worse')) {
        clearedWorsening = true
      }
    }
    if (patch.imagingOrdered !== undefined) merged.imagingOrdered = patch.imagingOrdered
    if (patch.medicalNote) merged.medicalNote = patch.medicalNote
    if (patch.medicalNote === null && (id === 'auto_med_worse' || id === 'def_worse')) {
      merged.medicalNote = null
      clearedWorsening = true
    }
    if (patch.symptoms?.length) {
      const set = new Set([...(merged.symptoms || []), ...patch.symptoms])
      merged.symptoms = [...set]
    } else if (patch.symptoms && patch.symptoms.length === 0 && patch.surgeryStatus === null) {
      merged.symptoms = []
    }
  }
  if (applied === 0) return 0
  if (clearedWorsening && !merged.surgeryStatus) {
    merged.surgeryStatus = null
    merged.medicalNote = null
    merged.symptoms = merged.symptoms?.length ? merged.symptoms : []
  }

  try {
    await writeMedicalPatchToFacts(assessmentId, merged)
    logger.info('Synced medical facts from question answers', {
      assessmentId,
      applied,
      surgeryStatus: merged.surgeryStatus,
      symptoms: merged.symptoms,
    })
  } catch (error: any) {
    logger.warn('Failed to sync medical facts from question answers', {
      assessmentId,
      error: error?.message,
    })
    return 0
  }
  return applied
}

async function writeMedicalPatchToFacts(assessmentId: string, patch: MedicalFactsPatch): Promise<void> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { facts: true },
  })
  let facts: any = {}
  try {
    facts = assessment?.facts ? JSON.parse(assessment.facts as string) : {}
  } catch {
    facts = {}
  }

  const treatment = Array.isArray(facts.treatment) ? [...facts.treatment] : []
  const surgeryIdx = treatment.findIndex((item: any) => item?.type === 'surgery_status')

  if (patch.surgeryStatus === null) {
    if (surgeryIdx >= 0) treatment.splice(surgeryIdx, 1)
  } else if (patch.surgeryStatus) {
    const entry = {
      type: 'surgery_status',
      status: patch.surgeryStatus,
      source: 'intelligent_question',
      notes: patch.medicalNote || undefined,
    }
    if (surgeryIdx >= 0) {
      const prev = String(treatment[surgeryIdx]?.status || '')
      const keep = mergeSurgeryStatus(prev, patch.surgeryStatus)
      treatment[surgeryIdx] = { ...treatment[surgeryIdx], ...entry, status: keep }
    } else {
      treatment.push(entry)
    }
  }

  facts.treatment = treatment

  if (patch.symptoms) {
    const existing = Array.isArray(facts.symptoms) ? facts.symptoms.map(String) : []
    if (patch.symptoms.length === 0 && patch.surgeryStatus === null) {
      facts.symptoms = existing.filter((s: string) => !/headache|numbness|tingling|dizziness|radiating/i.test(s))
    } else {
      facts.symptoms = [...new Set([...existing, ...patch.symptoms])]
    }
  }

  if (patch.imagingOrdered === true) {
    facts.medical = {
      ...(facts.medical && typeof facts.medical === 'object' ? facts.medical : {}),
      imagingOrdered: true,
      imagingType: 'mri',
    }
  } else if (patch.imagingOrdered === false || patch.imagingOrdered === null) {
    if (facts.medical && typeof facts.medical === 'object') {
      const next = { ...facts.medical }
      if (patch.imagingOrdered === null) {
        delete next.imagingOrdered
        delete next.imagingType
      } else {
        next.imagingOrdered = false
      }
      facts.medical = next
    }
  }

  const marker = '[Intelligent Question — medical]'
  const narrative = String(facts?.incident?.narrative || '')
  const stripMedicalMarker = (text: string) =>
    text
      .replace(/\n*\s*\[Intelligent Question — medical\][\s\S]*?(?=\n\n\[|$)/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

  if (patch.medicalNote === null || patch.surgeryStatus === null) {
    // Cleared / "No" answer — remove the injected surgery note so underwriting
    // does not keep treating surgery as scheduled from stale narrative text.
    if (narrative.includes(marker)) {
      facts.incident = {
        ...(facts.incident && typeof facts.incident === 'object' ? facts.incident : {}),
        narrative: stripMedicalMarker(narrative) || null,
      }
    }
  } else if (patch.medicalNote) {
    const injection =
      patch.surgeryStatus === 'scheduled'
        ? `${marker} Surgery scheduled. ${patch.medicalNote}`
        : patch.surgeryStatus === 'completed'
          ? `${marker} Surgery completed. ${patch.medicalNote}`
          : patch.surgeryStatus === 'recommended'
            ? `${marker} Surgery recommended. ${patch.medicalNote}`
            : `${marker} ${patch.medicalNote}`
    if (!narrative.includes(marker)) {
      facts.incident = {
        ...(facts.incident && typeof facts.incident === 'object' ? facts.incident : {}),
        narrative: narrative ? `${narrative}\n\n${injection}` : injection,
      }
    } else {
      facts.incident = {
        ...(facts.incident && typeof facts.incident === 'object' ? facts.incident : {}),
        narrative: narrative.replace(
          /\[Intelligent Question — medical\][\s\S]*?(?=\n\n\[|$)/,
          injection,
        ),
      }
    }
  }

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { facts: JSON.stringify(facts) },
  })
}
