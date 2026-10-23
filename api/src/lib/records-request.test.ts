import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    documentEnvelope: { findMany: vi.fn(), findFirst: vi.fn() },
    representationAttestation: { findFirst: vi.fn() },
  },
}))
vi.mock('./medical-overview', () => ({ findTestDocuments: vi.fn(async () => []) }))
vi.mock('./workflow-step-tasks', () => ({ syncWorkflowItemFromTask: vi.fn(async () => undefined) }))

import { prisma } from './prisma'
import { UPLOAD_LINK_TOKEN, type LetterContext } from './representation-letters'
import {
  blockingChecks,
  defaultRecordTypes,
  getHipaaCoverage,
  getRepresentationStatus,
  letterOfProtectionBody,
  providerRequestBody,
  requestChecks,
  type CheckInput,
  type HipaaCoverage,
  type RepresentationStatus,
} from './records-request'
import { caseFamily } from './case-type-letters'
import { CLAIM_TYPE_LABELS } from './claim-types'

const ctx: LetterContext = {
  leadId: 'lead1',
  assessmentId: 'a1',
  clientName: 'Morgan Ellis',
  dateOfLoss: 'March 3, 2026',
  attorneyName: 'Dana Hinton',
  attorneyEmail: 'dana@hinton.law',
  attorneyPhone: null,
  firmName: 'Hinton Law Firm',
  firmAddressLines: [],
  firmPhone: '(206) 555-0100',
  today: 'October 23, 2026',
}

const verified: RepresentationStatus = { verified: true, basis: 'signed_retainer', signedAt: '2026-03-10T00:00:00Z', attestation: null }
const unverified: RepresentationStatus = { verified: false, basis: null, signedAt: null, attestation: null }
const hipaaOk: HipaaCoverage = {
  status: 'ok',
  envelopeId: 'env1',
  signedFilePath: '/x.pdf',
  signedAt: '2026-03-12T00:00:00.000Z',
  expiresAt: '2028-03-11T00:00:00.000Z',
  custodian: null,
  dateRange: null,
  dob: null,
}

const baseRequest = {
  providerName: 'Harborview Imaging',
  requestType: 'records_and_billing' as const,
  recordTypes: defaultRecordTypes('Harborview Imaging'),
  from: '2026-03-03',
  to: '2026-04-15',
  hipaaSignedAt: hipaaOk.signedAt,
  dob: 'May 1, 1990',
}

function checksFor(over: Partial<CheckInput>) {
  return requestChecks({
    kind: 'provider_request',
    body: providerRequestBody(ctx, { ...baseRequest, representationVerified: true }),
    delivery: 'email',
    recipientEmail: 'records@harborview.org',
    attorneyName: ctx.attorneyName,
    representation: verified,
    hipaa: hipaaOk,
    dob: 'May 1, 1990',
    isTest: false,
    requestType: 'records_and_billing',
    recordTypes: baseRequest.recordTypes,
    from: baseRequest.from,
    to: baseRequest.to,
    ...over,
  })
}
const statusOf = (checks: ReturnType<typeof requestChecks>, key: string) => checks.find((c) => c.key === key)?.status

describe('defaultRecordTypes', () => {
  it('asks imaging providers for the DICOM studies, not just reports', () => {
    expect(defaultRecordTypes('Harborview Demo Imaging')).toEqual(['imaging_reports', 'imaging_files'])
    expect(defaultRecordTypes('Bay Physical Therapy')).toEqual(['therapy_notes'])
  })

  it('adds what the kind of case calls for', () => {
    expect(defaultRecordTypes('Bay Physical Therapy', null, 'auto')).toEqual(['therapy_notes'])
    expect(defaultRecordTypes('Bay Physical Therapy', null, 'workers_comp')).toEqual(['therapy_notes', 'work_status'])
    expect(defaultRecordTypes('Mercy Hospital', null, 'medical_malpractice')).toContain('complete_chart')
    expect(defaultRecordTypes('Mercy Hospital', null, 'dog_bite')).toContain('wound_care')
    expect(defaultRecordTypes('Mercy Hospital', null, 'toxic_exposure')).toContain('toxicology')
    expect(defaultRecordTypes('Mercy Hospital', null, 'wrongful_death')).toContain('final_treatment')
    expect(defaultRecordTypes('Sunrise Care Center', null, 'nursing_home_abuse')).toContain('facility_care')
    expect(defaultRecordTypes('Mercy Hospital', null, 'high_severity_surgery')).toContain('future_care')
    expect(defaultRecordTypes('Mercy Hospital', null, 'assault')).toContain('forensic_exam')
  })
})

describe('case-type coverage', () => {
  it('maps every claim type the app knows to a specific profile', () => {
    const generic = new Set(['other', 'other_pi'])
    for (const slug of Object.keys(CLAIM_TYPE_LABELS).filter((s) => !generic.has(s))) {
      expect(caseFamily(slug), slug).not.toBe('general')
    }
  })

  it('names the personal representative on a wrongful death request and warns about authority', () => {
    const wd = { ...ctx, claimType: 'wrongful_death' }
    const body = providerRequestBody(wd, { ...baseRequest, representationVerified: true })
    expect(body).toContain("signed by the decedent's personal representative")
    expect(body).toContain('injuries and death arising from the incident')
    const checks = requestChecks({
      kind: 'provider_request',
      body,
      delivery: 'email',
      recipientEmail: 'records@harborview.org',
      attorneyName: ctx.attorneyName,
      representation: verified,
      hipaa: hipaaOk,
      dob: 'May 1, 1990',
      isTest: false,
      claimType: 'wrongful_death',
    })
    expect(checks.find((c) => c.key === 'case_type_0')?.status).toBe('warn')
  })

  it('asks auto providers to break out PIP and med-pay payments', () => {
    const body = providerRequestBody({ ...ctx, claimType: 'auto' }, { ...baseRequest, representationVerified: true })
    expect(body).toMatch(/personal injury protection \(PIP\)/)
  })

  it("warns before a letter of protection on a workers' comp case", () => {
    const lop = letterOfProtectionBody(ctx, { providerName: 'Bay Ortho', from: '2026-03-03', to: null })
    const checks = requestChecks({
      kind: 'provider_lop',
      body: lop,
      delivery: 'download',
      attorneyName: ctx.attorneyName,
      representation: verified,
      isTest: false,
      claimType: 'workers_comp',
    })
    expect(checks.find((c) => c.key === 'case_type_0')?.detail).toMatch(/workers' compensation usually pays/)
  })
})

describe('providerRequestBody', () => {
  it('states representation only when it is verified', () => {
    expect(providerRequestBody(ctx, { ...baseRequest, representationVerified: true })).toContain('Hinton Law Firm represents Morgan Ellis')
    const omitted = providerRequestBody(ctx, { ...baseRequest, representationVerified: false })
    expect(omitted).not.toMatch(/represents|our client/i)
  })

  it('tailors dates, record types and billing to the request', () => {
    const body = providerRequestBody(ctx, { ...baseRequest, representationVerified: true })
    expect(body).toContain('Dates of service requested: March 3, 2026 through April 15, 2026')
    expect(body).toContain('DICOM')
    expect(body).toContain('CPT/HCPCS')
    expect(body).toContain(UPLOAD_LINK_TOKEN)
    expect(body).toContain('Enclosure: HIPAA authorization signed March 12, 2026')
    const billingOnly = providerRequestBody(ctx, { ...baseRequest, requestType: 'billing', representationVerified: true })
    expect(billingOnly).not.toContain('DICOM')
    expect(billingOnly).toContain('Attn: Billing Department')
  })

  it('omits the DOB line rather than printing a blank when the DOB is unknown', () => {
    const body = providerRequestBody(ctx, { ...baseRequest, dob: null, representationVerified: true })
    expect(body).not.toContain('Date of birth')
    expect(body).not.toMatch(/_{4,}/)
  })

  it('never carries letter-of-protection language', () => {
    expect(providerRequestBody(ctx, { ...baseRequest, representationVerified: true })).not.toMatch(/letter of protection/i)
  })
})

describe('requestChecks', () => {
  it('passes a complete, verified request', () => {
    expect(blockingChecks(checksFor({}))).toEqual([])
  })

  it('blocks a letter that asserts representation the case cannot back', () => {
    expect(statusOf(checksFor({ representation: unverified }), 'representation')).toBe('block')
    const neutral = providerRequestBody(ctx, { ...baseRequest, representationVerified: false })
    expect(statusOf(checksFor({ representation: unverified, body: neutral }), 'representation')).toBe('warn')
  })

  it('blocks without a signed authorization covering this provider', () => {
    expect(statusOf(checksFor({ hipaa: { ...hipaaOk, status: 'missing' } }), 'hipaa')).toBe('block')
    expect(statusOf(checksFor({ hipaa: { ...hipaaOk, status: 'expired' } }), 'hipaa')).toBe('block')
    expect(statusOf(checksFor({ hipaa: { ...hipaaOk, status: 'other_provider', custodian: 'Bay Ortho' } }), 'hipaa')).toBe('block')
  })

  it('blocks blanks and unfilled template tokens', () => {
    expect(statusOf(checksFor({ body: 'Dear __________, send records. Dana Hinton' }), 'placeholders')).toBe('block')
    expect(statusOf(checksFor({ body: 'Patient DOB {{patient_dob}}. Dana Hinton' }), 'placeholders')).toBe('block')
  })

  it('warns, not blocks, on a missing date of birth', () => {
    expect(statusOf(checksFor({ dob: null }), 'patient_identifier')).toBe('warn')
  })

  it('blocks an empty scope and a bad email', () => {
    expect(statusOf(checksFor({ recordTypes: [] }), 'scope')).toBe('block')
    expect(statusOf(checksFor({ from: '2026-05-01', to: '2026-04-01' }), 'scope')).toBe('block')
    expect(statusOf(checksFor({ recipientEmail: 'nope' }), 'delivery')).toBe('block')
  })

  it('flags a test case', () => {
    expect(statusOf(checksFor({ isTest: true }), 'test_case')).toBe('block')
  })

  it('always requires verified representation on a carrier letter or letter of protection', () => {
    const lop = letterOfProtectionBody(ctx, { providerName: 'Bay Ortho', from: '2026-03-03', to: null })
    const checks = requestChecks({
      kind: 'provider_lop',
      body: lop,
      delivery: 'download',
      attorneyName: ctx.attorneyName,
      representation: unverified,
      isTest: false,
    })
    expect(statusOf(checks, 'representation')).toBe('block')
  })
})

describe('letterOfProtectionBody', () => {
  it('limits payment to recovery proceeds and leaves the signature to the signing step', () => {
    const body = letterOfProtectionBody(ctx, { providerName: 'Bay Ortho', from: '2026-03-03', to: null })
    expect(body).toContain('not a personal guarantee')
    expect(body).toContain('Our client has authorized this letter of protection')
    expect(body.trimEnd().endsWith('Sincerely,')).toBe(true)
  })
})

describe('getHipaaCoverage', () => {
  const findMany = prisma.documentEnvelope.findMany as unknown as ReturnType<typeof vi.fn>
  beforeEach(() => findMany.mockReset())

  it('accepts an authorization left to counsel and reads the DOB from it', async () => {
    findMany.mockResolvedValue([
      { id: 'e1', signedAt: new Date('2026-03-12'), signedFilePath: null, fieldValues: JSON.stringify({ patient_dob: '05/01/1990' }) },
    ])
    const c = await getHipaaCoverage('lead1', 'Harborview Imaging', new Date('2026-10-23'))
    expect(c.status).toBe('ok')
    expect(c.dob).toBe('05/01/1990')
  })

  it('rejects one naming a different provider, and one past two years', async () => {
    findMany.mockResolvedValue([
      { id: 'e1', signedAt: new Date('2026-03-12'), signedFilePath: null, fieldValues: JSON.stringify({ recordsCustodian: 'Bay Ortho' }) },
    ])
    expect((await getHipaaCoverage('lead1', 'Harborview Imaging', new Date('2026-10-23'))).status).toBe('other_provider')
    expect((await getHipaaCoverage('lead1', 'Bay Ortho', new Date('2026-10-23'))).status).toBe('ok')
    expect((await getHipaaCoverage('lead1', 'Bay Ortho', new Date('2028-06-01'))).status).toBe('expired')
  })

  it('reports missing when nothing is signed', async () => {
    findMany.mockResolvedValue([])
    expect((await getHipaaCoverage('lead1', 'Bay Ortho')).status).toBe('missing')
  })
})

describe('getRepresentationStatus', () => {
  it('prefers a signed retainer, then an attestation', async () => {
    const env = prisma.documentEnvelope.findFirst as unknown as ReturnType<typeof vi.fn>
    const att = (prisma as any).representationAttestation.findFirst as ReturnType<typeof vi.fn>
    env.mockResolvedValueOnce({ signedAt: new Date('2026-03-10') })
    att.mockResolvedValueOnce(null)
    expect((await getRepresentationStatus('lead1')).basis).toBe('signed_retainer')

    env.mockResolvedValueOnce(null)
    att.mockResolvedValueOnce({ id: 'r1', attorneyName: 'Dana Hinton', engagementDate: new Date('2026-03-05'), attestedByEmail: 'd@h.law', createdAt: new Date() })
    const attested = await getRepresentationStatus('lead1')
    expect(attested).toMatchObject({ verified: true, basis: 'attested' })

    env.mockResolvedValueOnce(null)
    att.mockResolvedValueOnce(null)
    expect((await getRepresentationStatus('lead1')).verified).toBe(false)
  })
})
