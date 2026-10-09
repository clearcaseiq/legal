/**
 * Whether the case team may see the claimant's medical documents yet: only once
 * the claimant has an account and has signed the HIPAA authorization. Until
 * then medical files and the treatment details extracted from them are withheld
 * from every attorney-facing surface, AI answers included.
 */
import { parseCaseFacts } from './case-facts'

const MEDICAL_EVIDENCE_CATEGORIES = new Set(['medical_records', 'bills', 'medical_bill'])

export const MEDICAL_SHARING_PENDING_MESSAGE =
  'Medical records and extracted treatment details are pending plaintiff account creation and HIPAA authorization. The visible case summary is based on intake answers only until the plaintiff authorizes medical document sharing.'

export function isMedicalEvidenceFile(file: any) {
  return MEDICAL_EVIDENCE_CATEGORIES.has(String(file?.category || '')) || MEDICAL_EVIDENCE_CATEGORIES.has(String(file?.subcategory || ''))
}

export function buildMedicalSharingStatus(assessment: any) {
  const facts = parseCaseFacts(assessment?.facts)
  const hasPlaintiffAccount = Boolean(assessment?.userId || assessment?.user?.id)
  const hasHipaaConsent = facts?.consents?.hipaa === true
  const evidenceFiles = Array.isArray(assessment?.evidenceFiles) ? assessment.evidenceFiles : []
  const medicalFileCount = evidenceFiles.filter(isMedicalEvidenceFile).length
  const canShareMedicalData = hasPlaintiffAccount && hasHipaaConsent

  return {
    canShareMedicalData,
    hasPlaintiffAccount,
    hasHipaaConsent,
    medicalFileCount,
    status: canShareMedicalData ? 'authorized' : 'pending_authorization',
    message: canShareMedicalData ? null : MEDICAL_SHARING_PENDING_MESSAGE,
  }
}
