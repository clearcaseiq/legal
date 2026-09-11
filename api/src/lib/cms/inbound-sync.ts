/**
 * Inbound (pull) sync: read a firm's matters out of their CMS and create the
 * corresponding ClearCaseIQ cases.
 *
 * This is the mirror of export-service.ts and shares its plumbing — the same
 * connection/token handling and the same CmsSyncLog table, with
 * `direction: 'inbound'`.
 *
 * Two things make this different from the file importer in
 * routes/attorney-dashboard.ts, and both are deliberate:
 *
 *  - It is off by default, per connection, even when the provider credentials
 *    are present. Pulling a firm's entire caseload into a marketplace product
 *    is a large and surprising action, so it takes an explicit opt-in
 *    (`config.inboundSyncEnabled`) on top of having working credentials.
 *
 *  - It never invents a date of loss. Clio in particular has no incident-date
 *    field, and its `open_date` is when the file was opened, which can be
 *    months later. Deriving an SOL deadline from that would put a wrong,
 *    confident date in front of an attorney, so those matters are reported as
 *    needing a date rather than imported with a guess.
 */
import { prisma } from '../prisma'
import { logger } from '../logger'
import { CLAIM_TYPES } from '../validators'
import {
  createAttorneyOwnedCase,
  finalizeAttorneyCases,
  findExistingImportedCase,
  type AttorneyCaseInput,
  type AttorneyCaseOwner,
} from '../attorney-case-factory'
import { buildAuthContext, getConnection, getValidAccessToken } from './connections'
import { getConnector } from './registry'
import { supportsInboundSync, type CmsInboundMatter } from './types'

/** Matters we looked at but did not create, and why. */
export type InboundSkipReason =
  | 'duplicate'
  | 'missing_external_id'
  | 'missing_incident_date'
  | 'missing_venue_state'
  | 'error'

export interface InboundSkippedMatter {
  externalId: string
  reason: InboundSkipReason
  detail?: string
  /** Enough to recognise the matter in the CMS without opening it. */
  label?: string
}

export interface InboundSyncResult {
  connectionId: string
  provider: string
  dryRun: boolean
  imported: number
  /** Created case ids. Empty on a dry run. */
  assessmentIds: string[]
  skipped: InboundSkippedMatter[]
  pagesFetched: number
  /** Total matters the CMS handed back, before any filtering. */
  seen: number
  /**
   * Set when we stopped on the page cap rather than at the end of the data.
   * Pass it back as `cursor` to continue; until the run reaches the end,
   * `lastSyncedAt` is left alone so a resumed sync does not skip the tail.
   */
  nextCursor: string | null
  reachedEnd: boolean
}

export class InboundSyncUnsupportedError extends Error {
  constructor(provider: string) {
    super(`${provider} does not support reading matters back out`)
    this.name = 'InboundSyncUnsupportedError'
  }
}

export class InboundSyncDisabledError extends Error {
  constructor() {
    super('Inbound sync is not enabled for this connection')
    this.name = 'InboundSyncDisabledError'
  }
}

/** Belt and braces on top of provider credentials; see the file header. */
export function inboundSyncEnabled(config: Record<string, unknown> | null | undefined): boolean {
  return config?.inboundSyncEnabled === true
}

/**
 * Map the CMS's own practice-area vocabulary onto ours.
 *
 * Falls back to `other_pi` rather than `auto`, which is what the spreadsheet
 * importer does. An unrecognised practice area means we do not know the claim
 * type; saying "auto" would be a claim about the case, and claim type drives
 * both the limitations clock and the valuation model.
 */
export function claimTypeFromPracticeArea(value: string | null | undefined): string {
  const text = String(value || '').toLowerCase()
  if (!text.trim()) return 'other_pi'

  if (text.includes('wrongful death')) return 'wrongful_death'
  if (text.includes('nursing home') || text.includes('elder')) return 'nursing_home_abuse'
  if (text.includes('malpractice') || text.includes('med mal') || text.includes('medical negligence'))
    return 'medmal'
  if (text.includes('dog') || text.includes('animal')) return 'dog_bite'
  if (text.includes('product') || text.includes('defect')) return 'product'
  if (text.includes('slip') || text.includes('trip') || text.includes('fall')) return 'slip_and_fall'
  if (text.includes('premises')) return 'premises_liability'
  if (text.includes('workers comp') || text.includes("worker's comp") || text.includes('workplace'))
    return 'workplace_injury'
  if (text.includes('toxic') || text.includes('exposure') || text.includes('asbestos'))
    return 'toxic_exposure'
  if (text.includes('assault') || text.includes('battery')) return 'intentional_tort'
  if (
    text.includes('auto') ||
    text.includes('motor vehicle') ||
    text.includes('mva') ||
    text.includes('car accident') ||
    text.includes('truck') ||
    text.includes('motorcycle')
  )
    return 'auto'

  // An exact match on our own vocabulary, for a firm that named their practice
  // areas after our claim types.
  const slug = text.trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  if ((CLAIM_TYPES as readonly string[]).includes(slug)) return slug

  return 'other_pi'
}

/** ISO `YYYY-MM-DD`, or null when the value is absent or unparseable. */
function isoDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function stateCode(value: string | null | undefined): string | null {
  const text = String(value || '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(text) ? text : null
}

function labelFor(matter: CmsInboundMatter): string {
  const name = [matter.clientFirstName, matter.clientLastName].filter(Boolean).join(' ').trim()
  return name || matter.description || matter.externalId
}

/**
 * Who the created cases belong to.
 *
 * A connection may be firm-wide rather than attorney-scoped, in which case we
 * attribute to the firm's longest-standing attorney. The factory needs a real
 * attorney id for the LeadSubmission, and an arbitrary-but-stable choice keeps
 * the whole caseload under one owner instead of scattering it.
 */
async function resolveOwner(connection: {
  attorneyId: string | null
  lawFirmId: string
}): Promise<{ owner: AttorneyCaseOwner; fallbackState: string | null }> {
  const attorney = connection.attorneyId
    ? await prisma.attorney.findUnique({
        where: { id: connection.attorneyId },
        select: { id: true, barState: true },
      })
    : await prisma.attorney.findFirst({
        where: { lawFirmId: connection.lawFirmId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, barState: true },
      })

  if (!attorney) {
    throw new Error('This connection has no attorney to attribute imported cases to')
  }

  return {
    owner: { attorneyId: attorney.id, lawFirmId: connection.lawFirmId },
    fallbackState: stateCode(attorney.barState),
  }
}

async function logSync(args: {
  connectionId: string
  assessmentId?: string | null
  status: 'success' | 'error' | 'skipped'
  externalId: string
  message?: string | null
}) {
  await prisma.cmsSyncLog.create({
    data: {
      connectionId: args.connectionId,
      assessmentId: args.assessmentId ?? null,
      direction: 'inbound',
      operation: 'import_matter',
      status: args.status,
      externalType: 'matter',
      externalId: args.externalId,
      message: args.message ?? null,
    },
  })
}

export interface InboundSyncOptions {
  connectionId: string
  /**
   * Only matters changed since this instant. Defaults to the connection's
   * `lastSyncedAt`, so a repeat run is incremental. Pass null to force a full
   * re-read; dedupe means that is safe, just slower.
   */
  since?: Date | null
  cursor?: string | null
  /** Bounds a single run so one caseload cannot monopolise the worker. */
  maxPages?: number
  /** Report what would be created without writing anything. */
  dryRun?: boolean
}

export async function syncConnectionInbound(options: InboundSyncOptions): Promise<InboundSyncResult> {
  const { connectionId, maxPages = 20, dryRun = false } = options

  const connection = await getConnection(connectionId)
  if (!connection) throw new Error('CMS connection not found')

  const connector = getConnector(connection.provider)
  if (!connector || !supportsInboundSync(connector) || !connector.listMatters) {
    throw new InboundSyncUnsupportedError(connection.provider)
  }

  const config = connection.config ? safeJson(connection.config) : null
  if (!inboundSyncEnabled(config)) throw new InboundSyncDisabledError()

  const fresh = await getValidAccessToken(connection)
  const auth = buildAuthContext(fresh)
  const { owner, fallbackState } = await resolveOwner({
    attorneyId: fresh.attorneyId,
    lawFirmId: fresh.lawFirmId,
  })

  const since = options.since === undefined ? fresh.lastSyncedAt : options.since
  const startedAt = new Date()

  const result: InboundSyncResult = {
    connectionId,
    provider: connection.provider,
    dryRun,
    imported: 0,
    assessmentIds: [],
    skipped: [],
    pagesFetched: 0,
    seen: 0,
    nextCursor: null,
    reachedEnd: false,
  }

  let cursor = options.cursor ?? null

  try {
    while (result.pagesFetched < maxPages) {
      const page = await connector.listMatters(auth, { since, cursor, limit: 100 })
      result.pagesFetched += 1
      result.seen += page.matters.length

      for (const matter of page.matters) {
        await importOneMatter(matter, { connectionId, owner, fallbackState, dryRun, result })
      }

      cursor = page.nextCursor ?? null
      if (!cursor || page.matters.length === 0) {
        result.reachedEnd = true
        break
      }
    }
    result.nextCursor = result.reachedEnd ? null : cursor

    if (!dryRun) {
      // Reference codes and valuations are self-healing and slow, so they run
      // once for the whole batch after the reads are done.
      await finalizeAttorneyCases(result.assessmentIds)

      // No claimant invites here, unlike the spreadsheet import. This runs
      // unattended on a six-hour sweep, and the first pass over a connected
      // Clio or Filevine account is the firm's entire caseload — so the invite
      // would be a mail-out of unknown size that nobody chose to send and no
      // preview preceded. `claimant-invite` will not mail the same case twice,
      // so these can be invited later from the Intake tab without risk of a
      // duplicate.

      await prisma.cmsConnection.update({
        where: { id: connectionId },
        data: {
          lastError: null,
          // Only advance the watermark on a run that reached the end.
          // Advancing it mid-caseload would make the next incremental sync
          // skip everything we had not read yet.
          ...(result.reachedEnd ? { lastSyncedAt: startedAt } : {}),
        },
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('CMS inbound sync failed', { connectionId, provider: connection.provider, error })
    if (!dryRun) {
      await prisma.cmsConnection.update({
        where: { id: connectionId },
        data: { status: 'error', lastError: message },
      })
    }
    throw error
  }

  return result
}

async function importOneMatter(
  matter: CmsInboundMatter,
  ctx: {
    connectionId: string
    owner: AttorneyCaseOwner
    fallbackState: string | null
    dryRun: boolean
    result: InboundSyncResult
  },
): Promise<void> {
  const { connectionId, owner, fallbackState, dryRun, result } = ctx
  const label = labelFor(matter)

  const skip = async (reason: InboundSkipReason, detail?: string) => {
    result.skipped.push({ externalId: matter.externalId || '', reason, detail, label })
    if (!dryRun) {
      await logSync({
        connectionId,
        status: reason === 'error' ? 'error' : 'skipped',
        externalId: matter.externalId || '',
        message: detail ?? reason,
      })
    }
  }

  if (!matter.externalId) {
    await skip('missing_external_id', 'The CMS returned a matter with no id to key it on')
    return
  }

  const incidentDate = isoDate(matter.incidentDate)
  if (!incidentDate) {
    await skip(
      'missing_incident_date',
      'No date of loss on the matter. Add one in the CMS and re-sync, or create the case by hand.',
    )
    return
  }

  const venueState = stateCode(matter.venueState) || fallbackState
  if (!venueState) {
    await skip('missing_venue_state', 'No venue state on the matter and the attorney has no bar state')
    return
  }

  const input: AttorneyCaseInput = {
    claimType: claimTypeFromPracticeArea(matter.practiceArea),
    venueState,
    venueCounty: matter.venueCounty || null,
    incidentDate,
    narrative: matter.description || '',
    plaintiffFirstName: matter.clientFirstName || undefined,
    plaintiffLastName: matter.clientLastName || undefined,
    plaintiffEmail: matter.clientEmail || undefined,
    plaintiffPhone: matter.clientPhone || undefined,
    importSource: result.provider,
    externalId: matter.externalId,
    rawImport: matter.raw,
  }

  const existing = await findExistingImportedCase(input, owner)
  if (existing) {
    // Reported but not logged: on an incremental sync most matters are
    // already-seen, and a log row each would bury the rows that matter.
    result.skipped.push({ externalId: matter.externalId, reason: 'duplicate', label })
    return
  }

  if (dryRun) {
    result.imported += 1
    return
  }

  try {
    const created = await createAttorneyOwnedCase(input, owner, 'import')
    result.imported += 1
    result.assessmentIds.push(created.assessmentId)
    await logSync({
      connectionId,
      assessmentId: created.assessmentId,
      status: 'success',
      externalId: matter.externalId,
    })
  } catch (error) {
    // One bad matter must not abandon the rest of the caseload, so this is
    // reported per row rather than thrown.
    const message = error instanceof Error ? error.message : String(error)
    await skip('error', message)
  }
}

function safeJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}
