/**
 * The canonical case record — the authoritative shape external systems read
 * and sync FROM. Stable field names (snake_case) form a public contract, so
 * add fields rather than renaming. `revision` + `etag` let consumers cache and
 * detect change cheaply (the etag is derived from the revision, which bumps on
 * every material write via recordCaseChange).
 */
import { prisma } from './prisma'

export type CanonicalCase = {
  assessment_id: string
  reference_code: string | null
  revision: number
  last_write_source: string | null
  status: string
  claim_type: string
  case_name: string | null
  venue: { state: string; county: string | null }
  plaintiff: { first_name: string; last_name: string; email: string | null; phone: string | null } | null
  law_firm_id: string | null
  assigned_attorney_id: string | null
  evidence_count: number
  created_at: string
  updated_at: string
}

/** Strong ETag keyed on the monotonic revision — changes iff the case changes. */
export function caseEtag(assessmentId: string, revision: number): string {
  return `"${assessmentId}:${revision}"`
}

export async function buildCanonicalCase(assessmentId: string): Promise<CanonicalCase | null> {
  const a = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      referenceCode: true,
      revision: true,
      lastWriteSource: true,
      status: true,
      claimType: true,
      caseName: true,
      venueState: true,
      venueCounty: true,
      lawFirmId: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      leadSubmission: { select: { assignedAttorneyId: true } },
      _count: { select: { evidenceFiles: true } },
    },
  })
  if (!a) return null

  return {
    assessment_id: a.id,
    reference_code: a.referenceCode,
    revision: a.revision,
    last_write_source: a.lastWriteSource,
    status: a.status,
    claim_type: a.claimType,
    case_name: a.caseName,
    venue: { state: a.venueState, county: a.venueCounty },
    plaintiff: a.user
      ? {
          first_name: a.user.firstName,
          last_name: a.user.lastName,
          email: a.user.email ?? null,
          phone: a.user.phone ?? null,
        }
      : null,
    law_firm_id: a.lawFirmId,
    assigned_attorney_id: a.leadSubmission?.assignedAttorneyId ?? null,
    evidence_count: a._count.evidenceFiles,
    created_at: a.createdAt.toISOString(),
    updated_at: a.updatedAt.toISOString(),
  }
}

/** Resolve an assessment id from a canonical reference (id or CCIQ code). */
export async function resolveAssessmentIdByReference(reference: string): Promise<string | null> {
  const trimmed = (reference || '').trim()
  if (!trimmed) return null
  const byRef = await prisma.assessment.findFirst({
    where: { OR: [{ id: trimmed }, { referenceCode: trimmed.toUpperCase() }] },
    select: { id: true },
  })
  return byRef?.id ?? null
}
