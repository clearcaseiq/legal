/**
 * Read authorization for the `/uploads` static mount.
 *
 * The mount was previously open, so every file ever written under `uploads/`
 * was readable by URL alone. That directory holds the most sensitive material
 * on the platform — medical records and police reports under `evidence/`,
 * executed retainers and HIPAA authorizations under `signed-documents/`, and
 * attorney bar credentials under `licenses/`. Filenames are UUID-prefixed, but
 * an unguessable URL is a secret, not an authorization decision, and nothing
 * consulted `EvidenceFile.accessLevel` before serving.
 *
 * Three tiers, in order of how much can be known about the request:
 *
 *  - `avatars/` is public. Profile photos render in plain `<img>` tags that
 *    cannot carry an Authorization header, and a headshot is not case data.
 *  - `evidence/` and `scenes/` resolve back to the case that owns them, so they
 *    get the same per-case decision as every other read of that case via
 *    `canReadAssessment`.
 *  - Everything else requires a valid session. That is weaker than a per-object
 *    check, but these paths (signed documents, licenses) have no single owner
 *    column to resolve against, and requiring a session already closes the
 *    anonymous-internet hole. Tightening them further needs the per-object
 *    lookup those tables do not currently support.
 *
 * The web client already fetches these as authenticated blobs (see
 * `getEvidenceObjectUrl` and `downloadEvidenceByUrl`), so the bearer token is
 * present on the wire; this is the server finally reading it.
 */

import type { NextFunction, Response } from 'express'
import { prisma } from './prisma'
import { logger } from './logger'
import { canReadAssessment } from './assessment-access'
import { optionalAuthMiddleware, type AuthRequest } from './auth'

/** Served without a session; see the tiering note above. */
const PUBLIC_PREFIXES = ['/avatars/']

/** Resolvable to an owning assessment, so they get a per-case decision. */
const CASE_SCOPED_PREFIXES = ['/evidence/', '/scenes/']

function hasPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Resolve the assessment that owns an uploaded file, or null when the path does
 * not correspond to a known record.
 */
async function resolveOwningAssessmentId(uploadPath: string): Promise<string | null> {
  const fileUrl = `/uploads${uploadPath}`

  const evidence = await prisma.evidenceFile
    .findFirst({ where: { fileUrl }, select: { assessmentId: true } })
    .catch(() => null)
  if (evidence?.assessmentId) return evidence.assessmentId

  const scene = await prisma.assessment
    .findFirst({ where: { sceneImageUrl: fileUrl }, select: { id: true } })
    .catch(() => null)
  return scene?.id ?? null
}

export async function requireSessionForPrivateUploads(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  // `req.path` here is relative to the `/uploads` mount, e.g. `/evidence/x.pdf`.
  // Decode before matching so an encoded separator cannot dodge the prefix test,
  // and reject traversal outright rather than reasoning about what it resolves to.
  let pathname: string
  try {
    pathname = decodeURIComponent(req.path)
  } catch {
    return res.status(400).json({ error: 'Malformed path' })
  }

  const normalized = pathname.replace(/\\/g, '/')
  if (normalized.includes('..')) {
    return res.status(400).json({ error: 'Malformed path' })
  }

  if (hasPrefix(normalized, PUBLIC_PREFIXES)) return next()

  optionalAuthMiddleware(req, res, async () => {
    if (hasPrefix(normalized, CASE_SCOPED_PREFIXES)) {
      const assessmentId = await resolveOwningAssessmentId(normalized)

      // A file with no matching record cannot be authorized against a case.
      // Fall through to the session requirement rather than serving it openly —
      // this covers seed data and files whose record was deleted.
      if (assessmentId) {
        const decision = await canReadAssessment(assessmentId, req.user)
        if (decision.allowed) return next()

        if (decision.status === 403) {
          logger.warn('Blocked unauthorized upload read', {
            path: normalized,
            assessmentId,
            userId: req.user?.id ?? null,
          })
        }
        return res
          .status(decision.status || 403)
          .json({ error: decision.message || 'Not authorized' })
      }
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    return next()
  })
}
