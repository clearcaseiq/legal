/**
 * Tells the tag manager a claimant submitted the free case assessment.
 *
 * The results page can't stand in for this: the form reaches it by client-side
 * navigation (no `gtm.js` fires), and it is also reopened from the dashboard,
 * emails and refreshes. Push this once, when the assessment is created, and
 * point the conversion tag at the `assessment_submitted` custom event.
 *
 * Only the broad case-type slug is sent — never the assessment id, contact
 * details or injury answers.
 *
 * Silent when no container has loaded, like `pushScreenView`.
 */
export function trackAssessmentSubmitted(
  details: { caseType?: string } = {},
  scope: Record<string, unknown> | undefined = typeof window === 'undefined'
    ? undefined
    : (window as unknown as Record<string, unknown>),
): void {
  const dataLayer = scope?.dataLayer
  if (!Array.isArray(dataLayer)) return

  dataLayer.push({
    event: 'assessment_submitted',
    ...(details.caseType ? { case_type: details.caseType } : {}),
  })
}
