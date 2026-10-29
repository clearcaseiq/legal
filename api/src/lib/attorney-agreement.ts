/**
 * Attorney Participation Agreement: the terms an attorney accepts at signup,
 * and again whenever the version changes.
 *
 * Acceptance is a `Consent` row of type 'attorney_agreement' holding the exact
 * text accepted and its hash, so the record proves what was agreed even after
 * the wording here moves on. To change the terms, add a new version and point
 * CURRENT at it; never edit a version attorneys have already accepted.
 */
import crypto from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'

export const ATTORNEY_AGREEMENT_CONSENT_TYPE = 'attorney_agreement'
export const ATTORNEY_AGREEMENT_DOCUMENT_ID = 'attorney-participation-agreement'

export type AttorneyAgreementVersion = {
  version: string
  title: string
  effectiveDate: string
  sections: Array<{ heading: string; body: string }>
}

const VERSIONS: Record<string, AttorneyAgreementVersion> = {
  '2026-10-29': {
    version: '2026-10-29',
    title: 'ClearCaseIQ Attorney Participation Agreement',
    effectiveDate: '2026-10-29',
    sections: [
      {
        heading: 'What ClearCaseIQ is',
        body:
          'ClearCaseIQ is a technology platform that helps people with injury claims organize their case and choose which law firms may review it. ClearCaseIQ is not a law firm, does not give legal advice, and does not recommend, select or refer any lawyer to anyone.',
      },
      {
        heading: 'The claimant chooses',
        body:
          'A case is shared with your firm only after the claimant selects your firm and authorizes the disclosure. You decide independently whether to accept or decline any case, and you are never required to accept one.',
      },
      {
        heading: 'Your license and professional responsibility',
        body:
          'You confirm that you are licensed and in good standing in every state you list on your profile, and that you will tell us promptly if that changes. You alone are responsible for your professional judgment, conflict checks, engagement terms and compliance with the rules of professional conduct, including the rules on advertising, solicitation and client communication. ClearCaseIQ does not direct or control your representation of any client.',
      },
      {
        heading: 'Fees',
        body:
          'Fees you pay ClearCaseIQ are for use of the platform. They are shown in your billing settings before you incur them, they are not a share of any legal fee, and they do not depend on the outcome of any matter. You will not share legal fees with ClearCaseIQ.',
      },
      {
        heading: 'Confidentiality',
        body:
          'Case information you receive is confidential. You will use it only to evaluate and, if engaged, represent the claimant who shared it, protect it with reasonable safeguards, and not contact any claimant who has not shared their case with you.',
      },
      {
        heading: 'Accurate information',
        body:
          'You will keep your profile, licensure and contact information accurate and current. ClearCaseIQ may verify your license and may suspend an account whose information is inaccurate.',
      },
      {
        heading: 'Calls and texts',
        body:
          'Any calls or texts you send to claimants, through the platform or otherwise, must comply with the Telephone Consumer Protection Act and applicable state law.',
      },
      {
        heading: 'Suspension and termination',
        body:
          'Either party may end this agreement at any time. ClearCaseIQ may suspend access for a breach of this agreement or of law. Fees already incurred remain payable.',
      },
      {
        heading: 'Changes',
        body:
          'ClearCaseIQ may update this agreement. You will be asked to accept a new version before you can accept further cases.',
      },
      {
        heading: 'Other terms',
        body:
          'The ClearCaseIQ Terms of Service and Privacy Policy also apply. If they conflict with this agreement on attorney participation, this agreement controls.',
      },
    ],
  },
}

export const CURRENT_ATTORNEY_AGREEMENT_VERSION = '2026-10-29'

export function getAttorneyAgreement(version = CURRENT_ATTORNEY_AGREEMENT_VERSION): AttorneyAgreementVersion | null {
  return VERSIONS[version] ?? null
}

export function attorneyAgreementText(agreement: AttorneyAgreementVersion): string {
  const body = agreement.sections.map((s) => `${s.heading}\n${s.body}`).join('\n\n')
  return `${agreement.title}\nVersion ${agreement.version}, effective ${agreement.effectiveDate}\n\n${body}`
}

export type RecordAttorneyAgreementInput = {
  userId: string
  version: string
  attorneyId?: string | null
  lawFirmId?: string | null
  source: 'registration' | 'dashboard'
  ipAddress?: string | null
  userAgent?: string | null
}

/** Returns false when the version is not the current one, so stale tabs cannot accept old terms. */
export async function recordAttorneyAgreementAcceptance(input: RecordAttorneyAgreementInput): Promise<boolean> {
  if (input.version !== CURRENT_ATTORNEY_AGREEMENT_VERSION) return false
  const agreement = getAttorneyAgreement(input.version)
  if (!agreement) return false

  const existing = await prisma.consent.findFirst({
    where: {
      userId: input.userId,
      consentType: ATTORNEY_AGREEMENT_CONSENT_TYPE,
      version: input.version,
      granted: true,
      revokedAt: null,
    },
    select: { id: true },
  })
  if (existing) return true

  const text = attorneyAgreementText(agreement)
  const consent = await prisma.consent.create({
    data: {
      userId: input.userId,
      consentType: ATTORNEY_AGREEMENT_CONSENT_TYPE,
      version: input.version,
      documentId: ATTORNEY_AGREEMENT_DOCUMENT_ID,
      granted: true,
      grantedAt: new Date(),
      signatureMethod: 'clicked',
      ipAddress: input.ipAddress || undefined,
      userAgent: input.userAgent || undefined,
      consentText: text,
      consentHash: crypto.createHash('sha256').update(text).digest('hex'),
      metadata: JSON.stringify({
        source: input.source,
        attorneyId: input.attorneyId || null,
        lawFirmId: input.lawFirmId || null,
      }),
    },
    select: { id: true },
  })
  logger.info('Attorney agreement accepted', {
    consentId: consent.id,
    userId: input.userId,
    version: input.version,
    source: input.source,
  })
  return true
}

export async function getAttorneyAgreementAcceptance(
  userId: string,
): Promise<{ accepted: boolean; acceptedAt: Date | null }> {
  const row = await prisma.consent.findFirst({
    where: {
      userId,
      consentType: ATTORNEY_AGREEMENT_CONSENT_TYPE,
      version: CURRENT_ATTORNEY_AGREEMENT_VERSION,
      granted: true,
      revokedAt: null,
    },
    select: { grantedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return { accepted: Boolean(row), acceptedAt: row ? (row.grantedAt ?? row.createdAt) : null }
}

/** By the attorney's login email, for actions where firm staff act on the attorney's behalf. */
export async function hasAttorneyAcceptedAgreement(attorneyEmail: string | null | undefined): Promise<boolean> {
  if (!attorneyEmail) return false
  const user = await prisma.user.findUnique({
    where: { email: attorneyEmail.trim().toLowerCase() },
    select: { id: true },
  })
  if (!user) return false
  return (await getAttorneyAgreementAcceptance(user.id)).accepted
}
