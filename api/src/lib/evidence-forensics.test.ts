import { describe, it, expect } from 'vitest'
import {
  capturedAt,
  editingSoftware,
  isImageFile,
  parseExif,
  photoForensics,
  type ForensicFile,
} from './evidence-forensics'

const INCIDENT = '2026-06-15'

/** A photo file carrying the given EXIF tags. */
function photo(name: string, exif: Record<string, unknown> | null): ForensicFile {
  return {
    originalName: name,
    category: 'photos',
    mimetype: 'image/jpeg',
    exifData: exif ? JSON.stringify(exif) : null,
  }
}

describe('parseExif', () => {
  it('returns null for the absent and the unreadable alike', () => {
    expect(parseExif(null)).toBeNull()
    expect(parseExif('')).toBeNull()
    expect(parseExif('   ')).toBeNull()
    expect(parseExif('not json')).toBeNull()
  })

  it('rejects a JSON array, which carries no tags to read', () => {
    expect(parseExif('[1,2,3]')).toBeNull()
  })

  it('reads a tag object back', () => {
    expect(parseExif('{"Make":"Apple"}')).toEqual({ Make: 'Apple' })
  })
})

describe('capturedAt', () => {
  it('prefers DateTimeOriginal, the tag a resave cannot move', () => {
    const at = capturedAt({
      DateTimeOriginal: '2026-06-15T14:00:00.000Z',
      CreateDate: '2026-06-16T14:00:00.000Z',
    })
    expect(at?.toISOString()).toBe('2026-06-15T14:00:00.000Z')
  })

  it('falls back to CreateDate', () => {
    const at = capturedAt({ CreateDate: '2026-06-16T14:00:00.000Z' })
    expect(at?.toISOString()).toBe('2026-06-16T14:00:00.000Z')
  })

  it('ignores ModifyDate, which dates the copy rather than the event', () => {
    expect(capturedAt({ ModifyDate: '2026-06-16T14:00:00.000Z' })).toBeNull()
  })

  it('returns null for an unparseable timestamp', () => {
    expect(capturedAt({ DateTimeOriginal: 'sometime last summer' })).toBeNull()
    expect(capturedAt(null)).toBeNull()
  })
})

describe('editingSoftware', () => {
  it('names a recognised editor', () => {
    expect(editingSoftware({ Software: 'Adobe Photoshop 25.0 (Windows)' })).toBe('Adobe Photoshop')
    expect(editingSoftware({ Software: 'GIMP 2.10.34' })).toBe('GIMP')
    expect(editingSoftware({ ProcessingSoftware: 'Snapseed' })).toBe('Snapseed')
  })

  it('lets an ordinary phone pipeline through untouched', () => {
    // The direction to be wrong in: an unrecognised tag is not a mark against
    // the claimant, so phone OS versions and HDR stacks pass silently.
    expect(editingSoftware({ Software: '17.1.1' })).toBeNull()
    expect(editingSoftware({ Software: 'HDR+ 1.0.540104767zd' })).toBeNull()
    expect(editingSoftware({ Make: 'Apple', Model: 'iPhone 15' })).toBeNull()
    expect(editingSoftware({})).toBeNull()
  })
})

describe('isImageFile', () => {
  it('accepts the photos category and any image mimetype', () => {
    expect(isImageFile({ category: 'photos' })).toBe(true)
    expect(isImageFile({ category: 'bills', mimetype: 'image/png' })).toBe(true)
  })

  it('rejects a PDF', () => {
    expect(isImageFile({ category: 'bills', mimetype: 'application/pdf' })).toBe(false)
  })
})

describe('photoForensics — capture date against the incident', () => {
  it('flags a photo taken well before the incident', () => {
    const { predatesIncident } = photoForensics(
      [photo('damage.jpg', { DateTimeOriginal: '2026-05-01T10:00:00.000Z' })],
      INCIDENT,
    )
    expect(predatesIncident).toHaveLength(1)
    // 45 days less the 10-hour offset, floored — the gap is always reported
    // conservatively rather than rounded up against the claimant.
    expect(predatesIncident[0]).toMatchObject({ name: 'damage.jpg', daysBefore: 44 })
  })

  it('does not flag a photo taken the day of the incident', () => {
    // EXIF is local wall clock and the incident date is UTC midnight, so a
    // genuine same-day photo can read as hours early.
    const { predatesIncident } = photoForensics(
      [photo('scene.jpg', { DateTimeOriginal: '2026-06-14T21:00:00.000Z' })],
      INCIDENT,
    )
    expect(predatesIncident).toHaveLength(0)
  })

  it('absorbs a day of clock drift', () => {
    const { predatesIncident } = photoForensics(
      [photo('scene.jpg', { DateTimeOriginal: '2026-06-14T00:00:00.000Z' })],
      INCIDENT,
    )
    expect(predatesIncident).toHaveLength(0)
  })

  it('treats a decades-early timestamp as a dead battery, not a lie', () => {
    const { predatesIncident } = photoForensics(
      [photo('scene.jpg', { DateTimeOriginal: '2000-01-01T00:00:00.000Z' })],
      INCIDENT,
    )
    expect(predatesIncident).toHaveLength(0)
  })

  it('does not flag a photo taken after the incident', () => {
    const { predatesIncident } = photoForensics(
      [photo('scene.jpg', { DateTimeOriginal: '2026-07-01T00:00:00.000Z' })],
      INCIDENT,
    )
    expect(predatesIncident).toHaveLength(0)
  })

  it('says nothing about dates when the case has no incident date', () => {
    const { predatesIncident } = photoForensics(
      [photo('scene.jpg', { DateTimeOriginal: '2000-01-01T00:00:00.000Z' })],
      undefined,
    )
    expect(predatesIncident).toHaveLength(0)
  })
})

describe('photoForensics — what wrote the file', () => {
  it('reports the editor and the file it came from', () => {
    const { editedInSoftware } = photoForensics(
      [photo('bill.jpg', { Software: 'Adobe Photoshop 25.0' })],
      INCIDENT,
    )
    expect(editedInSoftware).toEqual([{ name: 'bill.jpg', software: 'Adobe Photoshop' }])
  })

  it('still reports the editor when there is no incident date to compare against', () => {
    const { editedInSoftware } = photoForensics(
      [photo('bill.jpg', { Software: 'GIMP 2.10' })],
      null,
    )
    expect(editedInSoftware).toHaveLength(1)
  })
})

describe('photoForensics — what it declines to look at', () => {
  it('skips non-image evidence', () => {
    const pdf: ForensicFile = {
      originalName: 'records.pdf',
      category: 'medical_records',
      mimetype: 'application/pdf',
      exifData: JSON.stringify({ Software: 'Adobe Photoshop 25.0' }),
    }
    expect(photoForensics([pdf], INCIDENT).editedInSoftware).toHaveLength(0)
  })

  it('holds nothing against a photo with no metadata at all', () => {
    // Stripped EXIF is already its own low-severity signal in the gate.
    // Counting it here too would turn a screenshot into a forgery.
    const bare = photoForensics([photo('screenshot.png', null)], INCIDENT)
    expect(bare.predatesIncident).toHaveLength(0)
    expect(bare.editedInSoftware).toHaveLength(0)
  })

  it('falls back to a generic label when the filename is missing', () => {
    const unnamed: ForensicFile = {
      originalName: null,
      category: 'photos',
      exifData: JSON.stringify({ Software: 'PicsArt' }),
    }
    expect(photoForensics([unnamed], INCIDENT).editedInSoftware[0].name).toBe('an uploaded photo')
  })
})
