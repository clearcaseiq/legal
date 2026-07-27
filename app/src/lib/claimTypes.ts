/**
 * Web entry point for the canonical claim-type labels shared with the mobile
 * apps. Import `formatClaimType` from here instead of hand-rolling a label map,
 * so an incident type never reads differently across surfaces (CP-406).
 */
export {
  CLAIM_TYPE_LABELS,
  DEFAULT_CLAIM_TYPE_LABEL,
  formatClaimType,
} from '../../../shared/claim-types'
