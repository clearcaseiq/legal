/**
 * The case factory.
 *
 * Each assertion here corresponds to a record whose absence made an
 * attorney-created case invisible or wrong. They are written as "this row is
 * written, with these fields" rather than against behaviour further downstream,
 * because the downstream readers are 33 separate queries and the contract
 * between them is precisely this row shape.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

const assignReferenceCode = vi.fn()
const ensureAssessmentPrediction = vi.fn()

vi.mock('./case-reference', () => ({ assignReferenceCode: () => assignReferenceCode() }))
vi.mock('./prediction-materializer', () => ({
  ensureAssessmentPrediction: (id: string) => ensureAssessmentPrediction(id),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { ENGAGED_LEAD_STATUSES } from './lead-status'
import {
  ATTORNEY_SELF_SOURCE,
  createAttorneyOwnedCase,
  finalizeAttorneyCases,
  findExistingImportedCase,
  importOwnerKeyFor,
  isAttorneyOwnedCase,
} from './attorney-case-factory'

const INPUT = {
  claimType: 'auto',
  venueState: 'CA',
  incidentDate: '2026-03-04',
  narrative: 'Rear-ended at a stoplight.',
  plaintiffFirstName: 'Dana',
  plaintiffLastName: 'Reyes',
  plaintiffEmail: 'dana@example.com',
}

const OWNER = { attorneyId: 'att-1', lawFirmId: 'firm-1', createdByUserId: 'user-9' }

function leadCreateArg() {
  return vi.mocked(prisma.leadSubmission.create).mock.calls[0]?.[0] as any
}

function assessmentCreateArg() {
  return vi.mocked(prisma.assessment.create).mock.calls[0]?.[0] as any
}

/** A stand-in for the transaction client a bulk import passes in. */
function txClient() {
  return {
    assessment: { create: vi.fn().mockResolvedValue({ id: 'asm-tx' }), update: vi.fn() },
    user: { create: vi.fn().mockResolvedValue({ id: 'shadow-tx' }) },
    leadSubmission: { create: vi.fn() },
  } as any
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  assignReferenceCode.mockResolvedValue('CCIQ-7Q2K9F')
  ensureAssessmentPrediction.mockResolvedValue(true)
  vi.mocked(prisma.assessment.create).mockResolvedValue({ id: 'asm-new' } as any)
  vi.mocked(prisma.user.create).mockResolvedValue({ id: 'shadow-1' } as any)
  // The universal mock returns the callback's own result for $transaction.
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma))
})

describe('createAttorneyOwnedCase', () => {
  /**
   * The defect the whole module exists for: every attorney read is rooted at
   * LeadSubmission, and the previous helper never wrote one.
   */
  it('writes the LeadSubmission that makes the case visible to its attorney', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(prisma.leadSubmission.create).toHaveBeenCalledOnce()
    expect(leadCreateArg().data).toMatchObject({
      assessmentId: 'asm-new',
      assignedAttorneyId: 'att-1',
      sourceType: ATTORNEY_SELF_SOURCE,
    })
  })

  /**
   * Without the ownership claim the routing engine treats the case as an
   * available marketplace lead — which would offer the attorney's own client
   * to a competing firm.
   */
  it('claims the case exclusively so it can never be routed', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(leadCreateArg().data).toMatchObject({
      assignmentType: 'exclusive',
      isExclusive: true,
      routingLocked: true,
      status: 'accepted',
      lifecycleState: 'attorney_engaged',
    })
  })

  /**
   * The link that unlocks the workspace, and the reason no separate
   * "self-managed render mode" is needed.
   *
   * A lead the attorney has merely been offered is anonymised and inert — no
   * scheduling, messaging or document work, and the client's name masked back
   * at them. That rule is keyed on the status being one of ENGAGED_LEAD_STATUSES.
   * A case the attorney already owns has to start life inside that set, or the
   * product would de-identify a firm's own client to the firm and refuse to let
   * them work the case.
   */
  it('starts in an engaged status, so the workspace is usable and the client is not masked', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(ENGAGED_LEAD_STATUSES).toContain(leadCreateArg().data.status)
  })

  it('completes the assessment rather than leaving it DRAFT', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    // The admin routing queue, the ops inbox and every analytics aggregate
    // filter on COMPLETED, so DRAFT is invisible to operations too.
    expect(assessmentCreateArg().data).toMatchObject({ status: 'COMPLETED', lawFirmId: 'firm-1' })
  })

  it('gives the case an owner so documents have somewhere to attach', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    // EvidenceFile.userId is non-nullable, so a case with no owner cannot hold
    // a single document.
    const userArg = vi.mocked(prisma.user.create).mock.calls[0]?.[0] as any
    expect(userArg.data.email).toBe('guest+asm-new@caseiq.local')
    expect(prisma.assessment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 'shadow-1' } }),
    )
  })

  it('records the incident date it was given rather than defaulting to today', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    // The SOL clock runs from this date. The old helper defaulted it to today,
    // silently giving every imported case a deadline it has not got.
    expect(assessmentCreateArg().data.facts).toContain('2026-03-04')
  })

  it('scores an unassessed case at even odds, not at zero', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    // Zero reads as "we evaluated this and it is worthless" everywhere the
    // number is displayed. These are priors, not findings.
    expect(leadCreateArg().data).toMatchObject({
      viabilityScore: 0.5,
      liabilityScore: 0.5,
      damagesScore: 0.5,
    })
  })

  it('values the case so money figures do not render as $0', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(ensureAssessmentPrediction).toHaveBeenCalledWith('asm-new')
  })

  it('mints a reference code support can quote', async () => {
    const result = await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(result).toEqual({ assessmentId: 'asm-new', referenceCode: 'CCIQ-7Q2K9F' })
  })

  it('still returns the case when valuation fails', async () => {
    // The materializer sits outside the transaction precisely so this is
    // survivable; it retries on the next read.
    ensureAssessmentPrediction.mockRejectedValue(new Error('ml service down'))

    await expect(createAttorneyOwnedCase(INPUT, OWNER, 'manual')).resolves.toMatchObject({
      assessmentId: 'asm-new',
    })
  })

  it('marks provenance on the facts so consent gates can exempt the case', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'import')

    const facts = assessmentCreateArg().data.facts
    expect(facts).toContain(ATTORNEY_SELF_SOURCE)
    expect(facts).toContain('"origin":"import"')
  })

  it('records consents as false rather than implying an authorization', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'import')

    // The claimant has agreed to nothing with us and never will. The
    // provenance flag is what stops readers treating that as a defect; the
    // flags themselves must stay honest.
    expect(assessmentCreateArg().data.facts).toContain('"hipaa":false')
  })

  it('joins an ambient transaction when one is supplied', async () => {
    const result = await createAttorneyOwnedCase(INPUT, OWNER, 'import', txClient())

    // A bulk import commits many cases as one unit; opening a nested
    // transaction per row would defeat that.
    expect(result.assessmentId).toBe('asm-tx')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  /**
   * The contract for batch callers. Minting a reference code here would write
   * it through the global client, outside the caller's transaction, and leave
   * a code stranded on a case that then rolled away.
   */
  it('defers the reference code and valuation to the caller when batching', async () => {
    const result = await createAttorneyOwnedCase(INPUT, OWNER, 'import', txClient())

    expect(result.referenceCode).toBeNull()
    expect(assignReferenceCode).not.toHaveBeenCalled()
    expect(ensureAssessmentPrediction).not.toHaveBeenCalled()
  })
})

describe('finalizeAttorneyCases', () => {
  it('codes and values every case the batch committed', async () => {
    const codes = await finalizeAttorneyCases(['asm-1', 'asm-2'])

    expect(codes).toEqual(['CCIQ-7Q2K9F', 'CCIQ-7Q2K9F'])
    expect(ensureAssessmentPrediction).toHaveBeenCalledTimes(2)
  })

  it('keeps going when one case cannot be valued', async () => {
    // Neither step is fatal: both self-heal on the next read, and one bad row
    // must not leave the rest of a committed import uncoded.
    ensureAssessmentPrediction.mockRejectedValueOnce(new Error('ml service down'))

    await expect(finalizeAttorneyCases(['asm-1', 'asm-2'])).resolves.toHaveLength(2)
    expect(ensureAssessmentPrediction).toHaveBeenCalledTimes(2)
  })
})

describe('import identity', () => {
  it('scopes the dedupe key to the firm', () => {
    // Two firms exporting from their own Clio instances will collide on matter
    // numbers as low as "1", so the same external id from different firms has
    // to be two different cases.
    expect(importOwnerKeyFor({ attorneyId: 'att-1', lawFirmId: 'firm-1' })).toBe('firm-1')
    expect(importOwnerKeyFor({ attorneyId: 'att-2', lawFirmId: 'firm-1' })).toBe('firm-1')
  })

  it('falls back to the attorney for a solo with no firm', () => {
    // Postgres treats NULLs as distinct in a unique index, so leaving this
    // null would quietly disable dedupe and let a solo attorney duplicate
    // their whole caseload on every re-upload.
    expect(importOwnerKeyFor({ attorneyId: 'att-9', lawFirmId: null })).toBe('attorney:att-9')
  })

  it('writes the import columns so the unique index can see them', async () => {
    await createAttorneyOwnedCase(
      { ...INPUT, importSource: 'clio', externalId: 'MATTER-42' },
      OWNER,
      'import',
    )

    expect(assessmentCreateArg().data).toMatchObject({
      importSource: 'clio',
      importExternalId: 'MATTER-42',
      importOwnerKey: 'firm-1',
    })
  })

  it('leaves the import columns null for a hand-created case', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    const data = assessmentCreateArg().data
    // The unique index does not constrain NULLs, so ordinary cases must not
    // carry a partial key that would collide with each other.
    expect(data.importSource).toBeUndefined()
    expect(data.importOwnerKey).toBeUndefined()
  })

  it('does not write a partial key when the row has no external id', async () => {
    await createAttorneyOwnedCase({ ...INPUT, importSource: 'spreadsheet' }, OWNER, 'import')

    // A half-written key would make the row look importable but unmatchable,
    // and it would duplicate on the next upload.
    expect(assessmentCreateArg().data.importSource).toBeUndefined()
  })

  it('treats a row with no external id as always new', async () => {
    expect(await findExistingImportedCase({ importSource: 'clio' }, OWNER)).toBeNull()
    // Guessing at identity from names and dates would silently merge two
    // different clients, which is worse than importing a duplicate.
    expect(prisma.assessment.findFirst).not.toHaveBeenCalled()
  })

  it('matches an external id this firm has already imported', async () => {
    vi.mocked(prisma.assessment.findFirst).mockResolvedValue({ id: 'asm-existing' } as any)

    const found = await findExistingImportedCase(
      { importSource: 'clio', externalId: 'MATTER-42' },
      OWNER,
    )

    expect(found).toEqual({ id: 'asm-existing' })
    expect(vi.mocked(prisma.assessment.findFirst).mock.calls[0]?.[0]).toMatchObject({
      where: { importOwnerKey: 'firm-1', importSource: 'clio', importExternalId: 'MATTER-42' },
    })
  })
})

describe('mapped facts', () => {
  /**
   * The reason these go through applyFactPath rather than being written
   * directly: several facts keys exist twice under different names, and
   * different screens read different ones. A case with only the canonical key
   * shows the carrier on one screen and blank on the next.
   */
  it('writes every alias of a mapped key, not just the canonical one', async () => {
    await createAttorneyOwnedCase(
      { ...INPUT, factPaths: { 'insurance.defendant_carrier': 'Acme Mutual' } },
      OWNER,
      'import',
    )

    const facts = assessmentCreateArg().data.facts
    expect(facts).toContain('defendant_carrier')
    expect(facts).toContain('"carrier"')
    expect(facts).toContain('Acme Mutual')
  })

  it('mirrors the employer across the paths the wage-loss gap reads', async () => {
    await createAttorneyOwnedCase(
      { ...INPUT, factPaths: { 'caseAcceleration.wageLoss.employerName': 'Globex' } },
      OWNER,
      'import',
    )

    const facts = JSON.parse(assessmentCreateArg().data.facts)
    expect(facts.employment.employer).toBe('Globex')
    expect(facts.damages.employer).toBe('Globex')
  })

  it('ignores a path nothing reads rather than storing it loose', async () => {
    // A mis-mapped column must not be able to invent a facts key.
    await createAttorneyOwnedCase(
      { ...INPUT, factPaths: { 'not.a.real.path': 'whatever' } },
      OWNER,
      'import',
    )

    expect(assessmentCreateArg().data.facts).not.toContain('whatever')
  })

  it('leaves a key untouched when the column was blank', async () => {
    await createAttorneyOwnedCase(
      { ...INPUT, factPaths: { 'insurance.claim_number': '' } },
      OWNER,
      'import',
    )

    expect(assessmentCreateArg().data.facts).not.toContain('claim_number')
  })

  /**
   * The medical figures are what the valuation multiplies, and the mirror
   * matters as much as the key: `case-recalculation` reads `intake_med_charges`
   * and would overwrite a value written only to `med_charges`.
   */
  it('mirrors medical specials into the key the recalculation reads', async () => {
    await createAttorneyOwnedCase(
      { ...INPUT, factPaths: { 'damages.med_charges': '48250', 'damages.wage_loss': '9500' } },
      OWNER,
      'import',
    )

    const facts = JSON.parse(assessmentCreateArg().data.facts)
    expect(facts.damages.med_charges).toBe(48250)
    expect(facts.damages.intake_med_charges).toBe(48250)
    expect(facts.damages.wage_loss).toBe(9500)
    expect(facts.damages.intake_wage_loss).toBe(9500)
  })

  /**
   * Every downstream reader does `Number(damages.med_charges)`. Stored as the
   * string a spreadsheet actually contains, that is NaN, and a fully-filled
   * export valued the same as an empty one.
   */
  it('parses a currency-formatted cell into a number', async () => {
    await createAttorneyOwnedCase(
      { ...INPUT, factPaths: { 'damages.med_charges': '$48,250.00' } },
      OWNER,
      'import',
    )

    expect(JSON.parse(assessmentCreateArg().data.facts).damages.med_charges).toBe(48250)
  })

  it('drops a cell that is not the type the key expects', async () => {
    // "pending" in a specials column must leave the key absent, not store a
    // string the valuation will read as NaN.
    await createAttorneyOwnedCase(
      { ...INPUT, factPaths: { 'damages.med_charges': 'pending' } },
      OWNER,
      'import',
    )

    expect(JSON.parse(assessmentCreateArg().data.facts).damages.med_charges).toBeUndefined()
  })
})

describe('injuries', () => {
  /**
   * The underwriting engine classifies the primary injury from
   * `facts.injuries[].diagnoses`. An empty list pins the case to the lowest
   * severity tier however large the medical specials are, which is most of
   * why imported cases all valued the same.
   */
  it('records diagnoses where the valuation looks for them', async () => {
    await createAttorneyOwnedCase(
      { ...INPUT, injuryDiagnoses: ['L4-L5 herniation', 'concussion'] },
      OWNER,
      'import',
    )

    const facts = JSON.parse(assessmentCreateArg().data.facts)
    expect(facts.injuries).toEqual([{ diagnoses: ['L4-L5 herniation', 'concussion'] }])
  })

  it('leaves the list empty when the import carried no injury column', async () => {
    // Empty, not a placeholder entry: an unnamed injury would earn
    // documentation credit the case has not got.
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(JSON.parse(assessmentCreateArg().data.facts).injuries).toEqual([])
  })
})

describe('isAttorneyOwnedCase', () => {
  it('recognises a case the attorney brought with them', () => {
    expect(isAttorneyOwnedCase({ origin: { kind: ATTORNEY_SELF_SOURCE } })).toBe(true)
  })

  it('does not claim an ordinary routed case', () => {
    expect(isAttorneyOwnedCase({ plaintiffContext: {} })).toBe(false)
    expect(isAttorneyOwnedCase({ origin: { kind: 'plaintiff' } })).toBe(false)
    expect(isAttorneyOwnedCase(null)).toBe(false)
    expect(isAttorneyOwnedCase('not an object')).toBe(false)
  })
})
