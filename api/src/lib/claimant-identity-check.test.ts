import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  checkDocumentIdentity,
  claimantNameForAssessment,
  compareToClaimant,
  nameTokens,
  parseIdentityCheck,
} from './claimant-identity-check'

/** An assessment shaped the way `claimantNameForAssessment` selects it. */
const assessment = (overrides: {
  firstName?: string
  lastName?: string
  facts?: string | null
  userFirstName?: string | null
  userLastName?: string | null
}) => ({
  facts:
    overrides.facts !== undefined
      ? overrides.facts
      : JSON.stringify({
          plaintiffContext: {
            firstName: overrides.firstName ?? 'Dana',
            lastName: overrides.lastName ?? 'Reyes',
          },
        }),
  user: {
    firstName: overrides.userFirstName ?? null,
    lastName: overrides.userLastName ?? null,
  },
})

const onCase = (row: ReturnType<typeof assessment> | null) => {
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue(row as any)
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
})

describe('breaking a name into comparable parts', () => {
  it('drops credentials and suffixes that unrelated people share', () => {
    expect(nameTokens('Dana Reyes, MD')).toEqual(['dana', 'reyes'])
    expect(nameTokens('Mr. Peter Okafor Jr')).toEqual(['peter', 'okafor'])
  })

  it('drops single letters so a middle initial is never the only thing in common', () => {
    expect(nameTokens('John A Doe')).toEqual(['john', 'doe'])
    expect(compareToClaimant('John A Doe', 'Mary A Smith')).toBe('mismatch')
  })

  it('has nothing to compare when a name is punctuation or empty', () => {
    expect(nameTokens('   ')).toEqual([])
    expect(nameTokens(null)).toEqual([])
  })
})

describe('comparing a document name to the claimant', () => {
  it('flags a document belonging to an entirely different person', () => {
    expect(compareToClaimant('Peter Okafor', 'Dana Reyes')).toBe('mismatch')
  })

  it('accepts a maiden or married surname, the common legitimate difference', () => {
    expect(compareToClaimant('Jane Doe', 'Jane Smith')).toBe('match')
  })

  it('accepts a nickname against the recorded first name', () => {
    expect(compareToClaimant('Bob Jones', 'Robert Jones')).toBe('match')
  })

  it('ignores case, punctuation and "Last, First" ordering', () => {
    expect(compareToClaimant('REYES, DANA', 'Dana Reyes')).toBe('match')
  })

  /**
   * The documented miss. Two people in one household share a surname, so this
   * check cannot separate them — accepted so that maiden-name warnings do not
   * train attorneys to dismiss the flag unread.
   */
  it('does not separate two people who share a surname', () => {
    expect(compareToClaimant('Mary Smith', 'John Smith')).toBe('match')
  })

  it('reaches no verdict when either side is unreadable', () => {
    expect(compareToClaimant(null, 'Dana Reyes')).toBeNull()
    expect(compareToClaimant('Dana Reyes', '')).toBeNull()
  })
})

describe('finding the claimant a case belongs to', () => {
  it('prefers the name recorded in facts', async () => {
    onCase(assessment({ firstName: 'Dana', lastName: 'Reyes', userFirstName: 'Guest' }))
    await expect(claimantNameForAssessment('asm-1')).resolves.toBe('Dana Reyes')
  })

  it('falls back to the owning user when facts carry no name', async () => {
    onCase(assessment({ facts: null, userFirstName: 'Dana', userLastName: 'Reyes' }))
    await expect(claimantNameForAssessment('asm-1')).resolves.toBe('Dana Reyes')
  })

  it('returns nothing rather than throwing when facts will not parse', async () => {
    onCase(assessment({ facts: '{not json' }))
    await expect(claimantNameForAssessment('asm-1')).resolves.toBeNull()
  })

  it('returns nothing for a case that no longer exists', async () => {
    onCase(null)
    await expect(claimantNameForAssessment('gone')).resolves.toBeNull()
  })
})

describe('the verdict stored against a processed document', () => {
  it('records a mismatch with both names, so the attorney can see the conflict', async () => {
    onCase(assessment({}))
    const result = await checkDocumentIdentity({
      assessmentId: 'asm-1',
      category: 'medical_records',
      documentName: 'Peter Okafor',
    })
    expect(result).toMatchObject({
      verdict: 'mismatch',
      documentName: 'Peter Okafor',
      claimantName: 'Dana Reyes',
    })
  })

  it('records the match too, so a checked document is distinguishable from an unchecked one', async () => {
    onCase(assessment({}))
    const result = await checkDocumentIdentity({
      assessmentId: 'asm-1',
      category: 'bills',
      documentName: 'Dana Reyes',
    })
    expect(result?.verdict).toBe('match')
  })

  it('skips categories that legitimately name more than one person', async () => {
    onCase(assessment({}))
    await expect(
      checkDocumentIdentity({
        assessmentId: 'asm-1',
        category: 'police_report',
        documentName: 'Peter Okafor',
      }),
    ).resolves.toBeNull()
    expect(prisma.assessment.findUnique).not.toHaveBeenCalled()
  })

  it('skips a document with no name on it rather than reading the case', async () => {
    await expect(
      checkDocumentIdentity({
        assessmentId: 'asm-1',
        category: 'medical_records',
        documentName: null,
      }),
    ).resolves.toBeNull()
    expect(prisma.assessment.findUnique).not.toHaveBeenCalled()
  })

  it('skips an upload that is not attached to a case', async () => {
    await expect(
      checkDocumentIdentity({
        assessmentId: null,
        category: 'medical_records',
        documentName: 'Peter Okafor',
      }),
    ).resolves.toBeNull()
  })

  it('reaches no verdict when the case has no claimant name to compare against', async () => {
    onCase(assessment({ facts: null }))
    await expect(
      checkDocumentIdentity({
        assessmentId: 'asm-1',
        category: 'medical_records',
        documentName: 'Peter Okafor',
      }),
    ).resolves.toBeNull()
  })
})

describe('reading the stored column back', () => {
  it('round-trips a verdict', async () => {
    onCase(assessment({}))
    const written = await checkDocumentIdentity({
      assessmentId: 'asm-1',
      category: 'medical_records',
      documentName: 'Peter Okafor',
    })
    expect(parseIdentityCheck(JSON.stringify(written))?.verdict).toBe('mismatch')
  })

  it('tolerates null and unparseable values', () => {
    expect(parseIdentityCheck(null)).toBeNull()
    expect(parseIdentityCheck('{not json')).toBeNull()
    expect(parseIdentityCheck(JSON.stringify({ verdict: 'maybe' }))).toBeNull()
  })
})
