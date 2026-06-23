/**
 * Persistence + token lifecycle for CMS connections.
 *
 * Tokens (and config secrets like API keys / PATs) are stored encrypted via
 * `crypto.ts`. `getValidAccessToken` transparently refreshes OAuth/PAT bearers
 * before they expire, mirroring how calendar-sync keeps Google/MS tokens fresh.
 */
import type { CmsConnection } from '@prisma/client'
import { prisma } from '../prisma'
import { logger } from '../logger'
import { decryptSecret, encryptSecret } from './crypto'
import { getConnector } from './registry'
import type { CmsAuthContext, CmsTokenSet } from './types'

const SECRET_CONFIG_KEYS = ['apiKey', 'pat', 'webhookSecret']
const REFRESH_BUFFER_MS = 60_000

/** Decrypts secret fields inside a stored config blob. */
export function readConfig(connection: Pick<CmsConnection, 'config'>): Record<string, any> {
  if (!connection.config) return {}
  try {
    const parsed = JSON.parse(connection.config) as Record<string, any>
    for (const key of SECRET_CONFIG_KEYS) {
      if (typeof parsed[key] === 'string') {
        parsed[key] = decryptSecret(parsed[key])
      }
    }
    return parsed
  } catch (error) {
    logger.warn('Failed to parse CMS connection config', { error, connectionId: (connection as any).id })
    return {}
  }
}

/** Encrypts secret fields and serializes a config blob for storage. */
export function writeConfig(config: Record<string, any>): string {
  const out: Record<string, any> = { ...config }
  for (const key of SECRET_CONFIG_KEYS) {
    if (typeof out[key] === 'string' && out[key]) {
      out[key] = encryptSecret(out[key])
    }
  }
  return JSON.stringify(out)
}

export function buildAuthContext(connection: CmsConnection): CmsAuthContext {
  return {
    connectionId: connection.id,
    accessToken: decryptSecret(connection.accessToken),
    apiBaseUrl: connection.apiBaseUrl,
    externalOrgId: connection.externalOrgId,
    externalUserId: connection.externalUserId,
    config: readConfig(connection),
  }
}

function applyTokenSet(update: Record<string, any>, tokens: CmsTokenSet) {
  update.accessToken = encryptSecret(tokens.accessToken)
  if (tokens.refreshToken !== undefined) {
    update.refreshToken = tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null
  }
  if (tokens.expiresInSeconds) {
    update.tokenExpiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000)
  }
  if (tokens.scope !== undefined) update.scopes = tokens.scope ? JSON.stringify([tokens.scope]) : null
  if (tokens.externalAccountId !== undefined && tokens.externalAccountId !== null)
    update.externalAccountId = tokens.externalAccountId
  if (tokens.externalAccountEmail !== undefined && tokens.externalAccountEmail !== null)
    update.externalAccountEmail = tokens.externalAccountEmail
  if (tokens.externalOrgId !== undefined && tokens.externalOrgId !== null)
    update.externalOrgId = tokens.externalOrgId
  if (tokens.externalUserId !== undefined && tokens.externalUserId !== null)
    update.externalUserId = tokens.externalUserId
}

/**
 * Returns a connection whose access token is guaranteed fresh, refreshing via
 * the connector when expired (OAuth refresh, or Filevine PAT->bearer mint).
 */
export async function getValidAccessToken(connection: CmsConnection): Promise<CmsConnection> {
  const connector = getConnector(connection.provider)
  if (!connector) return connection

  const expiresSoon =
    !connection.tokenExpiresAt ||
    connection.tokenExpiresAt.getTime() - Date.now() < REFRESH_BUFFER_MS

  const hasToken = Boolean(decryptSecret(connection.accessToken))
  if (hasToken && !expiresSoon) return connection

  const refreshSecret = decryptSecret(connection.refreshToken)
  if (!connector.refreshToken || !refreshSecret) {
    // Nothing to refresh with (e.g. webhook connector); use as-is.
    return connection
  }

  try {
    const tokens = await connector.refreshToken(refreshSecret)
    const update: Record<string, any> = { status: 'connected', lastError: null }
    applyTokenSet(update, tokens)
    return await prisma.cmsConnection.update({ where: { id: connection.id }, data: update })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('CMS token refresh failed', { error, connectionId: connection.id })
    await prisma.cmsConnection.update({
      where: { id: connection.id },
      data: { status: 'error', lastError: message },
    })
    throw error
  }
}

export async function listConnections(lawFirmId: string) {
  return prisma.cmsConnection.findMany({
    where: { lawFirmId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getConnection(id: string) {
  return prisma.cmsConnection.findUnique({ where: { id } })
}

export async function disconnectConnection(id: string) {
  return prisma.cmsConnection.update({
    where: { id },
    data: { status: 'disconnected', accessToken: null, refreshToken: null, tokenExpiresAt: null },
  })
}

/** Upserts an OAuth connection from a freshly-exchanged token set. */
export async function upsertOAuthConnection(args: {
  provider: string
  lawFirmId: string
  attorneyId?: string | null
  createdByUserId?: string | null
  tokens: CmsTokenSet
  apiBaseUrl?: string | null
}): Promise<CmsConnection> {
  const { provider, lawFirmId, attorneyId, createdByUserId, tokens, apiBaseUrl } = args
  const base: Record<string, any> = {
    provider,
    authType: 'oauth',
    lawFirmId,
    attorneyId: attorneyId ?? null,
    createdByUserId: createdByUserId ?? null,
    apiBaseUrl: apiBaseUrl ?? null,
    status: 'connected',
    lastError: null,
  }
  applyTokenSet(base, tokens)

  const externalAccountId = (base.externalAccountId as string) ?? null
  const existing = await prisma.cmsConnection.findFirst({
    where: { lawFirmId, provider, externalAccountId },
  })
  if (existing) {
    return prisma.cmsConnection.update({ where: { id: existing.id }, data: base })
  }
  return prisma.cmsConnection.create({ data: base as any })
}

/** Creates a credential-based connection (PAT / partner API key / webhook). */
export async function createCredentialConnection(args: {
  provider: string
  authType: 'pat' | 'partner' | 'webhook'
  lawFirmId: string
  attorneyId?: string | null
  createdByUserId?: string | null
  apiBaseUrl?: string | null
  /** Plaintext secret stored in the refreshToken slot (e.g. Filevine PAT). */
  refreshSecret?: string | null
  config?: Record<string, any>
}): Promise<CmsConnection> {
  const data: Record<string, any> = {
    provider: args.provider,
    authType: args.authType,
    lawFirmId: args.lawFirmId,
    attorneyId: args.attorneyId ?? null,
    createdByUserId: args.createdByUserId ?? null,
    apiBaseUrl: args.apiBaseUrl ?? null,
    refreshToken: args.refreshSecret ? encryptSecret(args.refreshSecret) : null,
    config: args.config ? writeConfig(args.config) : null,
    status: 'connected',
  }
  return prisma.cmsConnection.create({ data: data as any })
}
