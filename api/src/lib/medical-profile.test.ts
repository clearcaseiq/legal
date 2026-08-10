import { describe, it, expect } from 'vitest'
import {
  buildMedicalProfile,
  applyDocumentedFindings,
  refreshMedicalProfile,
  profileEvidenceSummary,
  normalizeIncidentType,
} from './medical-profile'

describe('normalizeIncidentType', () => {
  it('maps common phrasings to canonical incident types', () => {
    expect(normalizeIncidentType('Vehicle Accident')).toBe('auto')
    expect(normalizeIncidentType('slip/trip on property')).toBe('slip_fall')
    expect(normalizeIncidentType('Dog bite')).toBe('dog_bite')
    expect(normalizeIncidentType('Medical Malpractice')).toBe('medmal')
    expect(normalizeIncidentType('Wrongful death')).toBe('wrongful_death')
    expect(normalizeIncidentType(undefined)).toBe('other')
  })
})

describe('buildMedicalProfile', () => {
  it('builds provenance-tagged injuries from per-region detail', () => {
    const facts = {
      intakeData: {
        injuryType: 'Vehicle Accident',
        injuryDetails: {
          bodyParts: ['neck', 'lower_back'],
          regionDetail: {
            neck: { side: 'n/a', symptoms: ['neck_pain', 'stiffness'], findings: ['disc_bulge'], treatments: ['pt', 'mri'] },
            lower_back: { symptoms: ['back_pain'], findings: ['herniation'], treatments: ['injection'] },
          },
          lifestyleImpact: ['work', 'sleep'],
          lifeImpactDetail: { work: ['reduced_hours'] },
          recoveryStatus: 'improving_slowly',
          recoveryPercent: 40,
          treatmentStatus: 'still_treating',
        },
      },
    }
    const p = buildMedicalProfile(facts)
    expect(p.incidentType).toBe('auto')
    expect(p.injuries).toHaveLength(2)
    const neck = p.injuries.find((i) => i.region === 'neck')!
    expect(neck.side).toBe('n/a')
    expect(neck.findings).toEqual([{ code: 'disc_bulge', source: 'user_reported', status: 'reported' }])
    expect(neck.treatments.map((t) => t.code)).toEqual(['pt', 'mri'])
    expect(p.evidence.userReported.findings).toBe(2)
    expect(p.functionalImpact.areas).toEqual(['work', 'sleep'])
    expect(p.functionalImpact.recoveryPercent).toBe(40)
    expect(p.documentedRatio).toBe(0)
    expect(p.hasDocumentedRecords).toBe(false)
  })

  it('reads injuryDetails from the top level too', () => {
    const p = buildMedicalProfile({ injuryDetails: { regionDetail: { knee: { findings: ['meniscus_tear'], treatments: [], symptoms: [] } } } })
    expect(p.injuries).toHaveLength(1)
    expect(p.injuries[0].region).toBe('knee')
  })

  it('falls back to body parts + flat diagnoses when no region detail', () => {
    const facts = {
      intakeData: {
        injuryType: 'Slip and fall',
        injuryDetails: {
          bodyParts: ['shoulder'],
          diagnoses: ['fracture', 'tear'],
          currentSymptoms: ['pain'],
        },
      },
    }
    const p = buildMedicalProfile(facts)
    expect(p.incidentType).toBe('slip_fall')
    expect(p.injuries.find((i) => i.region === 'shoulder')).toBeTruthy()
    const general = p.injuries.find((i) => i.region === 'general')!
    expect(general.findings.map((f) => f.code)).toEqual(['fracture', 'tear'])
    expect(general.symptoms).toEqual(['pain'])
  })

  it('captures non-body-part case type detail', () => {
    const p = buildMedicalProfile({
      intakeData: { injuryType: 'Dog bite', injuryDetails: { regionDetail: {}, caseTypeDetail: { biteLocation: ['arm'], stitches: true } } },
    })
    expect(p.caseType?.type).toBe('dog_bite')
    expect(p.caseType?.detail.stitches).toBe(true)
  })
})

describe('applyDocumentedFindings', () => {
  it('records documented codes and lifts documentedRatio', () => {
    const p = buildMedicalProfile({
      injuryDetails: { regionDetail: { neck: { findings: ['disc_bulge', 'radiculopathy'], treatments: [], symptoms: [] } } },
    })
    expect(p.documentedRatio).toBe(0)
    applyDocumentedFindings(p, { icdCodes: ['M50.20', 'M54.12'], cptCodes: ['72141'] })
    expect(p.hasDocumentedRecords).toBe(true)
    expect(p.evidence.medicalRecordConfirmed.count).toBe(3)
    // 3 documented codes vs 2 reported findings => capped at 1
    expect(p.documentedRatio).toBe(1)
  })

  it('is fully documented when nothing was self-reported but records exist', () => {
    const p = buildMedicalProfile({ injuryDetails: { regionDetail: {} } })
    applyDocumentedFindings(p, { icdCodes: ['S13.4'] })
    expect(p.documentedRatio).toBe(1)
  })

  it('dedupes documented codes', () => {
    const p = buildMedicalProfile({ injuryDetails: { regionDetail: { neck: { findings: ['a', 'b', 'c', 'd'], treatments: [], symptoms: [] } } } })
    applyDocumentedFindings(p, { icdCodes: ['X', 'X', 'Y'], cptCodes: ['Z', 'Z'] })
    expect(p.evidence.medicalRecordConfirmed.icdCodes).toEqual(['X', 'Y'])
    expect(p.evidence.medicalRecordConfirmed.cptCodes).toEqual(['Z'])
    expect(p.evidence.medicalRecordConfirmed.count).toBe(3)
    expect(p.documentedRatio).toBeCloseTo(0.75)
  })
})

describe('refreshMedicalProfile + summary', () => {
  it('rebuilds and folds documented codes in one step', () => {
    const facts = {
      injuryDetails: { regionDetail: { knee: { findings: ['meniscus_tear'], treatments: ['arthroscopy'], symptoms: ['swelling'] } } },
      clinical: { icdCodes: ['S83.2'], cptCodes: [] },
    }
    const p = refreshMedicalProfile(facts, { icdCodes: facts.clinical.icdCodes, cptCodes: facts.clinical.cptCodes })
    const summary = profileEvidenceSummary(p)
    expect(summary.injuries).toBe(1)
    expect(summary.reportedFindings).toBe(1)
    expect(summary.documentedCodes).toBe(1)
    expect(summary.hasDocumentedRecords).toBe(true)
  })
})
