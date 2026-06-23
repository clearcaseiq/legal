/**
 * Outbound export orchestration: maps a case, enforces compliance gates
 * (ethical walls + HIPAA consent), pushes contact -> matter -> documents to the
 * CMS connector, and records a CmsSyncLog row per step plus an AuditLog entry.
 */
import { createHash } from 'crypto'
import { prisma } from '../prisma'
import { logger } from '../logger'
import { buildAuthContext, getConnection, getValidAccessToken } from './connections'
import { getConnector } from './registry'
import {
  buildContactInput,
  buildDocumentInputs,
  buildMatterInput,
  loadCaseForExport,
} from './mapping'

export class EthicalWallBlockedError extends Error {
  constructor() {
    super('An ethical wall blocks this attorney from accessing the case')
    this.name = 'EthicalWallBlockedError'
  }
}

export interface ExportResult {
  connectionId: string
  assessmentId: string
  contactExternalId?: string
  matterExternalId?: string
  documents: { evidenceId: string; externalId?: string; status: 'success' | 'skipped' | 'error'; reason?: string }[]
  skippedReasons: string[]
}

function hash(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

async function alreadyExported(
  connectionId: string,
  assessmentId: string,
  operation: string,
  payloadHash: string
): Promise<string | null> {
  const prior = await prisma.cmsSyncLog.findFirst({
    where: { connectionId, assessmentId, operation, status: 'success', payloadHash },
    orderBy: { createdAt: 'desc' },
  })
  return prior?.externalId ?? null
}

async function log(args: {
  connectionId: string
  assessmentId: string
  operation: string
  status: 'success' | 'error' | 'skipped'
  direction?: 'outbound' | 'inbound'
  externalType?: string
  externalId?: string | null
  message?: string | null
  payloadHash?: string | null
}) {
  await prisma.cmsSyncLog.create({
    data: {
      connectionId: args.connectionId,
      assessmentId: args.assessmentId,
      direction: args.direction ?? 'outbound',
      operation: args.operation,
      status: args.status,
      externalType: args.externalType ?? null,
      externalId: args.externalId ?? null,
      message: args.message ?? null,
      payloadHash: args.payloadHash ?? null,
    },
  })
}

/** Whether the plaintiff has a granted, un-revoked consent of the given type. */
async function hasConsent(userId: string | null, consentType: string): Promise<boolean> {
  if (!userId) return false
  const c = await prisma.consent.findFirst({
    where: { userId, consentType, granted: true, revokedAt: null },
  })
  return Boolean(c)
}

export async function exportCaseToConnection(args: {
  connectionId: string
  assessmentId: string
  actorUserId?: string | null
  actorAttorneyId?: string | null
}): Promise<ExportResult> {
  const { connectionId, assessmentId } = args
  const connection = await getConnection(connectionId)
  if (!connection) throw new Error('CMS connection not found')

  const connector = getConnector(connection.provider)
  if (!connector) throw new Error(`Unknown CMS provider ${connection.provider}`)

  const result: ExportResult = {
    connectionId,
    assessmentId,
    documents: [],
    skippedReasons: [],
  }

  // --- Compliance gate 1: ethical wall ---
  if (connection.attorneyId) {
    const wall = await prisma.ethicalWall.findFirst({
      where: { assessmentId, blockedAttorneyId: connection.attorneyId },
    })
    if (wall) {
      await log({ connectionId, assessmentId, operation: 'export_case', status: 'skipped', message: 'ethical_wall' })
      throw new EthicalWallBlockedError()
    }
  }

  const caseData = await loadCaseForExport(assessmentId)
  if (!caseData) throw new Error('Assessment not found')

  // --- Compliance gate 2: HIPAA consent for medical evidence ---
  const hipaaConsent = await hasConsent(caseData.assessment.userId, 'hipaa')

  const fresh = await getValidAccessToken(connection)
  const auth = buildAuthContext(fresh)

  // 1) Contact
  const contactInput = buildContactInput(caseData)
  const contactHash = hash(JSON.stringify(contactInput))
  let contactExternalId = await alreadyExported(connectionId, assessmentId, 'upsert_contact', contactHash)
  if (!contactExternalId) {
    try {
      const c = await connector.upsertContact(auth, contactInput)
      contactExternalId = c.externalId
      await log({ connectionId, assessmentId, operation: 'upsert_contact', status: 'success', externalType: 'contact', externalId: c.externalId, payloadHash: contactHash })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await log({ connectionId, assessmentId, operation: 'upsert_contact', status: 'error', message })
      throw error
    }
  }
  result.contactExternalId = contactExternalId ?? undefined

  // 2) Matter
  const matterInput = buildMatterInput(caseData)
  const matterHash = hash(JSON.stringify(matterInput))
  let matterExternalId = await alreadyExported(connectionId, assessmentId, 'create_matter', matterHash)
  if (!matterExternalId) {
    try {
      const m = await connector.createMatter(auth, matterInput, contactExternalId ?? undefined)
      matterExternalId = m.externalId
      await log({ connectionId, assessmentId, operation: 'create_matter', status: 'success', externalType: 'matter', externalId: m.externalId, payloadHash: matterHash })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await log({ connectionId, assessmentId, operation: 'create_matter', status: 'error', message })
      throw error
    }
  }
  result.matterExternalId = matterExternalId ?? undefined

  // 3) Documents
  if (matterExternalId) {
    for (const doc of buildDocumentInputs(caseData)) {
      if (doc.isHIPAA && !hipaaConsent) {
        result.documents.push({ evidenceId: doc.evidenceId, status: 'skipped', reason: 'no_hipaa_consent' })
        await log({ connectionId, assessmentId, operation: 'upload_document', status: 'skipped', externalType: 'document', message: `hipaa_consent_missing:${doc.evidenceId}`, payloadHash: hash(doc.evidenceId) })
        continue
      }
      const docHash = hash(`${doc.evidenceId}:${matterExternalId}`)
      const prior = await alreadyExported(connectionId, assessmentId, 'upload_document', docHash)
      if (prior) {
        result.documents.push({ evidenceId: doc.evidenceId, externalId: prior, status: 'success' })
        continue
      }
      try {
        const d = await connector.uploadDocument(auth, matterExternalId, doc)
        result.documents.push({ evidenceId: doc.evidenceId, externalId: d.externalId, status: 'success' })
        await log({ connectionId, assessmentId, operation: 'upload_document', status: 'success', externalType: 'document', externalId: d.externalId, payloadHash: docHash })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        result.documents.push({ evidenceId: doc.evidenceId, status: 'error', reason: message })
        await log({ connectionId, assessmentId, operation: 'upload_document', status: 'error', externalType: 'document', message, payloadHash: docHash })
      }
    }
  }

  if (!hipaaConsent && caseData.evidence.some((e) => e.isHIPAA)) {
    result.skippedReasons.push('hipaa_documents_skipped_no_consent')
  }

  await prisma.cmsConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date(), status: 'connected', lastError: null },
  })

  await prisma.auditLog.create({
    data: {
      userId: args.actorUserId ?? null,
      attorneyId: args.actorAttorneyId ?? connection.attorneyId ?? null,
      action: 'cms_export',
      entityType: 'assessment',
      entityId: assessmentId,
      metadata: JSON.stringify({
        provider: connection.provider,
        connectionId,
        contactExternalId: result.contactExternalId,
        matterExternalId: result.matterExternalId,
        documents: result.documents.length,
        skipped: result.skippedReasons,
      }),
    },
  })

  return result
}

/**
 * Fire-and-forget export used by automated triggers (e.g. case acceptance).
 * Errors are swallowed/logged so they never block the originating action.
 */
export async function exportCaseToConnectionSafe(args: {
  connectionId: string
  assessmentId: string
  actorAttorneyId?: string | null
}): Promise<void> {
  try {
    await exportCaseToConnection(args)
  } catch (error) {
    logger.error('Automated CMS export failed', { error, ...args })
  }
}

/**
 * Exports a case to every connected CMS for the firm that owns the assessment.
 * Returns the connection ids it attempted.
 */
export async function exportCaseToFirmConnections(assessmentId: string): Promise<string[]> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { lawFirmId: true },
  })
  if (!assessment?.lawFirmId) return []
  const connections = await prisma.cmsConnection.findMany({
    where: { lawFirmId: assessment.lawFirmId, status: 'connected' },
    select: { id: true },
  })
  for (const c of connections) {
    await exportCaseToConnectionSafe({ connectionId: c.id, assessmentId })
  }
  return connections.map((c) => c.id)
}
