const SITE = 'ClearCaseIQ'

/**
 * Signed-in app areas and the name shown in the browser tab for each, longest
 * prefix first. Marketing and SEO pages are absent on purpose: their titles come
 * from page data on the server and must not be replaced on navigation.
 */
const APP_SCREEN_TITLES: Array<[prefix: string, label: string]> = [
  ['/attorney-dashboard', 'Attorney Dashboard'],
  ['/attorney-onboarding/payment', 'Attorney Onboarding'],
  ['/attorney-billing', 'Billing'],
  ['/attorney-preferences', 'Attorney Preferences'],
  ['/attorney-profile', 'Attorney Profile'],
  ['/attorney-license-upload', 'License Upload'],
  ['/firm-dashboard', 'Firm Dashboard'],
  ['/firm-settings', 'Firm Settings'],
  ['/staff-profile', 'Staff Profile'],
  ['/assistance', 'Case Assistance'],
  ['/admin', 'Admin'],
  ['/payment/success', 'Payment Successful'],
  ['/payment', 'Payment'],
  ['/dashboard', 'My Dashboard'],
  ['/assessments', 'My Assessments'],
  ['/results', 'Case Results'],
  ['/evidence-dashboard', 'Evidence'],
  ['/evidence-upload', 'Upload Evidence'],
  ['/edit-assessment', 'Edit Assessment'],
  ['/case-tracker', 'Case Tracker'],
  ['/messaging', 'Messages'],
  ['/profile', 'My Profile'],
  ['/consent-management', 'Consents'],
  ['/smart-recommendations', 'Recommended Attorneys'],
  ['/demand', 'Demand Letter'],
  ['/drafts', 'Drafts'],
]

/** Tab title for a signed-in app screen, or null when the path is not one. */
export function appScreenTitle(pathname: string): string | null {
  const match = APP_SCREEN_TITLES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  return match ? `${match[1]} | ${SITE}` : null
}
