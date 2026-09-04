import { beforeEach, describe, expect, it, vi } from 'vitest'

const esign = vi.hoisted(() => ({ isESignatureConfigured: vi.fn(() => true) }))
const service = vi.hoisted(() => ({
  OPEN_ENVELOPE_STATUSES: ['draft', 'sent', 'viewed'] as const,
  syncEnvelopeStatus: vi.fn(async () => false),
}))

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./esign', () => esign)
vi.mock('./esign/esign-service', () => service)

import { prisma } from './prisma'
import { runEsignEnvelopeSweep } from './esign-envelope-sweep'

const envelope = (over: Record<string, unknown> = {}) => ({
  id: 'env-1',
  leadId: 'lead-1',
  provider: 'dropbox_sign',
  status: 'sent',
  externalEnvelopeId: 'ext-1',
  documentType: 'retainer',
  createdAt: new Date(),
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  esign.isESignatureConfigured.mockReturnValue(true)
  service.syncEnvelopeStatus.mockResolvedValue(false)
})

describe('runEsignEnvelopeSweep', () => {
  it('does nothing when no provider is configured', async () => {
    esign.isESignatureConfigured.mockReturnValue(false)
    const result = await runEsignEnvelopeSweep()
    expect(result).toEqual({ scanned: 0, advanced: 0, signed: 0, skipped: true })
    expect(service.syncEnvelopeStatus).not.toHaveBeenCalled()
  })

  it('polls every open envelope and reports the ones that did not move', async () => {
    vi.mocked(prisma.documentEnvelope.findMany).mockResolvedValue([
      envelope(),
      envelope({ id: 'env-2' }),
    ] as any)

    const result = await runEsignEnvelopeSweep()

    expect(service.syncEnvelopeStatus).toHaveBeenCalledTimes(2)
    expect(result.scanned).toBe(2)
    expect(result.advanced).toBe(0)
    expect(result.signed).toBe(0)
  })

  // The case this sweep exists for: a retainer the client signed that the
  // webhook never told us about.
  it('counts an envelope that reconciled to signed', async () => {
    vi.mocked(prisma.documentEnvelope.findMany).mockResolvedValue([envelope()] as any)
    service.syncEnvelopeStatus.mockResolvedValue(true)
    vi.mocked(prisma.documentEnvelope.findUnique).mockResolvedValue({
      status: 'signed',
      documentType: 'retainer',
    } as any)

    const result = await runEsignEnvelopeSweep()

    expect(result).toMatchObject({ scanned: 1, advanced: 1, signed: 1, skipped: false })
  })

  it('counts a move to a non-signed status as advanced but not signed', async () => {
    vi.mocked(prisma.documentEnvelope.findMany).mockResolvedValue([envelope()] as any)
    service.syncEnvelopeStatus.mockResolvedValue(true)
    vi.mocked(prisma.documentEnvelope.findUnique).mockResolvedValue({
      status: 'viewed',
      documentType: 'retainer',
    } as any)

    const result = await runEsignEnvelopeSweep()

    expect(result).toMatchObject({ advanced: 1, signed: 0 })
  })

  it('selects only open envelopes that have been sent to a provider', async () => {
    vi.mocked(prisma.documentEnvelope.findMany).mockResolvedValue([] as any)

    await runEsignEnvelopeSweep()

    const where = vi.mocked(prisma.documentEnvelope.findMany).mock.calls[0]![0]!.where as any
    expect(where.status).toEqual({ in: ['draft', 'sent', 'viewed'] })
    expect(where.externalEnvelopeId).toEqual({ not: null })
    expect(where.createdAt.gte).toBeInstanceOf(Date)
  })
})
