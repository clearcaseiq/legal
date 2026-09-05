/**
 * The specialist status vocabulary owns pre-routing states only.
 *
 * The point of these tests is the boundary. There were already three status
 * vocabularies plus a derived one before this feature; the failure mode to guard
 * against is a case that moved on to attorneys still showing a stale specialist
 * status as its headline state, because that status was copied rather than
 * derived from the field that actually knows.
 */
import { describe, expect, it } from 'vitest'
import {
  ACTIVE_ASSISTANCE_STATUSES,
  ASSISTANCE_STATUSES,
  ASSISTANCE_STATUS_LABELS,
  CLOSED_ASSISTANCE_STATUSES,
  UNCONTACTED_ASSISTANCE_STATUSES,
  WAITING_ASSISTANCE_STATUSES,
  deriveAssistancePhase,
  isAssistanceOwned,
  isAssistanceStatus,
  reviewDueFrom,
} from './case-assistance'

describe('assistance status vocabulary', () => {
  it('labels every status', () => {
    for (const status of ASSISTANCE_STATUSES) {
      expect(ASSISTANCE_STATUS_LABELS[status]).toBeTruthy()
    }
  })

  it('treats both ways out of the queue as no longer active work', () => {
    // `ready_for_attorney_review` is the last state a specialist owns and
    // `denied` ends the case outright, so both must fall out of the working set
    // or finished cases stay at the top of the queue forever.
    expect(ACTIVE_ASSISTANCE_STATUSES).not.toContain('ready_for_attorney_review')
    expect(ACTIVE_ASSISTANCE_STATUSES).not.toContain('denied')
    expect(ACTIVE_ASSISTANCE_STATUSES.length).toBe(ASSISTANCE_STATUSES.length - 2)
  })

  it('keeps an unanswered call as work rather than an ending', () => {
    // The plaintiff not picking up is the specialist's cue to try again, so it
    // has to stay in the queue. Reading it as terminal silently drops the case.
    expect(ACTIVE_ASSISTANCE_STATUSES).toContain('call_not_accepted')
    expect(CLOSED_ASSISTANCE_STATUSES).not.toContain('call_not_accepted')
    expect(UNCONTACTED_ASSISTANCE_STATUSES).toContain('call_not_accepted')
  })

  it('does not count a case as uncontacted once someone has spoken to them', () => {
    expect(UNCONTACTED_ASSISTANCE_STATUSES).not.toContain('in_progress')
    expect(UNCONTACTED_ASSISTANCE_STATUSES).not.toContain('document_requested')
  })

  it('counts waiting states as active but distinguishes them', () => {
    for (const status of WAITING_ASSISTANCE_STATUSES) {
      expect(ACTIVE_ASSISTANCE_STATUSES).toContain(status)
    }
  })

  it('rejects statuses borrowed from the other vocabularies', () => {
    // These are real values elsewhere in the schema: a lifecycleState, a lead
    // status and a caseStage. None of them belongs here.
    expect(isAssistanceStatus('routing_active')).toBe(false)
    expect(isAssistanceStatus('retained')).toBe(false)
    expect(isAssistanceStatus('DEMAND_SENT')).toBe(false)
    expect(isAssistanceStatus('document_requested')).toBe(true)
  })

  it('rejects the statuses the flow retired', () => {
    // Left in the vocabulary these would keep appearing in the dropdown, and
    // any row still carrying one is remapped by the accompanying migration.
    for (const retired of ['needs_review', 'needs_contact', 'waiting_on_plaintiff', 'waiting_on_documents']) {
      expect(isAssistanceStatus(retired)).toBe(false)
    }
  })

  it('sets the review deadline a fixed window after assignment', () => {
    const assignedAt = new Date('2026-09-03T10:00:00.000Z')
    expect(reviewDueFrom(assignedAt).toISOString()).toBe('2026-09-03T14:00:00.000Z')
  })
})

describe('deriveAssistancePhase', () => {
  it('is assistance only while no lead submission exists', () => {
    expect(deriveAssistancePhase({ assessmentStatus: 'COMPLETED' })).toBe('assistance')
    expect(isAssistanceOwned({ assessmentStatus: 'COMPLETED' })).toBe(true)
  })

  it('reads routing from lifecycleState rather than a copied status', () => {
    expect(deriveAssistancePhase({ lifecycleState: 'routing_active' })).toBe('routing')
    expect(deriveAssistancePhase({ lifecycleState: 'attorney_review' })).toBe('routing')
  })

  it('reads representation from lifecycleState', () => {
    expect(deriveAssistancePhase({ lifecycleState: 'attorney_matched' })).toBe('engaged')
    expect(deriveAssistancePhase({ lifecycleState: 'consultation_scheduled' })).toBe('engaged')
    expect(deriveAssistancePhase({ lifecycleState: 'engaged' })).toBe('engaged')
  })

  it('reads closure from the shared CLOSED_STATUSES set, not just "closed"', () => {
    // A case also reaches the end by being won, settled or resolved, and those
    // are set elsewhere. The admin closed-cases list had this exact bug.
    for (const status of ['closed', 'won', 'resolved', 'settled']) {
      expect(deriveAssistancePhase({ assessmentStatus: status })).toBe('closed')
    }
  })

  it('lets closure win over an in-flight lifecycleState', () => {
    expect(deriveAssistancePhase({ assessmentStatus: 'settled', lifecycleState: 'engaged' })).toBe('closed')
  })

  it('counts a lead submission with no lifecycleState as past assistance', () => {
    // Submitting for attorney review is the boundary, whether or not routing has
    // stamped a lifecycle state on it yet.
    expect(deriveAssistancePhase({ hasLeadSubmission: true })).toBe('routing')
    expect(isAssistanceOwned({ hasLeadSubmission: true })).toBe(false)
  })

  it('reads a denied case as closed rather than live specialist work', () => {
    expect(deriveAssistancePhase({ assistanceStatus: 'denied' })).toBe('closed')
    expect(isAssistanceOwned({ assistanceStatus: 'denied' })).toBe(false)
  })

  it('leaves the other statuses in the assistance phase', () => {
    for (const status of ['new_submission', 'in_progress', 'document_requested', 'call_not_accepted']) {
      expect(deriveAssistancePhase({ assistanceStatus: status })).toBe('assistance')
    }
  })

  it('is case-insensitive about stored status strings', () => {
    expect(deriveAssistancePhase({ assessmentStatus: 'Closed' })).toBe('closed')
    expect(deriveAssistancePhase({ lifecycleState: 'Attorney_Matched' })).toBe('engaged')
  })
})
