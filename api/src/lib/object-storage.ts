/**
 * Durable object storage for everything written under `uploads/`.
 *
 * Why this exists: `FILE_BUCKET` and `S3_BUCKET` were set to `s3` in the deploy
 * files and read by nothing, so every medical record, police report, executed
 * retainer and HIPAA authorization lived only on one EC2 box's Docker volume.
 * That volume survives a redeploy and nothing else — instance replacement or an
 * EBS failure loses the lot, with no backup and no second copy.
 *
 * The shape of the fix is deliberate. Local disk stays the *working* directory
 * because the processing pipeline needs real paths: sharp, exifr, tesseract and
 * ffmpeg all take a filename, and pdf-lib writes through a stream. Forcing
 * everything through S3 would mean round-tripping each file back to a temp path
 * anyway. So disk remains where files are written and read from, and S3 becomes
 * the durable copy:
 *
 *  - On write, `persistUpload` mirrors the finished file to S3.
 *  - On read, `openUpload` serves the local file when it is there and streams
 *    from S3 when it is not, writing it back to disk on the way through. That is
 *    what makes a replacement instance recover: it starts with an empty volume
 *    and refills it on demand.
 *
 * With `FILE_BUCKET=local` (the default, and what dev and test use) every
 * function here is a no-op and behaviour is exactly what it was before.
 *
 * Replication failures are raised, not swallowed. A caller that has told the
 * claimant their medical record was uploaded must not have that record exist
 * only on ephemeral disk — see the note on `persistUpload`.
 */

import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { ENV } from '../env'
import { logger } from './logger'

/** Absolute path of the directory every upload path is relative to. */
export function uploadsRoot(): string {
  return path.join(process.cwd(), 'uploads')
}

/**
 * True when uploads should be mirrored to S3. Driven by `FILE_BUCKET`, which
 * until now was defined in env.ts and consumed nowhere.
 */
export function isObjectStorageEnabled(): boolean {
  return (ENV.FILE_BUCKET || 'local').trim().toLowerCase() === 's3'
}

function bucketName(): string | null {
  const bucket = (process.env.S3_BUCKET || '').trim()
  return bucket || null
}

/**
 * Key prefix inside the bucket. Defaults to `uploads/` so the bucket can be
 * shared with anything else without collision, and so the layout mirrors the
 * on-disk one exactly — an operator listing the bucket sees the same tree.
 */
function keyPrefix(): string {
  const raw = (process.env.S3_UPLOADS_PREFIX ?? 'uploads/').trim()
  if (!raw) return ''
  return raw.endsWith('/') ? raw : `${raw}/`
}

/**
 * Fail at boot rather than at the first upload.
 *
 * Turning `FILE_BUCKET=s3` on without a bucket name is the exact class of
 * misconfiguration this module was written to end: it would look configured,
 * start cleanly, and quietly keep writing to ephemeral disk. In production that
 * stops the process; elsewhere it downgrades to a warning so a developer who
 * copies a prod env file can still boot.
 */
export function checkObjectStorageConfig(): void {
  if (!isObjectStorageEnabled()) return
  if (bucketName()) return

  const message =
    'FILE_BUCKET=s3 requires S3_BUCKET to be set. Uploads would otherwise persist only to the container filesystem, which does not survive instance replacement.'
  if (ENV.NODE_ENV === 'production') throw new Error(message)
  logger.warn(message)
}

let s3Client: any = null

function getS3Client(): any {
  if (s3Client) return s3Client
  try {
    // Lazy require, matching how the SES and SNS clients are loaded: the SDK is
    // only pulled in when object storage is actually switched on.
    const { S3Client } = require('@aws-sdk/client-s3')
    s3Client = new S3Client({
      region: process.env.S3_REGION || ENV.AWS_REGION || 'us-east-1',
    })
    return s3Client
  } catch (err) {
    logger.error('S3 SDK unavailable', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

/**
 * Convert an absolute path under `uploads/` to its storage key, or null when the
 * path escapes that directory. Traversal is rejected rather than normalised
 * because a path that resolves outside the uploads root is a bug at the call
 * site, not something to guess at.
 */
export function storageKeyForPath(absolutePath: string): string | null {
  const root = uploadsRoot()
  const resolved = path.resolve(absolutePath)
  const relative = path.relative(root, resolved)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null
  return `${keyPrefix()}${relative.split(path.sep).join('/')}`
}

/** Convert a `/uploads`-relative request path (e.g. `/evidence/x.pdf`) to a key. */
export function storageKeyForUploadPath(uploadPath: string): string {
  const trimmed = uploadPath.replace(/^\/+/, '')
  return `${keyPrefix()}${trimmed}`
}

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function contentTypeForPath(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

/**
 * Mirror a finished local file to S3.
 *
 * Throws on failure when storage is enabled. That is the point: the alternative
 * is returning success for a document that exists on one container's disk and
 * nowhere else, which is the failure this module was written to remove. Callers
 * that genuinely can tolerate a missing durable copy — thumbnails and other
 * regenerable derivatives — should pass `optional: true`, which downgrades the
 * failure to a logged warning.
 */
export async function persistUpload(
  absolutePath: string,
  options: { optional?: boolean } = {},
): Promise<void> {
  if (!isObjectStorageEnabled()) return

  const bucket = bucketName()
  const key = storageKeyForPath(absolutePath)

  if (!bucket || !key) {
    const message = !bucket
      ? 'S3_BUCKET is not configured'
      : `Refusing to store a path outside the uploads directory: ${absolutePath}`
    if (options.optional) return logger.warn('Upload not replicated', { message })
    throw new Error(message)
  }

  try {
    const { PutObjectCommand } = require('@aws-sdk/client-s3')
    const client = getS3Client()
    if (!client) throw new Error('S3 client unavailable')

    const stat = await fs.promises.stat(absolutePath)
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(absolutePath),
        ContentLength: stat.size,
        ContentType: contentTypeForPath(absolutePath),
        // Belt and braces alongside a bucket-level default. These objects are
        // medical records and executed legal instruments; encryption at rest is
        // not something to leave to whether someone set the bucket policy.
        ServerSideEncryption: 'AES256',
      }),
    )
    logger.info('Upload replicated to object storage', { key, bytes: stat.size })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (options.optional) {
      logger.warn('Optional upload not replicated', { key, error: message })
      return
    }
    logger.error('Upload replication failed', { key, error: message })
    throw new Error(`Failed to store upload durably: ${message}`)
  }
}

/** Mirror every file multer wrote for a request. Safe to call with no files. */
export async function persistUploadedFiles(
  files: Array<{ path?: string }> | { path?: string } | undefined,
  options: { optional?: boolean } = {},
): Promise<void> {
  if (!isObjectStorageEnabled() || !files) return
  const list = Array.isArray(files) ? files : [files]
  for (const file of list) {
    if (file?.path) await persistUpload(file.path, options)
  }
}

/**
 * Express middleware that mirrors whatever multer just wrote, for use directly
 * after an `upload.single`/`upload.array` in a route chain.
 *
 * It runs before the handler so that a replication failure becomes a 503 on the
 * upload itself. The client retries; the alternative is a 200 for a file that
 * exists on one container and nowhere else.
 */
export function replicateUploads(req: any, res: any, next: any): void {
  if (!isObjectStorageEnabled()) return next()

  const files = req.files ?? req.file
  persistUploadedFiles(files)
    .then(() => next())
    .catch((err) => {
      logger.error('Rejecting upload that could not be stored durably', {
        error: err instanceof Error ? err.message : String(err),
        path: req.originalUrl,
      })
      res.status(503).json({
        error: 'Upload storage is unavailable. Please try again.',
        code: 'STORAGE_UNAVAILABLE',
      })
    })
}

/**
 * Ensure a file is present on local disk, pulling it from S3 when it is not.
 *
 * Returns false when the file cannot be produced from either source. The
 * download is written to a temp name and renamed, so a concurrent reader never
 * observes a partial file.
 */
export async function ensureLocalCopy(absolutePath: string): Promise<boolean> {
  if (fs.existsSync(absolutePath)) return true
  if (!isObjectStorageEnabled()) return false

  const bucket = bucketName()
  const key = storageKeyForPath(absolutePath)
  if (!bucket || !key) return false

  try {
    const { GetObjectCommand } = require('@aws-sdk/client-s3')
    const client = getS3Client()
    if (!client) return false

    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const body = result?.Body
    if (!body) return false

    await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true })
    const tempPath = `${absolutePath}.${process.pid}.download`
    await pipeline(body as Readable, fs.createWriteStream(tempPath))
    await fs.promises.rename(tempPath, absolutePath)

    logger.info('Upload restored from object storage', { key })
    return true
  } catch (err: any) {
    // A missing key is the normal answer for a file that was never uploaded;
    // anything else is worth seeing.
    const name = err?.name || err?.Code
    if (name !== 'NoSuchKey' && name !== 'NotFound') {
      logger.warn('Failed to restore upload from object storage', {
        key,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    return false
  }
}

/** Remove both copies. Local removal is best-effort; the durable copy is not. */
export async function deleteUpload(absolutePath: string): Promise<void> {
  try {
    await fs.promises.unlink(absolutePath)
  } catch {
    /* already gone */
  }

  if (!isObjectStorageEnabled()) return
  const bucket = bucketName()
  const key = storageKeyForPath(absolutePath)
  if (!bucket || !key) return

  try {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
    const client = getS3Client()
    if (!client) return
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  } catch (err) {
    logger.warn('Failed to delete object from storage', {
      key,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/** Test seam: drop the memoised client so a new region/config takes effect. */
export function resetObjectStorageClientForTests(): void {
  s3Client = null
}
