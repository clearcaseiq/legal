/**
 * CMS integration routes (Phase 0–4).
 *
 *   GET    /v1/integrations/providers           list providers + config status
 *   GET    /v1/integrations/connections         list this firm's connections
 *   POST   /v1/integrations/connect/:provider   begin connect (OAuth url or creds)
 *   GET    /v1/integrations/callback/:provider   OAuth redirect target
 *   POST   /v1/integrations/connections         create credential connection (pat/partner/webhook)
 *   DELETE /v1/integrations/connections/:id      disconnect
 *   GET    /v1/integrations/connections/:id/logs recent sync log
 *   POST   /v1/integrations/export              manually export a case
 *   POST   /v1/integrations/webhooks/inbound/:provider  inbound status sync
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { ENV } from '../env'
import { webBaseUrl } from '../lib/app-url'
import {
  applyInboundMatterStatus,
  createCredentialConnection,
  disconnectConnection,
  exportCaseToConnection,
  EthicalWallBlockedError,
  getConnection,
  getConnector,
  inboundSyncEnabled,
  InboundSyncDisabledError,
  InboundSyncUnsupportedError,
  listConnections,
  listProviderMeta,
  readConfig,
  signCmsState,
  supportsInboundSync,
  syncConnectionInbound,
  upsertOAuthConnection,
  verifyCmsState,
} from '../lib/cms'
import { createSyncApiKey, parseSyncScopes, SYNC_SCOPES } from '../lib/sync-auth'
import { firmAllows, resolveFirmAccess } from '../lib/firm-access'
import {
  dataExportFile,
  dataExportView,
  enqueueDataExport,
  validatePublicWebhookUrl,
} from '../lib/data-export-jobs'

const router = Router()

/**
 * Resolve the acting user's firm + attorney identity.
 *
 * The firm must come from `resolveFirmAccess`, the same resolver the firm
 * dashboard uses: imported cases are stamped with this firm, and any other
 * answer files them under a firm whose caseload the importer never sees.
 */
async function getActorContext(req: AuthRequest): Promise<{
  lawFirmId: string | null
  attorneyId: string | null
  canManageIntegrations: boolean
}> {
  const access = await resolveFirmAccess(prisma as any, req.user).catch(() => null)
  const email = req.user?.email
  const attorney = email
    ? await prisma.attorney.findFirst({ where: { email }, select: { id: true } })
    : null
  return {
    lawFirmId: access?.lawFirmId ?? null,
    attorneyId: attorney?.id ?? access?.attorneyId ?? null,
    canManageIntegrations: Boolean(access && firmAllows(access, ['manage_users'])),
  }
}

function frontendRedirect(provider: string, status: 'success' | 'error', error?: string) {
  const url = new URL('/integrations', webBaseUrl())
  url.searchParams.set('cms_provider', provider)
  url.searchParams.set('cms_status', status)
  if (error) url.searchParams.set('cms_error', error)
  return url.toString()
}

// --- Providers --------------------------------------------------------------
router.get('/providers', authMiddleware, async (_req, res) => {
  res.json({ providers: listProviderMeta() })
})

router.get('/access', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  res.setHeader('Cache-Control', 'no-store')
  res.json({ lawFirmId, canManageIntegrations })
})

// --- Connections list -------------------------------------------------------
router.get('/connections', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId } = await getActorContext(req)
  if (!lawFirmId) return res.json({ connections: [] })
  const connections = await listConnections(lawFirmId)
  res.json({
    connections: connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      authType: c.authType,
      status: c.status,
      externalAccountEmail: c.externalAccountEmail,
      apiBaseUrl: c.apiBaseUrl,
      lastSyncedAt: c.lastSyncedAt,
      lastError: c.lastError,
      createdAt: c.createdAt,
      // Two different questions, and the UI needs both: whether this provider
      // can be read from at all, and whether this firm has turned it on. The
      // opt-in lives inside the config blob, which the client never sees.
      supportsInbound: supportsInboundSync(getConnector(c.provider)),
      inboundSyncEnabled: inboundSyncEnabled(safeConfig(c.config)),
    })),
  })
})

function safeConfig(text: string | null | undefined): Record<string, unknown> | null {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

// --- Begin connect ----------------------------------------------------------
const ConnectSchema = z.object({
  // For credential providers (pat/partner/webhook):
  apiBaseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  pat: z.string().optional(),
  webhookUrl: z.string().url().optional(),
})

router.post('/connect/:provider', authMiddleware, async (req: AuthRequest, res) => {
  const provider = req.params.provider
  const connector = getConnector(provider)
  if (!connector) return res.status(404).json({ error: 'Unknown provider' })

  const { lawFirmId, attorneyId, canManageIntegrations } = await getActorContext(req)
  if (!lawFirmId) return res.status(403).json({ error: 'No firm associated with this account' })
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })

  // OAuth providers return an authorize URL the client should open.
  if (connector.authType === 'oauth') {
    if (!connector.buildAuthorizeUrl) return res.status(400).json({ error: 'Provider missing OAuth support' })
    try {
      const state = signCmsState({ provider: connector.id, lawFirmId, attorneyId, userId: req.user?.id })
      return res.json({ mode: 'oauth', authorizeUrl: connector.buildAuthorizeUrl(state) })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'oauth_unavailable'
      return res.status(400).json({ error: message })
    }
  }

  // Credential providers create the connection inline.
  const parsed = ConnectSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const body = parsed.data

  try {
    let connection
    if (connector.authType === 'pat') {
      if (!body.pat) return res.status(400).json({ error: 'A Personal Access Token (pat) is required' })
      connection = await createCredentialConnection({
        provider: connector.id,
        authType: 'pat',
        lawFirmId,
        attorneyId,
        createdByUserId: req.user?.id,
        apiBaseUrl: body.apiBaseUrl,
        refreshSecret: body.pat,
      })
    } else if (connector.authType === 'partner') {
      if (!body.apiKey) return res.status(400).json({ error: 'An API key is required' })
      connection = await createCredentialConnection({
        provider: connector.id,
        authType: 'partner',
        lawFirmId,
        attorneyId,
        createdByUserId: req.user?.id,
        apiBaseUrl: body.apiBaseUrl,
        config: { apiKey: body.apiKey, apiBaseUrl: body.apiBaseUrl },
      })
    } else {
      // webhook
      if (!body.webhookUrl) return res.status(400).json({ error: 'A webhookUrl is required' })
      connection = await createCredentialConnection({
        provider: connector.id,
        authType: 'webhook',
        lawFirmId,
        attorneyId,
        createdByUserId: req.user?.id,
        config: { webhookUrl: body.webhookUrl },
      })
    }
    return res.json({ mode: 'connected', connectionId: connection.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'connect_failed'
    logger.error('CMS connect failed', { error, provider })
    return res.status(400).json({ error: message })
  }
})

// --- OAuth callback ---------------------------------------------------------
router.get('/callback/:provider', async (req, res) => {
  const provider = req.params.provider
  const connector = getConnector(provider)
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''

  if (!connector || !connector.exchangeCode || !code || !state) {
    return res.redirect(frontendRedirect(provider, 'error', 'missing_callback_params'))
  }

  try {
    const decoded = verifyCmsState(state)
    if (decoded.provider !== provider) throw new Error('provider_mismatch')

    const tokens = await connector.exchangeCode(code)
    await upsertOAuthConnection({
      provider: connector.id,
      lawFirmId: decoded.lawFirmId,
      attorneyId: decoded.attorneyId,
      createdByUserId: decoded.userId,
      tokens,
      apiBaseUrl: provider === 'clio' ? ENV.CLIO_API_BASE : null,
    })
    return res.redirect(frontendRedirect(provider, 'success'))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'oauth_failed'
    logger.error('CMS OAuth callback failed', { error, provider })
    return res.redirect(frontendRedirect(provider, 'error', message))
  }
})

// --- Disconnect -------------------------------------------------------------
router.delete('/connections/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })
  const connection = await getConnection(req.params.id)
  if (!connection || connection.lawFirmId !== lawFirmId) {
    return res.status(404).json({ error: 'Connection not found' })
  }
  await disconnectConnection(connection.id)
  res.json({ ok: true })
})

// --- Sync log ---------------------------------------------------------------
router.get('/connections/:id/logs', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId } = await getActorContext(req)
  const connection = await getConnection(req.params.id)
  if (!connection || connection.lawFirmId !== lawFirmId) {
    return res.status(404).json({ error: 'Connection not found' })
  }
  const logs = await prisma.cmsSyncLog.findMany({
    where: { connectionId: connection.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json({ logs })
})

// --- Manual export ----------------------------------------------------------
const ExportSchema = z.object({
  assessmentId: z.string().min(1),
  connectionId: z.string().min(1).optional(),
})

router.post('/export', authMiddleware, async (req: AuthRequest, res) => {
  const parsed = ExportSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { lawFirmId, attorneyId } = await getActorContext(req)
  if (!lawFirmId) return res.status(403).json({ error: 'No firm associated with this account' })
  const assessment = await prisma.assessment.findFirst({
    where: { id: parsed.data.assessmentId, lawFirmId },
    select: { id: true },
  })
  if (!assessment) return res.status(404).json({ error: 'Case not found' })

  // Resolve target connection(s).
  let connectionIds: string[] = []
  if (parsed.data.connectionId) {
    const c = await getConnection(parsed.data.connectionId)
    if (!c || c.lawFirmId !== lawFirmId) return res.status(404).json({ error: 'Connection not found' })
    connectionIds = [c.id]
  } else {
    const conns = await listConnections(lawFirmId)
    connectionIds = conns.filter((c) => c.status === 'connected').map((c) => c.id)
  }
  if (connectionIds.length === 0) return res.status(400).json({ error: 'No connected CMS to export to' })

  const results = []
  for (const connectionId of connectionIds) {
    try {
      results.push(
        await exportCaseToConnection({
          connectionId,
          assessmentId: parsed.data.assessmentId,
          actorUserId: req.user?.id,
          actorAttorneyId: attorneyId,
        })
      )
    } catch (error) {
      if (error instanceof EthicalWallBlockedError) {
        return res.status(403).json({ error: error.message })
      }
      const message = error instanceof Error ? error.message : 'export_failed'
      results.push({ connectionId, error: message })
    }
  }
  res.json({ results })
})

// --- Inbound pull sync (we read FROM the firm's CMS) ------------------------
// Off per connection until someone turns it on, because it creates a case for
// every matter in the firm's caseload. See lib/cms/inbound-sync.ts.
const ImportSyncSchema = z.object({
  connectionId: z.string().min(1),
  /** Preview only. Nothing is written and no watermark moves. */
  dryRun: z.boolean().optional(),
  /** Continue a run that stopped on the page cap. */
  cursor: z.string().min(1).optional(),
  /** Ignore the watermark and re-read the whole caseload; dedupe makes it safe. */
  full: z.boolean().optional(),
})

router.post('/import-sync', authMiddleware, async (req: AuthRequest, res) => {
  const parsed = ImportSyncSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!lawFirmId) return res.status(403).json({ error: 'No firm associated with this account' })
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })

  const connection = await getConnection(parsed.data.connectionId)
  if (!connection || connection.lawFirmId !== lawFirmId) {
    return res.status(404).json({ error: 'Connection not found' })
  }

  try {
    const result = await syncConnectionInbound({
      connectionId: connection.id,
      dryRun: parsed.data.dryRun ?? false,
      cursor: parsed.data.cursor ?? null,
      ...(parsed.data.full ? { since: null } : {}),
    })
    res.json(result)
  } catch (error) {
    if (error instanceof InboundSyncDisabledError) {
      return res.status(409).json({ error: error.message, code: 'inbound_sync_disabled' })
    }
    if (error instanceof InboundSyncUnsupportedError) {
      return res.status(400).json({ error: error.message, code: 'inbound_sync_unsupported' })
    }
    logger.error('Inbound CMS sync failed', { error, connectionId: connection.id })
    res.status(502).json({ error: error instanceof Error ? error.message : 'sync_failed' })
  }
})

/** Turn pull sync on or off for one connection. */
router.post('/connections/:id/inbound-sync', authMiddleware, async (req: AuthRequest, res) => {
  const enabled = req.body?.enabled === true
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })
  const connection = await getConnection(req.params.id)
  if (!connection || connection.lawFirmId !== lawFirmId) {
    return res.status(404).json({ error: 'Connection not found' })
  }
  const connector = getConnector(connection.provider)
  if (!supportsInboundSync(connector)) {
    return res.status(400).json({ error: `${connection.provider} cannot be read from`, code: 'inbound_sync_unsupported' })
  }

  // Merged rather than replaced: config also carries the provider's region
  // base url and webhook target, which this must not drop.
  let config: Record<string, unknown> = {}
  try {
    config = connection.config ? { ...(JSON.parse(connection.config) as Record<string, unknown>) } : {}
  } catch {
    config = {}
  }
  config.inboundSyncEnabled = enabled

  await prisma.cmsConnection.update({
    where: { id: connection.id },
    data: { config: JSON.stringify(config) },
  })
  res.json({ ok: true, inboundSyncEnabled: enabled })
})

// --- Firm data exports (authenticated dashboard flow) ----------------------
const DataExportSchema = z.object({
  type: z.enum(['snapshot', 'incremental']).default('snapshot'),
  sinceCursor: z.number().int().nonnegative().optional(),
  webhookUrl: z.string().url().max(2048).optional(),
  webhookSecret: z.string().min(32).max(512).optional(),
}).superRefine((value, context) => {
  if (value.type === 'incremental' && value.sinceCursor === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['sinceCursor'], message: 'sinceCursor is required' })
  }
  if (value.webhookSecret && !value.webhookUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['webhookUrl'], message: 'webhookUrl is required' })
  }
})

router.post('/data-exports', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!lawFirmId) return res.status(403).json({ error: 'No firm associated with this account' })
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })
  const parsed = DataExportSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  if (parsed.data.webhookUrl && !(await validatePublicWebhookUrl(parsed.data.webhookUrl))) {
    return res.status(400).json({ error: 'Webhook must be a public HTTPS URL' })
  }
  const generatedSecret = parsed.data.webhookUrl && !parsed.data.webhookSecret
    ? randomBytes(32).toString('base64url')
    : null
  const run = await enqueueDataExport({
    lawFirmId,
    kind: parsed.data.type,
    sinceCursor: parsed.data.sinceCursor,
    requestedByUserId: req.user?.id,
    webhookUrl: parsed.data.webhookUrl,
    webhookSecret: parsed.data.webhookSecret ?? generatedSecret,
  })
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'data_export.created',
      entityType: 'data_export_run',
      entityId: run.id,
      metadata: JSON.stringify({ lawFirmId, kind: run.kind }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    },
  })
  res.status(202).json({ export: dataExportView(run), ...(generatedSecret ? { webhookSecret: generatedSecret } : {}) })
})

router.get('/data-exports', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!lawFirmId) return res.status(403).json({ error: 'No firm associated with this account' })
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })
  const runs = await prisma.dataExportRun.findMany({
    where: { lawFirmId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  void prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'data_export.list.read',
      entityType: 'data_export_run',
      metadata: JSON.stringify({ lawFirmId, returned: runs.length }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    },
  }).catch(() => undefined)
  res.setHeader('Cache-Control', 'no-store')
  res.json({ exports: runs.map(dataExportView) })
})

router.get('/data-exports/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })
  const run = await prisma.dataExportRun.findFirst({ where: { id: req.params.id, lawFirmId: lawFirmId ?? '' } })
  if (!run) return res.status(404).json({ error: 'Export not found' })
  void prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'data_export.status.read',
      entityType: 'data_export_run',
      entityId: run.id,
      metadata: JSON.stringify({ lawFirmId }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    },
  }).catch(() => undefined)
  res.setHeader('Cache-Control', 'no-store')
  res.json({ export: dataExportView(run) })
})

router.get('/data-exports/:id/download', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })
  const run = await prisma.dataExportRun.findFirst({ where: { id: req.params.id, lawFirmId: lawFirmId ?? '' } })
  if (!run) return res.status(404).json({ error: 'Export not found' })
  if (run.status === 'expired' || !run.expiresAt || run.expiresAt <= new Date()) {
    return res.status(410).json({ error: 'Export artifact has expired' })
  }
  if (run.status !== 'ready') return res.status(409).json({ error: 'Export is not ready', status: run.status })
  const file = await dataExportFile(run)
  if (!file) return res.status(503).json({ error: 'Export artifact is temporarily unavailable' })
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'data_export.downloaded',
      entityType: 'data_export_run',
      entityId: run.id,
      metadata: JSON.stringify({ lawFirmId, sha256: run.contentHash }),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? null,
    },
  })
  res.setHeader('Cache-Control', 'no-store, private')
  res.setHeader('Pragma', 'no-cache')
  res.download(file, `clearcaseiq-${run.kind}-${run.id}.zip`)
})

// --- Sync API keys (external systems that read FROM us) ---------------------
// These authenticate the /v1/sync/* API (canonical read + change feed +
// write proposals). Firm-scoped: a key only ever sees its own firm's cases.
router.get('/sync-keys', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!lawFirmId) return res.json({ keys: [] })
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })
  const keys = await prisma.syncApiKey.findMany({
    where: { lawFirmId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, prefix: true, scopes: true, expiresAt: true, lastUsedAt: true, revokedAt: true, createdAt: true },
  })
  res.json({
    keys: keys.map((key) => ({
      ...key,
      scopes: parseSyncScopes(key.scopes),
      expired: Boolean(key.expiresAt && key.expiresAt <= new Date()),
    })),
  })
})

const SyncKeySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.enum(SYNC_SCOPES)).min(1).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

router.post('/sync-keys', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!lawFirmId) return res.status(403).json({ error: 'No firm associated with this account' })
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })
  const parsed = SyncKeySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'A key name is required' })

  const scopes = parsed.data.scopes ?? ['cases:read', 'changes:read', 'proposals:write']
  const expiresAt = new Date(Date.now() + (parsed.data.expiresInDays ?? 90) * 24 * 60 * 60 * 1000)
  const { token, record } = await prisma.$transaction(async (tx) => {
    const created = await createSyncApiKey({
      lawFirmId,
      name: parsed.data.name,
      createdByUserId: req.user?.id,
      scopes,
      expiresAt,
    }, tx)
    await tx.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'sync_api_key.created',
        entityType: 'sync_api_key',
        entityId: created.record.id,
        metadata: JSON.stringify({ lawFirmId, name: created.record.name, scopes, expiresAt }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      },
    })
    return created
  })
  // The plaintext token is returned exactly once — the client must store it now.
  res.status(201).json({
    key: { ...record, scopes: parseSyncScopes(record.scopes), expired: false },
    token,
  })
})

router.delete('/sync-keys/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { lawFirmId, canManageIntegrations } = await getActorContext(req)
  if (!lawFirmId) return res.status(403).json({ error: 'No firm associated with this account' })
  if (!canManageIntegrations) return res.status(403).json({ error: 'Firm administrator permission is required' })
  const key = await prisma.syncApiKey.findUnique({ where: { id: req.params.id }, select: { lawFirmId: true } })
  if (!key || key.lawFirmId !== lawFirmId) return res.status(404).json({ error: 'Key not found' })
  await prisma.$transaction(async (tx) => {
    await tx.syncApiKey.update({ where: { id: req.params.id }, data: { revokedAt: new Date() } })
    await tx.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'sync_api_key.revoked',
        entityType: 'sync_api_key',
        entityId: req.params.id,
        metadata: JSON.stringify({ lawFirmId }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      },
    })
  })
  res.json({ ok: true })
})

// --- Inbound webhook (status sync) -----------------------------------------
function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

router.post('/webhooks/inbound/:provider', async (req, res) => {
  const provider = req.params.provider
  const connectionId = typeof req.body?.connectionId === 'string' ? req.body.connectionId : ''
  const externalMatterId = typeof req.body?.matterId === 'string' ? req.body.matterId : String(req.body?.matterId ?? '')
  const status = typeof req.body?.status === 'string' ? req.body.status : ''

  if (!connectionId || !externalMatterId || !status) {
    return res.status(400).json({ error: 'connectionId, matterId and status are required' })
  }
  try {
    const connection = await getConnection(connectionId)
    if (!connection || connection.provider !== provider) return res.status(404).json({ error: 'Connection not found' })

    const secret = readConfig(connection).webhookSecret
    const timestamp = req.get('x-cciq-timestamp') ?? ''
    const eventId = req.get('x-cciq-event-id') ?? ''
    const signature = req.get('x-cciq-signature') ?? ''
    const seconds = Number(timestamp)
    if (
      typeof secret !== 'string' ||
      !secret ||
      !eventId ||
      !Number.isFinite(seconds) ||
      Math.abs(Date.now() - seconds * 1000) > 5 * 60 * 1000
    ) {
      return res.status(401).json({ error: 'Invalid webhook authentication' })
    }
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${eventId}.${JSON.stringify(req.body)}`)
      .digest('hex')
    if (!secureEqual(signature, expected)) return res.status(401).json({ error: 'Invalid webhook signature' })

    const duplicate = await prisma.auditLog.findFirst({
      where: {
        action: 'cms.webhook.received',
        entityType: 'cms_connection',
        entityId: connectionId,
        metadata: { contains: `"eventId":"${eventId.replaceAll('"', '')}"` },
      },
      select: { id: true },
    })
    if (duplicate) return res.status(409).json({ error: 'Webhook event already processed' })

    const result = await applyInboundMatterStatus({ connectionId, externalMatterId, status, raw: req.body })
    await prisma.auditLog.create({
      data: {
        action: 'cms.webhook.received',
        entityType: 'cms_connection',
        entityId: connectionId,
        metadata: JSON.stringify({ eventId, provider, externalMatterId }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      },
    })
    res.json(result)
  } catch (error) {
    logger.error('Inbound CMS webhook failed', { error, provider })
    res.status(500).json({ error: 'inbound_failed' })
  }
})

export default router
