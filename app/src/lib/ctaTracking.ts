/**
 * Tells the tag manager which call-to-action a visitor clicked.
 *
 * Every "Start Free Case Assessment" button leads to the same URL, so without
 * this the container can't tell the hero button from the sticky mobile bar or
 * a case-type chip. Only a fixed location label and (for chips) the case-type
 * slug are sent — never form input.
 *
 * Silent when no container has loaded, like `pushScreenView`.
 */
export type CtaLocation = 'hero' | 'hero_resume' | 'sticky_mobile' | 'final_banner' | 'case_type_chip'

export function trackCtaClick(
  location: CtaLocation,
  details: { caseType?: string } = {},
  scope: Record<string, unknown> | undefined = typeof window === 'undefined'
    ? undefined
    : (window as unknown as Record<string, unknown>),
): void {
  const dataLayer = scope?.dataLayer
  if (!Array.isArray(dataLayer)) return

  dataLayer.push({
    event: 'cta_click',
    cta_location: location,
    ...(details.caseType ? { cta_case_type: details.caseType } : {}),
  })
}
