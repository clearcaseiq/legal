/**
 * Background builds of the PDF demand package.
 *
 * A package with a full medical record set can run to the 1,500-page cap, which
 * is too long to hold an HTTP request open for. A build is queued as a
 * DemandPackage row and run in-process straight away; a sweep picks up rows a
 * restart or crash left behind. Builds run one at a time per instance because
 * each holds every exhibit PDF in memory while it binds them.
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { prisma } from './prisma'
import { logger } from './logger'
import { ensureLocalCopy, persistUpload, uploadsRoot } from './object-storage'
import { buildDemandPackagePdf, normalizeBates, type BatesOptions, type ExhibitChoice } from './demand-pdf-package'
import { notifyAttorneyInApp } from './case-notifications'
import { ATTORNEY_EVENTS } from './notification-events'

export const MAX_BUILD_ATTEMPTS = 3
/** A build still "building" after this long belonged to an instance that died. */
const STALE_BUILD_MS = 20 * 60 * 1000
export const SHARE_LINK_DAYS = 30

export interface PackageConfig {
  exhibits: ExhibitChoice[] | null
  bates: BatesOptions | null
}

export function normalizePackageConfig(raw: any): PackageConfig {
  const exhibits = Array.isArray(raw?.exhibits)
    ? raw.exhibits
        .filter((e: any) => e && typeof e.key === 'string' && e.key.length <= 200)
        .slice(0, 500)
        .map((e: any) => ({ key: e.key, include: e.include !== false }))
    : null
  return { exhibits, bates: normalizeBates(raw?.bates) }
}

function parseConfig(raw: string | null): PackageConfig {
  if (!raw) return { exhibits: null, bates: null }
  try {
    return normalizePackageConfig(JSON.parse(raw))
  } catch {
    return { exhibits: null, bates: null }
  }
}

function outputPath(assessmentId: string, packageId: string): string {
  return path.join(uploadsRoot(), 'demand-packages', assessmentId, `${packageId}.pdf`)
}

export async function enqueueDemandPackage(input: {
  demandLetterId: string
  assessmentId: string
  config: PackageConfig
  requestedById: string | null
  requestedByName: string | null
  requestedByAttorneyId: string | null
}) {
  const row = await prisma.demandPackage.create({
    data: {
      demandLetterId: input.demandLetterId,
      assessmentId: input.assessmentId,
      config: JSON.stringify(input.config),
      requestedById: input.requestedById,
      requestedByName: input.requestedByName,
      requestedByAttorneyId: input.requestedByAttorneyId,
    },
  })
  scheduleBuild(row.id)
  return row
}

let chain: Promise<unknown> = Promise.resolve()

/** Queue a build behind whatever this instance is already building. */
export function scheduleBuild(packageId: string): void {
  chain = chain.then(() => runDemandPackage(packageId)).catch(() => undefined)
}

export async function runDemandPackage(packageId: string): Promise<void> {
  // Claim the row so a second instance (or the sweep) can't build it too.
  const claimed = await prisma.demandPackage.updateMany({
    where: { id: packageId, status: 'queued' },
    data: { status: 'building', startedAt: new Date(), attempts: { increment: 1 }, error: null },
  })
  if (!claimed.count) return

  const pkg = await prisma.demandPackage.findUnique({ where: { id: packageId } })
  if (!pkg) return
  const letter = await prisma.demandLetter.findUnique({
    where: { id: pkg.demandLetterId },
    select: { id: true, assessmentId: true, content: true, template: true, status: true, title: true, currentVersion: true },
  })
  if (!letter) {
    await prisma.demandPackage.update({ where: { id: packageId }, data: { status: 'failed', error: 'The demand letter no longer exists.' } })
    return
  }

  const config = parseConfig(pkg.config)
  const started = Date.now()
  try {
    const built = await buildDemandPackagePdf(letter, { selection: config.exhibits, bates: config.bates })
    const file = outputPath(letter.assessmentId, pkg.id)
    await fs.promises.mkdir(path.dirname(file), { recursive: true })
    await fs.promises.writeFile(file, built.bytes)
    await persistUpload(file)

    await prisma.demandPackage.update({
      where: { id: pkg.id },
      data: {
        status: 'ready',
        filePath: path.relative(process.cwd(), file),
        fileSize: built.bytes.length,
        pageCount: built.pageCount,
        exhibitCount: built.exhibitCount,
        batesPrefix: config.bates?.prefix ?? null,
        batesStart: config.bates?.start ?? null,
        batesEnd: built.batesEnd,
        letterVersion: letter.currentVersion,
        draft: letter.status === 'DRAFT',
        completedAt: new Date(),
      },
    })
    logger.info('Demand package built', { packageId: pkg.id, pages: built.pageCount, ms: Date.now() - started })
    await notifyReady(pkg, built.pageCount)
  } catch (error: any) {
    // `attempts` was incremented by the claim above, so it already counts this one.
    const retry = pkg.attempts < MAX_BUILD_ATTEMPTS
    logger.error('Demand package build failed', { packageId: pkg.id, attempt: pkg.attempts, error: error?.message })
    await prisma.demandPackage.update({
      where: { id: pkg.id },
      data: {
        status: retry ? 'queued' : 'failed',
        error: retry ? null : 'The package could not be built. Try again, or download the Word version.',
      },
    })
  }
}

async function notifyReady(pkg: { id: string; assessmentId: string; demandLetterId: string; requestedByAttorneyId: string | null; requestedById: string | null }, pages: number) {
  if (!pkg.requestedByAttorneyId) return
  const lead = await prisma.leadSubmission
    .findFirst({ where: { assessmentId: pkg.assessmentId }, select: { id: true } })
    .catch(() => null)
  await notifyAttorneyInApp({
    attorneyId: pkg.requestedByAttorneyId,
    userId: pkg.requestedById,
    assessmentId: pkg.assessmentId,
    eventType: ATTORNEY_EVENTS.demand_package_ready,
    subject: 'Demand package ready',
    body: `The PDF demand package (${pages} pages) is ready to download or send to the adjuster.`,
    leadId: lead?.id ?? null,
    link: lead ? `/attorney-dashboard/lead/${lead.id}/demand` : null,
    payload: { packageId: pkg.id, demandLetterId: pkg.demandLetterId },
  }).catch(() => false)
}

/** Requeue builds a dead instance left mid-flight, then build anything queued. */
export async function sweepDemandPackages(): Promise<{ requeued: number; started: number }> {
  const stale = await prisma.demandPackage.updateMany({
    where: { status: 'building', startedAt: { lt: new Date(Date.now() - STALE_BUILD_MS) } },
    data: { status: 'queued' },
  })
  await prisma.demandPackage.updateMany({
    where: { status: 'queued', attempts: { gte: MAX_BUILD_ATTEMPTS } },
    data: { status: 'failed', error: 'The package could not be built. Try again, or download the Word version.' },
  })
  const queued = await prisma.demandPackage.findMany({
    where: { status: 'queued', createdAt: { lt: new Date(Date.now() - 60 * 1000) } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 5,
  })
  for (const row of queued) scheduleBuild(row.id)
  return { requeued: stale.count, started: queued.length }
}

/** Absolute path of a built package on local disk, restoring it from object storage if needed. */
export async function packageFile(pkg: { filePath: string | null }): Promise<string | null> {
  if (!pkg.filePath) return null
  const abs = path.resolve(process.cwd(), pkg.filePath)
  return (await ensureLocalCopy(abs)) ? abs : null
}

export async function ensureShareLink(packageId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SHARE_LINK_DAYS * 24 * 60 * 60 * 1000)
  await prisma.demandPackage.update({ where: { id: packageId }, data: { shareToken: token, shareExpiresAt: expiresAt } })
  return { token, expiresAt }
}

export function packageView(pkg: any, currentVersion: number | null) {
  return {
    id: pkg.id,
    status: pkg.status as 'queued' | 'building' | 'ready' | 'failed',
    error: pkg.error ?? null,
    pageCount: pkg.pageCount ?? null,
    exhibitCount: pkg.exhibitCount ?? null,
    fileSize: pkg.fileSize ?? null,
    bates:
      pkg.batesPrefix && pkg.batesStart != null
        ? { prefix: pkg.batesPrefix, start: pkg.batesStart, end: pkg.batesEnd ?? null }
        : null,
    draft: Boolean(pkg.draft),
    stale: pkg.status === 'ready' && currentVersion != null && pkg.letterVersion != null && pkg.letterVersion !== currentVersion,
    sentTo: pkg.sentTo ?? null,
    sentAt: pkg.sentAt ? new Date(pkg.sentAt).toISOString() : null,
    downloadCount: pkg.downloadCount ?? 0,
    requestedByName: pkg.requestedByName ?? null,
    createdAt: new Date(pkg.createdAt).toISOString(),
    completedAt: pkg.completedAt ? new Date(pkg.completedAt).toISOString() : null,
  }
}
