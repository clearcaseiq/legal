/**
 * What a photograph's own metadata says about it.
 *
 * The fraud gate has always carried a signal for "documents appear altered". It
 * read `EvidenceFile.aiClassification` and matched it against
 * /suspicious|tamper|altered|fraud|forg/. But that column is written by
 * `classifyEvidence`, which decides whether a file is a medical record or a
 * police report. It has no vocabulary for forgery and has never emitted any of
 * those words. So the heaviest signal in the gate — 45 points, high severity,
 * enough to hold a case on its own — could not fire, and the gate advertised a
 * defence it did not have.
 *
 * This module supplies the evidence that signal was asking for, out of data the
 * upload path already stores. `extractEXIFData` has run exifr over every JPEG
 * and PNG since evidence upload existed, and the result sits in
 * `EvidenceFile.exifData` as JSON. The gate previously used it for one thing:
 * noticing when *every* photo on a case had no metadata at all.
 *
 * Two questions are worth asking of that blob.
 *
 * ## When was this taken?
 *
 * `DateTimeOriginal` is written by the camera at the moment of capture. A
 * photograph of the damage taken before the collision is not a photograph of
 * this collision, and that is about as close to conclusive as metadata gets.
 *
 * The tolerances matter more than the rule. EXIF timestamps are local wall
 * clock carrying no zone, while an incident date is a bare date parsed as UTC
 * midnight, so a genuine photo taken on the afternoon of the incident can read
 * as hours early. Camera clocks also drift, and one whose battery died reports
 * 1970 or 2000 rather than anything meaningful. The window is therefore bounded
 * at both ends: more than two days early is not timezone skew, and more than
 * ten years early is a dead clock rather than a lie.
 *
 * `ModifyDate` is deliberately not consulted. It moves every time a file is
 * resaved, including by entirely innocent transfers, so it dates the copy
 * rather than the event.
 *
 * ## What has been through it?
 *
 * The `Software` tag names whatever last wrote the file. Matching is against an
 * explicit list of image editors rather than a list of acceptable cameras,
 * which is the safe direction to be wrong in: an unrecognised tag passes. Phone
 * pipelines write their OS version, their HDR stack and their vendor name, and
 * none of those should be a mark against a claimant.
 *
 * Presence of an editor is not proof of anything — cropping a licence plate out
 * of a photo before uploading it is careful, not dishonest — which is why it is
 * scored as a medium signal that needs corroboration rather than a hold on its
 * own. Apple Photos and the stock crop tools are left off the list entirely for
 * the same reason.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * How early a capture timestamp may read before it means anything. Absorbs the
 * zone gap between local EXIF time and a UTC-midnight incident date, plus the
 * ordinary drift of a clock nobody has set in a year.
 */
const CLOCK_SKEW_DAYS = 2

/**
 * Past this, the camera's clock was reset rather than the photo being old. A
 * dead battery reports 1970 or 2000, and neither is a claim about the incident.
 */
const DEAD_CLOCK_DAYS = 3650

/** Editors whose name on a claim photo is worth a second look. */
const EDITOR_SIGNATURES: Array<[RegExp, string]> = [
  [/photoshop/i, 'Adobe Photoshop'],
  [/lightroom/i, 'Adobe Lightroom'],
  [/\bgimp\b/i, 'GIMP'],
  [/affinity\s*photo/i, 'Affinity Photo'],
  [/paint\.net/i, 'Paint.NET'],
  [/\bpixlr\b/i, 'Pixlr'],
  [/snapseed/i, 'Snapseed'],
  [/picsart/i, 'PicsArt'],
  [/facetune/i, 'Facetune'],
  [/\bfotor\b/i, 'Fotor'],
  [/\bcanva\b/i, 'Canva'],
  [/\bremini\b/i, 'Remini'],
  [/inpaint|touch\s*retouch/i, 'a retouching tool'],
  [/midjourney|dall-?e|stable\s*diffusion|firefly/i, 'a generative image model'],
]

export interface ForensicFile {
  originalName?: string | null
  category?: string | null
  mimetype?: string | null
  exifData?: string | null
}

export interface PhotoForensics {
  /** Photos whose capture timestamp sits implausibly before the incident. */
  predatesIncident: Array<{ name: string; capturedAt: Date; daysBefore: number }>
  /** Photos whose metadata names an image editor. */
  editedInSoftware: Array<{ name: string; software: string }>
}

/** Matches the gate's long-standing definition, shared so the two cannot drift. */
export function isImageFile(file: { category?: string | null; mimetype?: string | null }): boolean {
  return file.category === 'photos' || /^image\//i.test(String(file.mimetype || ''))
}

/** The stored blob, or null for the absent and the unparseable alike. */
export function parseExif(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw || !String(raw).trim()) return null
  try {
    const parsed = JSON.parse(String(raw))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** When the camera says the shutter fired, preferring the tag it cannot resave. */
export function capturedAt(exif: Record<string, unknown> | null): Date | null {
  if (!exif) return null
  for (const tag of ['DateTimeOriginal', 'CreateDate']) {
    const value = exif[tag]
    if (value === null || value === undefined || value === '') continue
    const date = new Date(value as string)
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}

/** The editor named in the metadata, or null for anything unrecognised. */
export function editingSoftware(exif: Record<string, unknown> | null): string | null {
  if (!exif) return null
  for (const tag of [exif.Software, exif.ProcessingSoftware]) {
    const value = String(tag ?? '').trim()
    if (!value) continue
    for (const [pattern, name] of EDITOR_SIGNATURES) {
      if (pattern.test(value)) return name
    }
  }
  return null
}

/**
 * Read every photo on a case against the date it is supposed to document.
 *
 * Files with no EXIF contribute nothing rather than counting against the
 * claimant: stripped metadata is already its own low-severity signal in the
 * gate, and counting it twice would turn a screenshot into a forgery.
 */
export function photoForensics(
  files: ForensicFile[],
  incidentDate?: string | null,
): PhotoForensics {
  const parsedIncident = incidentDate ? new Date(incidentDate) : null
  const incident =
    parsedIncident && !Number.isNaN(parsedIncident.getTime()) ? parsedIncident : null

  const predatesIncident: PhotoForensics['predatesIncident'] = []
  const editedInSoftware: PhotoForensics['editedInSoftware'] = []

  for (const file of files) {
    if (!isImageFile(file)) continue
    const exif = parseExif(file.exifData)
    if (!exif) continue

    const name = String(file.originalName || '').trim() || 'an uploaded photo'

    const software = editingSoftware(exif)
    if (software) editedInSoftware.push({ name, software })

    if (!incident) continue
    const taken = capturedAt(exif)
    if (!taken) continue

    const daysBefore = Math.floor((incident.getTime() - taken.getTime()) / DAY_MS)
    if (daysBefore > CLOCK_SKEW_DAYS && daysBefore <= DEAD_CLOCK_DAYS) {
      predatesIncident.push({ name, capturedAt: taken, daysBefore })
    }
  }

  return { predatesIncident, editedInSoftware }
}
