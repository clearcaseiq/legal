/**
 * The first stage of the assessment funnel, recorded in our own database.
 *
 * An intake lead exists only once Step 1 is answered, so the visitors who open
 * the assessment and leave were invisible, and so was how many people each
 * entry page sends in. This records that someone started, under a random id
 * kept for the tab's session, which the lead later carries so the two join.
 *
 * Sent to our API only. What goes is the id, the public page the visit entered
 * on and the campaign tags already captured by `attribution.ts`: no answers,
 * contact details or click id.
 */
import api from './http'
import { getAttribution, getLandingPath } from './attribution'

const STORAGE_KEY = 'ccq_intake_visit'

function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function newId(): string | null {
  try {
    return crypto.randomUUID()
  } catch {
    return null
  }
}

/** The visit recorded in this tab, if any, for the lead to carry. */
export function currentIntakeVisitId(): string | undefined {
  return storage()?.getItem(STORAGE_KEY) || undefined
}

/**
 * Record that a fresh assessment was opened. Never throws, and never repeats
 * within a tab: a reload of Step 1 is the same visit.
 */
export function recordIntakeVisit(): void {
  const store = storage()
  if (!store || store.getItem(STORAGE_KEY)) return
  const id = newId()
  if (!id) return
  try {
    store.setItem(STORAGE_KEY, id)
  } catch {
    return
  }

  const attribution = getAttribution()
  void api
    .post('/v1/intake-visits', {
      id,
      landingPath: getLandingPath(),
      utmSource: attribution?.utmSource,
      utmMedium: attribution?.utmMedium,
      utmCampaign: attribution?.utmCampaign,
    })
    .catch(() => {
      /* measurement only; never let it touch the assessment */
    })
}
