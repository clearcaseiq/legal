/**
 * Bulk invitations for imported attorneys to claim their directory profiles.
 *
 * Imported attorneys never asked to hear from us, so this is outreach, not
 * transactional mail, and it is built around three things a one-off invite
 * could ignore:
 *
 * - CAN-SPAM. Every message carries the postal address, a one-click
 *   unsubscribe (RFC 8058 headers plus a link), and an honest subject. Sending
 *   is refused outright until a postal address is configured.
 * - Sender reputation. A cold list sent all at once is how a domain lands in
 *   spam folders, and this domain also carries password resets and claimant
 *   mail. Admins only queue; a sweep sends at a capped rolling-24h rate.
 * - Consent memory. An unsubscribe lands in EmailSuppression, keyed on the
 *   address, and every send re-checks it, so it survives re-imports and
 *   applies to invites queued before the person opted out.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { webUrl } from './app-url'
import { countyForCaCity, normalizeCaCounty } from './ca-counties'
import { CLAIM_INVITE_TTL_DAYS, claimUrl, generateClaimToken, sendClaimEmail } from './claims'

const db = prisma as any

/** Statuses that mean an attorney already has an invite in flight. */
export const LIVE_CLAIM_STATUSES = ['queued', 'sent', 'verified'] as const

export const MAX_BATCH_SIZE = 200
const DEFAULT_DAILY_CAP = 50
/** Spread a day's quota over the day instead of spending it in one burst. */
const PER_SWEEP_LIMIT = 10
const MAX_SEND_ATTEMPTS = 3

export type InviteFilters = {
  county?: string | null
  city?: string | null
  firm?: string | null
}

export type InviteCandidate = {
  id: string
  name: string
  email: string
  firmName: string | null
  city: string | null
  county: string | null
}

export const MAX_DAILY_CAP = 5000
const SETTINGS_KEY = 'claim_invite_settings'

export type InviteConfig = {
  dailyCap: number
  /** Stops the sweep without touching the queue. */
  paused: boolean
  postalAddress: string | null
  fromEmail: string | null
  replyTo: string | null
}

function envDefaults(): InviteConfig {
  const rawCap = Number.parseInt(process.env.INVITE_DAILY_CAP || '', 10)
  return {
    dailyCap: Number.isFinite(rawCap) && rawCap >= 0 ? rawCap : DEFAULT_DAILY_CAP,
    paused: false,
    postalAddress: process.env.INVITE_POSTAL_ADDRESS?.trim() || null,
    fromEmail: process.env.INVITE_FROM_EMAIL?.trim() || null,
    replyTo: process.env.INVITE_REPLY_TO?.trim() || null,
  }
}

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/[\r\n]+/g, ' ').trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function cleanEmail(value: unknown): string | null {
  const text = cleanText(value, 254)
  return text && EMAIL_RE.test(text) ? text.toLowerCase() : null
}

/**
 * Stored settings are operator input, so each field is re-validated on read:
 * a bad value degrades to the environment default rather than reaching SES.
 */
function normalizeInviteConfig(raw: Partial<Record<keyof InviteConfig, unknown>>, base: InviteConfig): InviteConfig {
  const cap = Number(raw.dailyCap)
  return {
    dailyCap: Number.isFinite(cap) ? Math.min(MAX_DAILY_CAP, Math.max(0, Math.round(cap))) : base.dailyCap,
    paused: typeof raw.paused === 'boolean' ? raw.paused : base.paused,
    postalAddress: 'postalAddress' in raw ? cleanText(raw.postalAddress, 300) : base.postalAddress,
    fromEmail: 'fromEmail' in raw ? cleanEmail(raw.fromEmail) : base.fromEmail,
    replyTo: 'replyTo' in raw ? cleanEmail(raw.replyTo) : base.replyTo,
  }
}

export async function getInviteConfig(): Promise<InviteConfig> {
  const base = envDefaults()
  try {
    const row = await db.routingConfig.findUnique({ where: { key: SETTINGS_KEY } })
    if (!row?.value) return base
    return normalizeInviteConfig(JSON.parse(row.value), base)
  } catch {
    return base
  }
}

export async function saveInviteConfig(update: Partial<Record<keyof InviteConfig, unknown>>): Promise<InviteConfig> {
  const merged = normalizeInviteConfig(update, await getInviteConfig())
  await db.routingConfig.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(merged) },
    update: { value: JSON.stringify(merged) },
  })
  return merged
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase()
}

export async function isEmailSuppressed(email: string | null | undefined): Promise<boolean> {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  const row = await db.emailSuppression.findUnique({ where: { email: normalized }, select: { id: true } })
  return Boolean(row)
}

export async function suppressEmail(email: string, reason: string, source: string): Promise<void> {
  const normalized = normalizeEmail(email)
  if (!normalized) return
  // The first reason wins: a complaint later relabelled "unsubscribe" would
  // lose the fact that this address once reported us.
  await db.emailSuppression.upsert({
    where: { email: normalized },
    update: {},
    create: { email: normalized, reason, source },
  })
}

function contains(value: string | null | undefined, needle: string): boolean {
  return (value || '').toLowerCase().includes(needle.toLowerCase())
}

/**
 * Attorneys who can be invited now: never contacted, active, with an address
 * on file, no invite in flight, and not suppressed.
 *
 * County is derived from the firm's city because imports do not store it. The
 * whole unclaimed directory is a few thousand rows, so filtering in memory is
 * cheaper than teaching the query about the city-to-county crosswalk.
 */
export async function findInviteCandidates(filters: InviteFilters = {}): Promise<InviteCandidate[]> {
  const county = filters.county ? normalizeCaCounty(filters.county) : null
  if (filters.county && !county) return []
  const city = filters.city?.trim() || ''
  const firm = filters.firm?.trim() || ''

  const attorneys = await db.attorney.findMany({
    where: { claimStatus: 'unclaimed', isActive: true, email: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      lawFirm: { select: { name: true, city: true, state: true } },
    },
    orderBy: { name: 'asc' },
  })
  if (!attorneys.length) return []

  const [liveClaims, suppressed] = await Promise.all([
    db.profileClaim.findMany({
      where: { status: { in: [...LIVE_CLAIM_STATUSES] } },
      select: { attorneyId: true },
    }),
    db.emailSuppression.findMany({ select: { email: true } }),
  ])
  const inFlight = new Set<string>(liveClaims.map((row: { attorneyId: string }) => row.attorneyId))
  const suppressedSet = new Set<string>(suppressed.map((row: { email: string }) => row.email))

  const candidates: InviteCandidate[] = []
  for (const attorney of attorneys) {
    const email = normalizeEmail(attorney.email)
    if (!email || inFlight.has(attorney.id) || suppressedSet.has(email)) continue
    const firmCity = attorney.lawFirm?.city ?? null
    const firmCounty =
      (attorney.lawFirm?.state || '').toUpperCase() === 'CA' ? countyForCaCity(firmCity) : null
    if (county && firmCounty !== county) continue
    if (city && !contains(firmCity, city)) continue
    if (firm && !contains(attorney.lawFirm?.name, firm)) continue
    candidates.push({
      id: attorney.id,
      name: attorney.name,
      email: attorney.email,
      firmName: attorney.lawFirm?.name ?? null,
      city: firmCity,
      county: firmCounty,
    })
  }
  return candidates
}

export async function countSentInLast24Hours(): Promise<number> {
  return db.profileClaim.count({
    where: { batchId: { not: null }, sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  })
}

export function newBatchId(): string {
  return `inv_${Date.now().toString(36)}_${generateClaimToken().slice(0, 8)}`
}

/**
 * Queue invites for the first `limit` candidates matching `filters`. Nothing
 * is emailed here; the sweep sends them within the daily cap.
 */
export async function queueInviteBatch(
  filters: InviteFilters,
  limit: number,
): Promise<{ batchId: string; queued: number }> {
  const size = Math.max(0, Math.min(MAX_BATCH_SIZE, Math.floor(limit)))
  const candidates = (await findInviteCandidates(filters)).slice(0, size)
  const batchId = newBatchId()
  if (!candidates.length) return { batchId, queued: 0 }

  // expiresAt is provisional: the 14-day window restarts when the mail is
  // actually sent, so a long queue does not eat into the attorney's time.
  const provisionalExpiry = new Date(Date.now() + CLAIM_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  await db.profileClaim.createMany({
    data: candidates.map((candidate) => ({
      attorneyId: candidate.id,
      token: generateClaimToken(),
      email: candidate.email,
      status: 'queued',
      batchId,
      expiresAt: provisionalExpiry,
      meta: JSON.stringify({ filters }),
    })),
  })
  return { batchId, queued: candidates.length }
}

export async function cancelInviteBatch(batchId: string): Promise<number> {
  const result = await db.profileClaim.updateMany({
    where: { batchId, status: 'queued' },
    data: { status: 'cancelled' },
  })
  return result.count
}

export type ClaimInviteEmailInput = {
  to: string
  attorneyName: string
  firmName: string | null
  token: string
  postalAddress: string
  fromEmail?: string | null
  replyTo?: string | null
}

export function claimUnsubscribeUrls(token: string): { page: string; oneClick: string } {
  return {
    page: webUrl(`/claim/${token}/unsubscribe`),
    oneClick: webUrl(`/v1/attorney-claim/unsubscribe?token=${encodeURIComponent(token)}`),
  }
}

export function buildClaimInviteEmail(input: ClaimInviteEmailInput) {
  const urls = claimUnsubscribeUrls(input.token)
  const at = input.firmName ? ` at ${input.firmName}` : ''
  return {
    to: input.to,
    subject: 'Your attorney profile on ClearCaseIQ',
    body: [
      `Hi ${input.attorneyName},`,
      '',
      `ClearCaseIQ helps people injured in California find a personal injury attorney. We created a basic profile for you${at} from public State Bar records.`,
      '',
      'Claim it to confirm your details, choose the case types you take, and be considered for case matches from claimants near you. Claiming your profile is free.',
      '',
      `This link expires in ${CLAIM_INVITE_TTL_DAYS} days. If you would rather not be listed, you can decline from the same page.`,
    ].join('\n'),
    cta: { label: 'Claim your profile', url: claimUrl(input.token) },
    ...(input.fromEmail ? { fromEmail: input.fromEmail } : {}),
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    headers: {
      'List-Unsubscribe': `<${urls.oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    compliance: {
      reason: `This is a one-time invitation from ClearCaseIQ, sent because you are listed as an active California attorney${at}.`,
      unsubscribeUrl: urls.page,
      postalAddress: input.postalAddress,
    },
  }
}

export type InviteSweepResult = {
  sent: number
  failed: number
  skipped: number
  remainingQueued: number
  blockedReason?: 'paused' | 'no_postal_address' | 'daily_cap_reached'
}

/**
 * Send the next slice of queued invites, oldest first, within the cap.
 *
 * Every row is re-checked at send time, because the queue can sit for days:
 * the attorney may have claimed, declined, or unsubscribed in the meantime, or
 * an admin may have changed their address.
 */
export async function runClaimInviteSweep(): Promise<InviteSweepResult> {
  const config = await getInviteConfig()
  const remainingQueued = async () => db.profileClaim.count({ where: { status: 'queued' } })
  const result: InviteSweepResult = { sent: 0, failed: 0, skipped: 0, remainingQueued: 0 }

  const queuedCount = await remainingQueued()
  if (!queuedCount) return result
  if (config.paused) return { ...result, remainingQueued: queuedCount, blockedReason: 'paused' }
  if (!config.postalAddress) {
    return { ...result, remainingQueued: queuedCount, blockedReason: 'no_postal_address' }
  }
  const budget = Math.min(PER_SWEEP_LIMIT, config.dailyCap - (await countSentInLast24Hours()))
  if (budget <= 0) {
    return { ...result, remainingQueued: queuedCount, blockedReason: 'daily_cap_reached' }
  }

  const rows = await db.profileClaim.findMany({
    where: { status: 'queued' },
    orderBy: { createdAt: 'asc' },
    take: budget,
    select: {
      id: true,
      token: true,
      email: true,
      sendAttempts: true,
      attorney: {
        select: { id: true, name: true, email: true, claimStatus: true, isActive: true, lawFirm: { select: { name: true } } },
      },
    },
  })

  for (const row of rows) {
    const attorney = row.attorney
    const email = normalizeEmail(row.email)
    const stale =
      !attorney ||
      !attorney.isActive ||
      attorney.claimStatus !== 'unclaimed' ||
      normalizeEmail(attorney.email) !== email ||
      (await isEmailSuppressed(email))
    if (stale) {
      await db.profileClaim.update({ where: { id: row.id }, data: { status: 'cancelled' } })
      result.skipped += 1
      continue
    }

    const sent = await sendClaimEmail(
      buildClaimInviteEmail({
        to: row.email,
        attorneyName: attorney.name,
        firmName: attorney.lawFirm?.name ?? null,
        token: row.token,
        postalAddress: config.postalAddress as string,
        fromEmail: config.fromEmail,
        replyTo: config.replyTo,
      }),
    )

    if (sent) {
      const now = new Date()
      await db.$transaction([
        db.profileClaim.update({
          where: { id: row.id },
          data: {
            status: 'sent',
            sentAt: now,
            expiresAt: new Date(now.getTime() + CLAIM_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
            sendAttempts: { increment: 1 },
            sendError: null,
          },
        }),
        db.attorney.update({ where: { id: attorney.id }, data: { claimStatus: 'pending' } }),
      ])
      result.sent += 1
    } else {
      const attempts = (row.sendAttempts || 0) + 1
      await db.profileClaim.update({
        where: { id: row.id },
        data: {
          sendAttempts: attempts,
          sendError: 'Email provider did not accept the message',
          ...(attempts >= MAX_SEND_ATTEMPTS ? { status: 'failed' } : {}),
        },
      })
      result.failed += 1
    }
  }

  result.remainingQueued = await remainingQueued()
  if (result.sent || result.failed || result.skipped) {
    logger.info('Claim invite sweep sent a slice', { ...result })
  }
  return result
}

export type InviteBatchSummary = {
  batchId: string
  createdAt: string
  filters: InviteFilters | null
  counts: Record<string, number>
  total: number
}

export async function listInviteBatches(limit = 20): Promise<InviteBatchSummary[]> {
  const grouped = await db.profileClaim.groupBy({
    by: ['batchId', 'status'],
    where: { batchId: { not: null } },
    _count: { _all: true },
    _min: { createdAt: true },
  })
  const batches = new Map<string, InviteBatchSummary>()
  for (const row of grouped) {
    const id = row.batchId as string
    const createdAt = (row._min?.createdAt as Date | undefined)?.toISOString() ?? ''
    const entry = batches.get(id) ?? { batchId: id, createdAt, filters: null, counts: {}, total: 0 }
    entry.counts[row.status] = (entry.counts[row.status] || 0) + row._count._all
    entry.total += row._count._all
    if (createdAt && (!entry.createdAt || createdAt < entry.createdAt)) entry.createdAt = createdAt
    batches.set(id, entry)
  }
  const list = [...batches.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)

  // Filters are stored on every row of a batch; one row is enough to read them.
  for (const batch of list) {
    const sample = await db.profileClaim.findFirst({ where: { batchId: batch.batchId }, select: { meta: true } })
    try {
      batch.filters = sample?.meta ? (JSON.parse(sample.meta).filters ?? null) : null
    } catch {
      batch.filters = null
    }
  }
  return list
}
