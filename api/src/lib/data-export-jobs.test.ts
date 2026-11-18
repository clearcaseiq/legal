import { describe, expect, it, vi } from 'vitest'
import {
  activeExportConsent,
  createHmacSignature,
  dataExportView,
  ensureWebhookEventId,
  sanitizeExportRecord,
  validatePublicWebhookUrl,
} from './data-export-jobs'

describe('secure data exports', () => {
  it('signs the timestamp, event id, and exact body', () => {
    const signature = createHmacSignature('secret', '1700000000', 'event-1', '{"ok":true}')
    expect(signature).toBe('926e97c8075c2296975cc2f8b24d235f608c0560d94e40a68e347ebbb4773a96')
    expect(createHmacSignature('secret', '1700000000', 'event-2', '{"ok":true}')).not.toBe(signature)
    expect(createHmacSignature('secret', '1700000000', 'event-1', '{"ok":false}')).not.toBe(signature)
  })

  it('does not expose storage paths, request identities, or webhook secrets', () => {
    const view = dataExportView({
      id: 'run-1',
      kind: 'snapshot',
      status: 'ready',
      sinceCursor: null,
      cutoffCursor: 42,
      attempts: 1,
      error: null,
      rowCounts: '{"cases.jsonl":2}',
      reconciliation: '{"database_rows":2,"written_rows":2}',
      filePath: 'uploads/data-exports/firm/run-1.zip',
      fileSize: 123,
      contentHash: 'abc',
      expiresAt: new Date('2026-11-20T00:00:00Z'),
      webhookStatus: 'delivered',
      webhookSecret: 'encrypted-secret',
      requestedByUserId: 'user-1',
      createdAt: new Date('2026-11-18T00:00:00Z'),
      completedAt: new Date('2026-11-18T00:01:00Z'),
    })
    expect(view).not.toHaveProperty('filePath')
    expect(view).not.toHaveProperty('webhookSecret')
    expect(view).not.toHaveProperty('requestedByUserId')
    expect(view.reconciliation).toEqual({ database_rows: 2, written_rows: 2 })
  })

  it('rejects webhook targets that could reach local services', async () => {
    await expect(validatePublicWebhookUrl('http://example.com/hook')).resolves.toBe(false)
    await expect(validatePublicWebhookUrl('https://127.0.0.1/hook')).resolves.toBe(false)
    await expect(validatePublicWebhookUrl('https://user:pass@example.com/hook')).resolves.toBe(false)
    await expect(validatePublicWebhookUrl('https://[::1]/hook')).resolves.toBe(false)
  })

  it('removes credentials, public-link tokens, and internal storage paths from datasets', () => {
    expect(sanitizeExportRecord({
      id: 'row-1',
      contentHash: 'keep-checksum',
      secureToken: 'remove',
      filePath: 'uploads/private.pdf',
      nested: { refreshToken: 'remove', value: 'keep' },
    })).toEqual({
      id: 'row-1',
      contentHash: 'keep-checksum',
      nested: { value: 'keep' },
    })
  })

  it('honors explicit consent revocation and expiry', () => {
    expect(activeExportConsent({ granted: true, revokedAt: null, expiresAt: null })).toBe(true)
    expect(activeExportConsent({ granted: true, revokedAt: new Date(), expiresAt: null })).toBe(false)
    expect(activeExportConsent({ granted: true, revokedAt: null, expiresAt: new Date(Date.now() - 1) })).toBe(false)
  })

  it('reuses one persisted webhook event id for every delivery attempt', async () => {
    const dataExportRun = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue({ webhookEventId: 'event-stable' }),
    }
    await expect(ensureWebhookEventId('run-1', null, { dataExportRun } as any)).resolves.toBe('event-stable')
    await expect(ensureWebhookEventId('run-1', 'event-stable', { dataExportRun } as any)).resolves.toBe('event-stable')
    expect(dataExportRun.updateMany).toHaveBeenCalledOnce()
  })
})
