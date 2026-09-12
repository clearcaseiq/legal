/**
 * Re-drive document extraction that never finished.
 *
 * Extraction is kicked off as a detached promise on the request that created the
 * file, so a deploy or a crash mid-OCR loses the work with no trace beyond an
 * `EvidenceProcessingJob` left sitting in `running`. That was survivable while
 * every document arrived by upload — the claimant still had the file and could
 * upload it again once they noticed the case never updated.
 *
 * Texted documents removed that safety net. A claimant photographs a bill,
 * sends it, gets told it was received, and deletes nothing but also re-sends
 * nothing. If our extraction dies, the bill is on the case as an unreadable
 * image and the damages figure silently omits it.
 *
 * This is the same table-plus-sweep shape the notification retry loop uses, for
 * the same reason: there is no queue infrastructure in this deployment, and a
 * row in a table someone sweeps is the durable primitive available.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { processEvidenceFileForExtraction } from './evidence-processing'

/** A queued job nothing picked up. Short, because the kick-off is synchronous. */
export const STALE_QUEUED_MS = 5 * 60 * 1000

/**
 * A running job that stopped reporting. Generous: Textract on a long PDF is
 * legitimately slow, and re-driving a job that is merely still working wastes
 * an OCR call and races the original to the same transaction.
 */
export const STALE_RUNNING_MS = 15 * 60 * 1000

/** Bounded so one bad batch cannot occupy the instance for a whole interval. */
export const MAX_JOBS_PER_RUN = 25

export interface EvidenceProcessingSweepResult {
  consideredCount: number
  reprocessedCount: number
  failedCount: number
}

/**
 * Jobs that look abandoned rather than merely slow.
 *
 * Deliberately excludes `failed`: a job that ran and threw has already reached a
 * verdict, and retrying it on a timer would mean an unreadable photo is OCR'd
 * every fifteen minutes forever.
 */
export async function stalledJobs(now: Date = new Date()) {
  return prisma.evidenceProcessingJob.findMany({
    where: {
      OR: [
        { status: 'queued', createdAt: { lt: new Date(now.getTime() - STALE_QUEUED_MS) } },
        { status: 'running', startedAt: { lt: new Date(now.getTime() - STALE_RUNNING_MS) } },
      ],
      // If the file already completed, the job row is just stale bookkeeping and
      // reprocessing would overwrite good extraction with a second run of it.
      evidenceFile: { processingStatus: { in: ['pending', 'processing'] } },
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_JOBS_PER_RUN,
    select: { id: true, evidenceFileId: true, status: true },
  })
}

export async function runEvidenceProcessingSweep(): Promise<EvidenceProcessingSweepResult> {
  const jobs = await stalledJobs()
  let reprocessedCount = 0
  let failedCount = 0

  for (const job of jobs) {
    try {
      await processEvidenceFileForExtraction(job.evidenceFileId)
      reprocessedCount += 1
    } catch (error: any) {
      failedCount += 1
      // One unreadable document must not stop the rest of the batch. The call
      // above already marked the file failed, so it will not be picked up again.
      logger.warn('Re-driving a stalled evidence job failed', {
        jobId: job.id,
        evidenceFileId: job.evidenceFileId,
        error: error?.message,
      })
    }
  }

  return { consideredCount: jobs.length, reprocessedCount, failedCount }
}
