import { describe, expect, it } from 'vitest'
import {
  deriveTreatmentPosture,
  evaluateDemandGate,
  OPEN_TREATMENT_GAP_DAYS,
} from './demand-readiness'

const NOW = new Date('2026-07-29T12:00:00.000Z')

/** ISO date `days` before the fixed clock, so the fixtures do not drift. */
function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString()
}

describe('deriveTreatmentPosture', () => {
  it('reports complete when a person or the workflow marked treatment finished', () => {
    const posture = deriveTreatmentPosture({
      facts: { treatment: [{ date: daysAgo(300) }] },
      completionSignal: true,
      now: NOW,
    })

    expect(posture.posture).toBe('complete')
  })

  // The signal outranks stale intake data: intake said "ongoing" months ago, a
  // paralegal has since ticked the MMI milestone.
  it('lets an explicit completion signal override an ongoing intake answer', () => {
    const posture = deriveTreatmentPosture({
      facts: { treatment: [{ date: daysAgo(120), status: 'ongoing' }] },
      completionSignal: true,
      now: NOW,
    })

    expect(posture.posture).toBe('complete')
  })

  it('reports active while any recorded course of care is still ongoing', () => {
    const posture = deriveTreatmentPosture({
      facts: { treatment: [{ date: daysAgo(10), status: 'ongoing' }] },
      now: NOW,
    })

    expect(posture.posture).toBe('active')
  })

  it('reports unknown when nothing at all is on file', () => {
    const posture = deriveTreatmentPosture({ facts: {}, now: NOW })

    expect(posture.posture).toBe('unknown')
    expect(posture.entryCount).toBe(0)
    expect(posture.daysSinceLastTreatment).toBeNull()
  })

  // The Maria Torres case: regular visits, then silence. The largest gap BETWEEN
  // visits is small, so anything measuring only that saw a healthy file.
  it('treats a long silence since the last visit as a gap, not completion', () => {
    const posture = deriveTreatmentPosture({
      facts: {
        treatment: [{ date: daysAgo(262) }, { date: daysAgo(258) }, { date: daysAgo(255) }],
      },
      now: NOW,
    })

    expect(posture.posture).toBe('gap')
    expect(posture.daysSinceLastTreatment).toBe(255)
    expect(posture.largestGapDays).toBeLessThan(OPEN_TREATMENT_GAP_DAYS)
  })

  it('does not infer completion merely because no entry says ongoing', () => {
    const posture = deriveTreatmentPosture({
      facts: { treatment: [{ date: daysAgo(90) }, { date: daysAgo(70) }] },
      now: NOW,
    })

    expect(posture.posture).not.toBe('complete')
  })

  it('accepts an affirmative terminal status on every recorded course', () => {
    const posture = deriveTreatmentPosture({
      facts: {
        treatment: [
          { date: daysAgo(60), status: 'discharged' },
          { date: daysAgo(40), status: 'completed' },
        ],
      },
      now: NOW,
    })

    expect(posture.posture).toBe('complete')
  })

  it('accepts an MMI date on the medical block', () => {
    const posture = deriveTreatmentPosture({
      facts: { treatment: [{ date: daysAgo(30) }], medical: { mmiDate: daysAgo(20) } },
      now: NOW,
    })

    expect(posture.posture).toBe('complete')
  })

  it('reports active while care is recent and undocumented as finished', () => {
    const posture = deriveTreatmentPosture({
      facts: { treatment: [{ date: daysAgo(20) }, { date: daysAgo(6) }] },
      now: NOW,
    })

    expect(posture.posture).toBe('active')
  })

  it('folds chronology dates in alongside the raw facts', () => {
    const posture = deriveTreatmentPosture({
      facts: { treatment: [{ date: daysAgo(300) }] },
      chronologyDates: [daysAgo(9)],
      now: NOW,
    })

    expect(posture.daysSinceLastTreatment).toBe(9)
    expect(posture.entryCount).toBe(2)
  })

  it('ignores DOB / pre-incident chronology dates when computing gaps', () => {
    const posture = deriveTreatmentPosture({
      facts: {
        incident: { date: '2026-06-12' },
        medical: { stillTreating: true },
      },
      chronologyDates: ['1984-01-14', '2026-06-11', '2026-07-15', '2026-08-03'],
      now: NOW,
    })

    expect(posture.posture).toBe('active')
    expect(posture.largestGapDays).toBeLessThan(OPEN_TREATMENT_GAP_DAYS)
    expect(posture.entryCount).toBe(3)
  })
})

describe('evaluateDemandGate', () => {
  const complete = deriveTreatmentPosture({
    facts: { treatment: [{ date: daysAgo(15), status: 'discharged' }] },
    now: NOW,
  })

  it('opens only when treatment is complete and damages are documented', () => {
    const gate = evaluateDemandGate({
      treatment: complete,
      documentedMedicalBills: 21_000,
      hasMedicalRecords: true,
    })

    expect(gate.ready).toBe(true)
    expect(gate.blockers).toHaveLength(0)
  })

  it.each(['active', 'gap', 'unknown'] as const)('stays closed while treatment is %s', (posture) => {
    const gate = evaluateDemandGate({
      treatment: { ...complete, posture, detail: 'detail' },
      documentedMedicalBills: 21_000,
      hasMedicalRecords: true,
    })

    expect(gate.ready).toBe(false)
    expect(gate.blockers.map((b) => b.key)).toContain('treatment_incomplete')
  })

  it('blocks when there are no documented specials to anchor the number', () => {
    const gate = evaluateDemandGate({
      treatment: complete,
      documentedMedicalBills: 0,
      hasMedicalRecords: true,
    })

    expect(gate.ready).toBe(false)
    expect(gate.blockers.map((b) => b.key)).toContain('no_documented_specials')
  })

  it('blocks when no medical records are on file', () => {
    const gate = evaluateDemandGate({
      treatment: complete,
      documentedMedicalBills: 21_000,
      hasMedicalRecords: false,
    })

    expect(gate.ready).toBe(false)
    expect(gate.blockers.map((b) => b.key)).toContain('no_medical_records')
  })

  it('explains itself in language an attorney can act on', () => {
    const gate = evaluateDemandGate({
      treatment: { ...complete, posture: 'gap', detail: 'No treatment recorded for 255 days.' },
      documentedMedicalBills: 0,
      hasMedicalRecords: true,
    })

    expect(gate.detail).toContain('Not ready for a demand')
    expect(gate.blockers[0].detail).toContain('maximum medical improvement')
  })
})
