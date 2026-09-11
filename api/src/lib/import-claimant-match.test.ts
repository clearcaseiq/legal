import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  duplicateReason,
  indexActiveCasesByEmail,
  matchExistingClaimant,
  normalizeClaimantEmail,
  type ClaimantEmailIndex,
} from './import-claimant-match'

const OWNER = { attorneyId: 'att-1', lawFirmId: 'firm-1' }

/** A lead row shaped the way `indexActiveCasesByEmail` selects it. */
const lead = (overrides: {
  id?: string
  email?: string | null
  incidentDate?: string | null
  status?: string
  firstName?: string
  userEmail?: string
}) => ({
  assessment: {
    id: overrides.id ?? 'asm-1',
    status: overrides.status ?? 'ACTIVE',
    facts: JSON.stringify({
      incident: { date: overrides.incidentDate ?? '2024-03-04' },
      plaintiffContext: {
        firstName: overrides.firstName ?? 'Dana',
        lastName: 'Reyes',
        email: overrides.email === undefined ? 'dana@example.com' : overrides.email,
      },
    }),
    user: {
      email: overrides.userEmail ?? 'guest+asm-1@caseiq.local',
      firstName: 'Dana',
      lastName: 'Reyes',
    },
  },
})

const caseload = (rows: ReturnType<typeof lead>[]) => {
  vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue(rows as any)
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
})

describe('normalising an address', () => {
  it('lowercases and trims so case never causes a miss', () => {
    expect(normalizeClaimantEmail('  Dana@Example.COM ')).toBe('dana@example.com')
  })

  it('is no key at all when there is no address', () => {
    expect(normalizeClaimantEmail('')).toBeNull()
    expect(normalizeClaimantEmail(null)).toBeNull()
  })

  it('is no key when the column does not hold an address', () => {
    // A phone number in the email column should take the row out of matching,
    // not get it rejected.
    expect(normalizeClaimantEmail('555-0100')).toBeNull()
  })

  it('ignores the shadow address an imported case owns', () => {
    // Every imported case has one, so matching on it would make all of them
    // duplicates of each other.
    expect(normalizeClaimantEmail('guest+asm-1@caseiq.local')).toBeNull()
  })
})

describe('reading the caseload', () => {
  it('indexes an active case by the email in its facts', async () => {
    caseload([lead({})])

    const index = await indexActiveCasesByEmail(OWNER)

    expect(index.get('dana@example.com')).toEqual([
      {
        assessmentId: 'asm-1',
        email: 'dana@example.com',
        incidentDate: '2024-03-04',
        clientName: 'Dana Reyes',
      },
    ])
  })

  it('falls back to the owning account when the facts carry no email', async () => {
    // A case the claimant registered for themselves: the real address is on
    // the user row, not in the attorney-entered facts.
    caseload([lead({ email: null, userEmail: 'self@example.com' })])

    const index = await indexActiveCasesByEmail(OWNER)

    expect(index.has('self@example.com')).toBe(true)
  })

  it('leaves out a closed case', async () => {
    // Re-importing a client whose last matter is finished is what a returning
    // client looks like, not a duplicate.
    caseload([lead({ status: 'settled' })])

    expect(await indexActiveCasesByEmail(OWNER)).toEqual(new Map())
  })

  it('keeps two matters for the same client under one key', async () => {
    caseload([
      lead({ id: 'asm-1', incidentDate: '2024-03-04' }),
      lead({ id: 'asm-2', incidentDate: '2025-06-01' }),
    ])

    const index = await indexActiveCasesByEmail(OWNER)

    expect(index.get('dana@example.com')).toHaveLength(2)
  })

  it('skips a case whose facts will not parse rather than failing the import', async () => {
    caseload([{ assessment: { id: 'asm-1', status: 'ACTIVE', facts: 'not json', user: null } } as any])

    await expect(indexActiveCasesByEmail(OWNER)).resolves.toEqual(new Map())
  })

  it('asks only for cases this firm has engaged', async () => {
    caseload([])

    await indexActiveCasesByEmail(OWNER)

    const where = vi.mocked(prisma.leadSubmission.findMany).mock.calls[0][0]!.where as any
    expect(where.status.in).toContain('retained')
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { assignedAttorneyId: 'att-1' },
        { assignedAttorney: { lawFirmId: 'firm-1' } },
      ]),
    )
  })

  it('scopes a solo attorney to their own cases', async () => {
    caseload([])

    await indexActiveCasesByEmail({ attorneyId: 'att-1', lawFirmId: null })

    const where = vi.mocked(prisma.leadSubmission.findMany).mock.calls[0][0]!.where as any
    expect(where.OR).toEqual([{ assignedAttorneyId: 'att-1' }])
  })
})

describe('deciding what a row is', () => {
  const index: ClaimantEmailIndex = new Map([
    [
      'dana@example.com',
      [
        {
          assessmentId: 'asm-1',
          email: 'dana@example.com',
          incidentDate: '2024-03-04',
          clientName: 'Dana Reyes',
        },
      ],
    ],
  ])

  it('calls a row for a client we do not have new', () => {
    expect(matchExistingClaimant(index, 'sam@example.com', '2024-03-04')).toEqual({ kind: 'new' })
  })

  it('calls the same client and the same date of loss a duplicate', () => {
    // The accident this was written for: re-uploading a spreadsheet whose rows
    // carry no matter id used to create the whole caseload a second time.
    expect(matchExistingClaimant(index, 'dana@example.com', '2024-03-04')).toMatchObject({
      kind: 'duplicate',
      existing: { assessmentId: 'asm-1' },
    })
  })

  it('calls the same client with a different date of loss a second matter', () => {
    // A returning client with a new accident. Refusing this would be its own
    // bug, so it imports and is reported.
    expect(matchExistingClaimant(index, 'dana@example.com', '2025-06-01')).toMatchObject({
      kind: 'second_matter',
    })
  })

  it('matches regardless of the case the address was typed in', () => {
    expect(matchExistingClaimant(index, 'DANA@Example.com', '2024-03-04')).toMatchObject({
      kind: 'duplicate',
    })
  })

  it('calls a row with no email new, whatever else is on file', () => {
    // An address we do not have is not evidence of anything; the preview warns
    // about those rows on its own account.
    expect(matchExistingClaimant(index, '', '2024-03-04')).toEqual({ kind: 'new' })
  })
})

describe('what the attorney is told', () => {
  const existing = {
    assessmentId: 'asm-1',
    email: 'dana@example.com',
    incidentDate: '2024-03-04',
    clientName: 'Dana Reyes',
  }

  it('names the client and the date in a duplicate', () => {
    const reason = duplicateReason(existing, '2024-03-04')
    expect(reason).toContain('Dana Reyes')
    expect(reason).toContain('dana@example.com')
    expect(reason).toContain('2024-03-04')
  })
})
