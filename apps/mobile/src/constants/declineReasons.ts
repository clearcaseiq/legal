/** Mirrors web DeclineModal — feeds routing / analytics. */
export const DECLINE_REASONS = [
  { value: 'low_value', label: 'Case value too low' },
  { value: 'outside_practice_area', label: 'Outside my practice area' },
  { value: 'wrong_jurisdiction', label: 'Wrong jurisdiction' },
  { value: 'liability_unclear', label: 'Liability unclear' },
  { value: 'insufficient_evidence', label: 'Insufficient evidence' },
  { value: 'conflict_of_interest', label: 'Conflict of interest' },
  { value: 'too_busy', label: 'Too busy / capacity' },
  { value: 'other', label: 'Other' },
] as const

export type DeclineReasonCode = (typeof DECLINE_REASONS)[number]['value']
