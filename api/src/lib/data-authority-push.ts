/**
 * Push-on-change delivery for the data-authority feed.
 *
 * When a case changes, downstream systems shouldn't have to poll. For each of
 * the firm's connected integrations we:
 *   - webhook connections  → POST a compact, HMAC-signed change notification,
 *   - token connections    → trigger an idempotent CMS re-export.
 *
 * Everything here is best-effort: delivery failures are logged to CmsSyncLog
 * and swallowed. The canonical pull feed (GET /v1/sync/changes) remains the
 * source of truth a consumer can always reconcile against if a push is missed.
 */
import { createHmac } from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { readConfig } from './cms/connections'

const DELIVERY_TIMEOUT_MS = 8000

export type CaseChangePush = { assessmentId: string; revision: number; seq: number }

type NotificationPayload = {
  event: 'case.updated'
  assessment_id: string
  reference_code: string | null
  revision: number
  seq: number
  status: string
  changed_at: string
}

export async function pushCaseChange(change: CaseChangePush): Promise<void> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: change.assessmentId },
    select: { id: true, lawFirmId: true, referenceCode: true, status: true, updatedAt: true },
  })
  if (!assessment?.lawFirmId) return

  const connections = await prisma.cmsConnection.findMany({
    where: { lawFirmId: assessment.lawFirmId, status: 'connected' },
    select: { id: true, provider: true, authType: true, config: true },
  })
  if (connections.length === 0) return

  const payload: NotificationPayload = {
    event: 'case.updated',
    assessment_id: assessment.id,
    reference_code: assessment.referenceCode,
    revision: change.revision,
    seq: change.seq,
    status: assessment.status,
    changed_at: assessment.updatedAt.toISOString(),
  }

  for (const connection of connections) {
    if (connection.authType === 'webhook') {
      await deliverWebhook(connection.id, connection.config, payload).catch((error) =>
        logger.warn('Change webhook delivery failed', { connectionId: connection.id, error }),
      )
    } else {
      // Token-based CMS: re-export the case so the matter/documents stay current.
      // Idempotent (payloadHash-deduped) so repeated calls are cheap.
      const { exportCaseToConnectionSafe } = await import('./cms/export-service')
      void exportCaseToConnectionSafe({
        connectionId: connection.id,
        assessmentId: assessment.id,
      })
    }
  }
}

async function deliverWebhook(
  connectionId: string,
  rawConfig: string | null,
  payload: NotificationPayload,
): Promise<void> {
  const config = readConfig({ config: rawConfig })
  const url = typeof config.webhookUrl === 'string' ? config.webhookUrl : ''
  if (!url) return

  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'ClearCaseIQ-SyncPush/1',
    'x-cciq-event': payload.event,
    'x-cciq-revision': String(payload.revision),
  }
  if (typeof config.webhookSecret === 'string' && config.webhookSecret) {
    headers['x-cciq-signature'] = createHmac('sha256', config.webhookSecret).update(body).digest('hex')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)
  let status: 'success' | 'error' = 'success'
  let message: string | null = null
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal })
    if (!res.ok) {
      status = 'error'
      message = `HTTP ${res.status}`
    }
  } catch (error) {
    status = 'error'
    message = error instanceof Error ? error.message : String(error)
  } finally {
    clearTimeout(timer)
  }

  await prisma.cmsSyncLog
    .create({
      data: {
        connectionId,
        assessmentId: payload.assessment_id,
        direction: 'outbound',
        operation: 'change_notify',
        status,
        externalType: 'event',
        message,
        payloadHash: String(payload.seq),
      },
    })
    .catch(() => undefined)
}
