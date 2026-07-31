import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  assertShareAuthorization,
  getShareAuthorization,
  recordShareAuthorization,
  withdrawShareAuthorization,
} from './share-authorization'
import { CONSENT_TEMPLATES } from './consent-templates'

function grantedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'consent-1',
    granted: true,
    grantedAt: new Date('2026-07-01T10:00:00Z'),
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date('2026-07-01T10:00:00Z'),
    metadata: JSON.stringify({ authorizedAttorneyIds: ['att-1', 'att-2'] }),
    ...overrides,
  }
}

describe('recordShareAuthorization', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('writes a versioned, hashed consent row for a guest with no account', async () => {
    const result = await recordShareAuthorization({
      assessmentId: 'asm-1',
      userId: null,
      attorneyIds: ['att-1', 'att-1', 'att-2'],
      context: 'case_submission',
      signatureMethod: 'clicked',
      ipAddress: '203.0.113.9',
      userAgent: 'Mozilla/5.0',
    })

    expect(result.recorded).toBe(true)
    const { data } = vi.mocked(prisma.consent.create).mock.calls[0][0] as any
    expect(data.userId).toBeNull()
    expect(data.assessmentId).toBe('asm-1')
    expect(data.consentType).toBe('attorney_share')
    expect(data.version).toBe(CONSENT_TEMPLATES.attorney_share.version)
    expect(data.documentId).toBe(CONSENT_TEMPLATES.attorney_share.documentId)
    expect(data.granted).toBe(true)
    expect(data.consentText).toBe(CONSENT_TEMPLATES.attorney_share.content)
    expect(data.consentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(data.ipAddress).toBe('203.0.113.9')
    // Deduplicated, because the covered set is what a later wave is checked against.
    expect(JSON.parse(data.metadata).authorizedAttorneyIds).toEqual(['att-1', 'att-2'])
  })

  it('audits the grant so the row is not the only evidence of it', async () => {
    await recordShareAuthorization({
      assessmentId: 'asm-1',
      userId: 'user-1',
      attorneyIds: ['att-1'],
      context: 'batch_approval',
    })

    const { data } = vi.mocked(prisma.auditLog.create).mock.calls[0][0] as any
    expect(data.action).toBe('consent_share_authorization_granted')
    expect(data.entityType).toBe('assessment')
    expect(data.entityId).toBe('asm-1')
    expect(JSON.parse(data.metadata).context).toBe('batch_approval')
  })

  it('reports failure instead of throwing, so a submission is never lost to an audit write', async () => {
    vi.mocked(prisma.consent.create).mockRejectedValue(new Error('db down'))

    const result = await recordShareAuthorization({
      assessmentId: 'asm-1',
      attorneyIds: ['att-1'],
      context: 'case_submission',
    })

    expect(result.recorded).toBe(false)
  })
})

describe('getShareAuthorization', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('reads the covered firms from the audited table', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([grantedRow()] as any)

    const authorization = await getShareAuthorization('asm-1')

    expect(authorization.authorized).toBe(true)
    expect(authorization.basis).toBe('consent_record')
    expect(authorization.authorizedAttorneyIds).toEqual(['att-1', 'att-2'])
  })

  it('unions the firms across successive authorizations', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([
      grantedRow({ id: 'consent-2', metadata: JSON.stringify({ authorizedAttorneyIds: ['att-5'] }) }),
      grantedRow(),
    ] as any)

    const authorization = await getShareAuthorization('asm-1')

    expect(authorization.authorizedAttorneyIds).toEqual(['att-5', 'att-1', 'att-2'])
  })

  it('treats a withdrawal as decisive regardless of a later grant', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([
      grantedRow({ id: 'consent-2', granted: false, revokedAt: new Date('2026-07-05T09:00:00Z') }),
      grantedRow(),
    ] as any)

    const authorization = await getShareAuthorization('asm-1')

    expect(authorization.authorized).toBe(false)
    expect(authorization.withdrawnAt).toEqual(new Date('2026-07-05T09:00:00Z'))
  })

  it('ignores an expired authorization', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([
      grantedRow({ expiresAt: new Date('2026-01-01T00:00:00Z') }),
    ] as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: null,
      facts: '{}',
    } as any)

    const authorization = await getShareAuthorization('asm-1')

    expect(authorization.authorized).toBe(false)
  })

  it('is not authorized when nothing exists in either place', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: null,
      facts: JSON.stringify({ consents: { tos: true, privacy: true, hipaa: true } }),
    } as any)

    const authorization = await getShareAuthorization('asm-1')

    // Accepting terms, privacy and HIPAA is not permission to disclose the case:
    // all three are accepted before the consumer has seen a single attorney.
    expect(authorization.authorized).toBe(false)
    expect(authorization.basis).toBe('none')
  })

  it('accepts the pre-table authorization and migrates it into the table', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      userId: 'user-7',
      facts: JSON.stringify({
        consents: {
          attorneyShare: {
            authorized: true,
            authorizedAt: '2026-06-01T12:00:00.000Z',
            disclosureVersion: '1.0',
            authorizedAttorneyIds: ['att-3'],
          },
        },
      }),
    } as any)

    const authorization = await getShareAuthorization('asm-1')

    expect(authorization.authorized).toBe(true)
    expect(authorization.basis).toBe('legacy_facts')
    expect(authorization.authorizedAttorneyIds).toEqual(['att-3'])
    const { data } = vi.mocked(prisma.consent.create).mock.calls[0][0] as any
    expect(data.assessmentId).toBe('asm-1')
    expect(JSON.parse(data.metadata).migratedFrom).toBe('facts.consents.attorneyShare')
  })
})

describe('withdrawShareAuthorization', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('revokes every live authorization on the case', async () => {
    vi.mocked(prisma.consent.updateMany).mockResolvedValue({ count: 2 } as any)

    const result = await withdrawShareAuthorization({ assessmentId: 'asm-1', reason: 'changed my mind' })

    expect(result.withdrawn).toBe(2)
    const call = vi.mocked(prisma.consent.updateMany).mock.calls[0][0] as any
    expect(call.where).toMatchObject({ assessmentId: 'asm-1', granted: true, revokedAt: null })
    expect(call.data.granted).toBe(false)
    expect(call.data.revokedAt).toBeInstanceOf(Date)
    expect(prisma.consent.create).not.toHaveBeenCalled()
  })

  it('writes a tombstone when the only authorization was the legacy fact', async () => {
    vi.mocked(prisma.consent.updateMany).mockResolvedValue({ count: 0 } as any)

    await withdrawShareAuthorization({ assessmentId: 'asm-1' })

    // Without this the legacy reader would migrate the fact straight back into a
    // live grant and the withdrawal would silently undo itself.
    const { data } = vi.mocked(prisma.consent.create).mock.calls[0][0] as any
    expect(data.granted).toBe(false)
    expect(data.revokedAt).toBeInstanceOf(Date)
  })
})

describe('assertShareAuthorization', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('allows the firms the authorization names', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([grantedRow()] as any)

    const result = await assertShareAuthorization('asm-1', ['att-2'])

    expect(result.ok).toBe(true)
  })

  it('refuses a firm the consumer never authorized', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([grantedRow()] as any)

    const result = await assertShareAuthorization('asm-1', ['att-2', 'att-99'])

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/has not authorized/i)
  })

  it('asks only whether the case may be shared when no firm is named', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([grantedRow()] as any)

    const result = await assertShareAuthorization('asm-1')

    expect(result.ok).toBe(true)
  })

  it('does not block a case whose authorization predates the covered-firm metadata', async () => {
    vi.mocked(prisma.consent.findMany).mockResolvedValue([grantedRow({ metadata: null })] as any)

    const result = await assertShareAuthorization('asm-1', ['att-42'])

    expect(result.ok).toBe(true)
  })
})
