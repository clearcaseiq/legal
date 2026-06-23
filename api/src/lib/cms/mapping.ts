/**
 * Maps platform records (Assessment + plaintiff + evidence) into the neutral
 * Cms*Input shapes the connectors understand.
 */
import { prisma } from '../prisma'
import type { CmsContactInput, CmsDocumentInput, CmsMatterInput } from './types'

const PRACTICE_AREA_BY_CLAIM: Record<string, string> = {
  auto: 'Motor Vehicle Accident',
  motor_vehicle: 'Motor Vehicle Accident',
  slip_and_fall: 'Premises Liability',
  premises: 'Premises Liability',
  dog_bite: 'Dog Bite',
  medmal: 'Medical Malpractice',
  medical_malpractice: 'Medical Malpractice',
  product: 'Product Liability',
  product_liability: 'Product Liability',
  nursing_home_abuse: 'Nursing Home Abuse',
  wrongful_death: 'Wrongful Death',
  workplace: 'Workplace Injury',
}

export interface CaseForExport {
  assessment: {
    id: string
    claimType: string
    venueState: string
    venueCounty: string | null
    status: string
    facts: string
    createdAt: Date
    userId: string | null
    lawFirmId: string | null
  }
  plaintiff: { firstName: string; lastName: string; email: string | null; phone: string | null } | null
  evidence: {
    id: string
    originalName: string
    filename: string
    mimetype: string
    filePath: string
    category: string
    isHIPAA: boolean
  }[]
}

export async function loadCaseForExport(assessmentId: string): Promise<CaseForExport | null> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      evidenceFiles: {
        select: {
          id: true,
          originalName: true,
          filename: true,
          mimetype: true,
          filePath: true,
          category: true,
          isHIPAA: true,
        },
      },
    },
  })
  if (!assessment) return null

  return {
    assessment: {
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty,
      status: assessment.status,
      facts: assessment.facts,
      createdAt: assessment.createdAt,
      userId: assessment.userId,
      lawFirmId: assessment.lawFirmId,
    },
    plaintiff: assessment.user
      ? {
          firstName: assessment.user.firstName,
          lastName: assessment.user.lastName,
          email: assessment.user.email ?? null,
          phone: assessment.user.phone ?? null,
        }
      : null,
    evidence: assessment.evidenceFiles.map((e) => ({
      id: e.id,
      originalName: e.originalName,
      filename: e.filename,
      mimetype: e.mimetype,
      filePath: e.filePath,
      category: e.category,
      isHIPAA: e.isHIPAA,
    })),
  }
}

export function buildContactInput(c: CaseForExport): CmsContactInput {
  const p = c.plaintiff
  return {
    firstName: p?.firstName || 'Unknown',
    lastName: p?.lastName || 'Claimant',
    email: p?.email ?? null,
    phone: p?.phone ?? null,
    type: 'client',
  }
}

export function buildMatterInput(c: CaseForExport): CmsMatterInput {
  const a = c.assessment
  return {
    reference: a.id,
    description: `${practiceAreaFor(a.claimType)} — ${c.plaintiff ? `${c.plaintiff.firstName} ${c.plaintiff.lastName}` : 'Claimant'}`,
    practiceArea: practiceAreaFor(a.claimType),
    status: 'Open',
    openedAt: a.createdAt.toISOString(),
    customFields: {
      'ClearCaseIQ Assessment': a.id,
      Jurisdiction: [a.venueCounty, a.venueState].filter(Boolean).join(', '),
      'Claim Type': a.claimType,
      'Intake Summary': a.facts?.slice(0, 1000),
    },
  }
}

export function buildDocumentInputs(c: CaseForExport): (CmsDocumentInput & { evidenceId: string })[] {
  return c.evidence
    .filter((e) => Boolean(e.filePath))
    .map((e) => ({
      evidenceId: e.id,
      fileName: e.originalName || e.filename,
      mimeType: e.mimetype,
      filePath: e.filePath,
      category: e.category,
      isHIPAA: e.isHIPAA,
    }))
}

export function practiceAreaFor(claimType: string): string {
  return PRACTICE_AREA_BY_CLAIM[claimType] || 'Personal Injury'
}
