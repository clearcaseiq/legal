/**
 * Strips claimant identity from a case the attorney has not yet accepted.
 *
 * The offer screen was already de-identified, but only in the browser: the
 * dashboard payload still carried the claimant's name, email and phone, so the
 * fee-gated contact details were one network-tab away. This runs on the server
 * so the unaccepted payload never contains them.
 */

/** Statuses at which the attorney has accepted the case and may see who it is. */
export const CONTACT_REVEALED_STATUSES = new Set(['contacted', 'consulted', 'retained'])

const PLAINTIFF_CONTACT_FACT_KEYS = ['firstName', 'lastName', 'fullName', 'email', 'phone', 'address', 'dob', 'dateOfBirth']

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseFacts(raw: unknown): Record<string, any> {
  if (typeof raw !== 'string') return { ...((raw as Record<string, any>) || {}) }
  try {
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

export function deidentifyAssessmentForOffer<T extends Record<string, any>>(assessment: T): T {
  const factsIsString = typeof assessment.facts === 'string'
  const facts = parseFacts(assessment.facts)
  const context = facts.plaintiffContext || {}
  const names = [assessment.user?.firstName, assessment.user?.lastName, context.firstName, context.lastName]
    .map((n) => String(n || '').trim())
    .filter((n) => n.length >= 2)

  const scrub = (text: unknown) => {
    if (typeof text !== 'string' || !text) return text
    let out = text.replace(EMAIL_RE, '[email]').replace(PHONE_RE, '[phone]')
    for (const name of names) {
      out = out.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi'), '[Client]')
    }
    return out
  }

  if (facts.plaintiffContext) {
    const nextContext = { ...facts.plaintiffContext }
    for (const key of PLAINTIFF_CONTACT_FACT_KEYS) delete nextContext[key]
    facts.plaintiffContext = nextContext
  }
  if (facts.incident?.narrative) {
    facts.incident = { ...facts.incident, narrative: scrub(facts.incident.narrative) }
  }
  if (facts.damages?.pain_suffering_narrative) {
    facts.damages = { ...facts.damages, pain_suffering_narrative: scrub(facts.damages.pain_suffering_narrative) }
  }

  return {
    ...assessment,
    ...(assessment.caseName !== undefined ? { caseName: scrub(assessment.caseName) } : {}),
    ...(assessment.user !== undefined ? { user: assessment.user ? { id: assessment.user.id } : assessment.user } : {}),
    ...(assessment.facts !== undefined ? { facts: factsIsString ? JSON.stringify(facts) : facts } : {}),
  }
}
