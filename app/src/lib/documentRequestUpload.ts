/**
 * Maps attorney document-request keys to Supporting Documents / evidence upload
 * targets. Keep in sync with api/src/lib/document-request-status.ts
 * DOCUMENT_REQUEST_CATEGORY_MAP (fulfillment) and IntakeWizardQuick evidence rows.
 */

export type EvidenceUploadTarget = {
  /** Evidence category used by POST /v1/evidence/upload */
  category: string
  subcategory?: string
  /** Supporting Documents ?focus= value (must match data-evidence-category) */
  focus: string
}

const REQUEST_KEY_TO_UPLOAD: Record<string, EvidenceUploadTarget> = {
  police_report: { category: 'police_report', subcategory: 'report', focus: 'police_report' },
  medical_records: { category: 'medical_records', subcategory: 'records', focus: 'medical_records' },
  prior_treatment: { category: 'medical_records', subcategory: 'records', focus: 'medical_records' },
  injury_photos: { category: 'photos', subcategory: 'injury_photos', focus: 'photos' },
  photos: { category: 'photos', subcategory: 'injury_photos', focus: 'photos' },
  product_preservation: { category: 'photos', subcategory: 'injury_photos', focus: 'photos' },
  bills: { category: 'bills', subcategory: 'medical_bill', focus: 'bills' },
  insurance: { category: 'insurance_letters', subcategory: 'carrier_letters', focus: 'insurance_letters' },
  dec_page: { category: 'dec_page', subcategory: 'declarations', focus: 'dec_page' },
  // Intake uploads wage docs as wage_verification; fulfillment map must accept it too.
  wage_loss: { category: 'wage_verification', subcategory: 'income_loss', focus: 'wage_verification' },
}

/** Resolve a request item key to the evidence category/subcategory to upload into. */
export function evidenceTargetForRequestKey(requestKey: string): EvidenceUploadTarget | null {
  const key = (requestKey || '').trim()
  if (!key) return null
  return REQUEST_KEY_TO_UPLOAD[key] || null
}

/** Whether this request key can use an inline single-category uploader on Tasks. */
export function canInlineUploadRequestKey(requestKey: string): boolean {
  return evidenceTargetForRequestKey(requestKey) != null
}
