import { describe, expect, it } from 'vitest'
import { isAcceptedUpload, SPREADSHEET_EXTENSIONS, SPREADSHEET_MIMETYPES } from './upload-filter'

const portalOpts = { mimetypes: SPREADSHEET_MIMETYPES, extensions: SPREADSHEET_EXTENSIONS }

describe('isAcceptedUpload', () => {
  it('accepts the ordinary document types', () => {
    expect(isAcceptedUpload({ mimetype: 'application/pdf', originalname: 'dec-page.pdf' })).toBe(true)
    expect(isAcceptedUpload({ mimetype: 'image/jpeg', originalname: 'photo.jpg' })).toBe(true)
  })

  // The failure this module exists for: an iPhone photo of a declarations page
  // arrives as HEIC, often with a generic or absent MIME type. A MIME-only
  // filter drops it, multer leaves req.file undefined, and the uploader is told
  // "No file uploaded" with no way to tell what went wrong.
  it('accepts an iPhone HEIC photo however the MIME type arrives', () => {
    for (const mimetype of ['image/heic', 'image/heif', 'application/octet-stream', '']) {
      expect(isAcceptedUpload({ mimetype, originalname: 'dec-page.HEIC' })).toBe(true)
    }
  })

  it('falls back to the extension when the browser sends a generic MIME type', () => {
    expect(isAcceptedUpload({ mimetype: 'application/octet-stream', originalname: 'scan.pdf' })).toBe(true)
    expect(isAcceptedUpload({ mimetype: '', originalname: 'notes.docx' })).toBe(true)
  })

  it('rejects an executable even behind a generic MIME type', () => {
    expect(isAcceptedUpload({ mimetype: 'application/octet-stream', originalname: 'payload.exe' })).toBe(false)
    expect(isAcceptedUpload({ mimetype: 'application/x-msdownload', originalname: 'payload.exe' })).toBe(false)
  })

  // An exactly-matching MIME type is trusted on its own, without consulting the
  // extension — browsers that report a precise type are believed, since plenty
  // of legitimate uploads arrive with an odd or missing filename. Only the
  // generic-MIME fallback requires a recognized extension.
  it('trusts an exact MIME match regardless of the filename', () => {
    expect(isAcceptedUpload({ mimetype: 'application/pdf', originalname: 'scan' })).toBe(true)
    expect(isAcceptedUpload({ mimetype: 'image/png', originalname: '' })).toBe(true)
  })

  it('rejects an unlisted MIME type outright', () => {
    expect(isAcceptedUpload({ mimetype: 'application/zip', originalname: 'archive.zip' })).toBe(false)
    expect(isAcceptedUpload({ mimetype: 'text/html', originalname: 'page.html' })).toBe(false)
  })

  it('takes spreadsheets only where the caller opts in', () => {
    const xlsx = {
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      originalname: 'benefits-ledger.xlsx',
    }
    expect(isAcceptedUpload(xlsx, portalOpts)).toBe(true)
    expect(isAcceptedUpload(xlsx)).toBe(false)
    expect(isAcceptedUpload({ mimetype: '', originalname: 'ledger.xls' }, portalOpts)).toBe(true)
  })
})
