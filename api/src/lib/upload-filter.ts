/**
 * Shared "is this file acceptable?" decision for multer upload filters.
 *
 * This lives in one place because it did not used to. The evidence route learned
 * the hard way that MIME-only filtering silently drops legitimate files, fixed
 * itself, and left the tokenized document portal behind with a copy of the old
 * logic — so an external recipient (or a claimant sent a portal link) could not
 * upload a declarations page photographed on an iPhone.
 */
import path from 'path'

export const DOCUMENT_UPLOAD_MIMETYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export const DOCUMENT_UPLOAD_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif',
  '.mp4', '.mov', '.webm',
  '.pdf', '.txt', '.doc', '.docx',
])

/** Spreadsheets — carriers and adjusters routinely send benefits ledgers as .xlsx. */
export const SPREADSHEET_MIMETYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export const SPREADSHEET_EXTENSIONS = new Set(['.xls', '.xlsx'])

/**
 * Decide whether a picked file is an accepted document. Some browsers/OSes
 * (notably Windows, and iPhone HEIC photos) report a missing or generic MIME
 * type for the same file that has a perfectly valid extension. Relying on MIME
 * alone silently drops those files (multer sets req.file = undefined), which
 * surfaces only as a confusing "No file uploaded" 400. Fall back to the file
 * extension whenever the MIME type is absent, generic, or a broad image/video type.
 */
export function isAcceptedUpload(
  file: { mimetype?: string; originalname?: string },
  opts?: { mimetypes?: Set<string>; extensions?: Set<string> },
): boolean {
  const mime = (file.mimetype || '').toLowerCase()
  if (DOCUMENT_UPLOAD_MIMETYPES.has(mime)) return true
  if (opts?.mimetypes?.has(mime)) return true

  const ext = path.extname(file.originalname || '').toLowerCase()
  const genericMime =
    !mime ||
    mime === 'application/octet-stream' ||
    mime === 'binary/octet-stream' ||
    mime.startsWith('image/') ||
    mime.startsWith('video/')
  if (!genericMime) return false
  return DOCUMENT_UPLOAD_EXTENSIONS.has(ext) || Boolean(opts?.extensions?.has(ext))
}
