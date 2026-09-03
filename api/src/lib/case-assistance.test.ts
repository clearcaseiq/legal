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

  it('treats the handover status as no longer active work', () => {
    // `ready_for_attorney_review` is the last state a specialist owns, so it
    // must fall out of the working set or every finished case stays at the top
    // of the queue forever.
    expect(ACTIVE_ASSISTANCE_STATUSES).not.toContain('ready_for_attorney_review')
    expect(ACTIVE_ASSISTANCE_STATUSES.length).toBe(ASSISTANCE_STATUSES.length - 1)
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
    expect(isAssistanceStatus('needs_contact')).toBe(true)
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

  it('is case-insensitive about stored status strings', () => {
    expect(deriveAssistancePhase({ assessmentStatus: 'Closed' })).toBe('closed')
    expect(deriveAssistancePhase({ lifecycleState: 'Attorney_Matched' })).toBe('engaged')
  })
})
