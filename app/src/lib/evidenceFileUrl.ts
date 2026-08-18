import { getApiOrigin } from './runtimeEnv'

/**
 * Server-stored evidence files come back with a relative path
 * (e.g. "/uploads/evidence/abc.pdf") that is served by the API origin, not the
 * web app origin. Opening the bare relative URL resolved against the web app
 * and 404'd, so the Eye/preview button appeared to do nothing (#11). Blob/data
 * URLs (locally selected files not yet uploaded) and absolute URLs pass through
 * untouched.
 */
export function resolveEvidenceFileUrl(url?: string): string {
  if (!url) return ''
  if (/^(blob:|data:|https?:)/i.test(url)) return url
  return `${getApiOrigin()}${url.startsWith('/') ? '' : '/'}${url}`
}

function openBlobUrl(url: string) {
  // window.open(..., 'noopener,noreferrer') is unreliable/blocked in Chrome and
  // Firefox for blob: URLs (the new document loses access to the blob), so the
  // Eye button appeared to do nothing for not-yet-uploaded local files (#11).
  // An anchor click without `noreferrer` works in both.
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * Open an evidence file for preview.
 *
 * Stored files used to be opened by navigating straight to the `/uploads/...`
 * URL, which only worked because the API served that directory to anyone. Now
 * that those reads are authorized, a bare navigation carries no Authorization
 * header and would 401, so the file is fetched through the API client and
 * shown as an object URL — the same approach the inline scene image and the
 * download button already use.
 *
 * Blob and data URLs (locally selected files not yet uploaded) never touch the
 * network and are opened directly.
 */
export async function openEvidenceFile(fileUrl?: string) {
  if (!fileUrl) return

  if (/^(blob:|data:)/i.test(fileUrl)) {
    openBlobUrl(fileUrl)
    return
  }

  try {
    const { getEvidenceObjectUrl } = await import('./api')
    const objectUrl = await getEvidenceObjectUrl(fileUrl)
    openBlobUrl(objectUrl)
    // The tab needs the object URL to survive its own load, and there is no
    // reliable cross-browser signal for that, so revoke on a delay rather than
    // leaking it for the lifetime of the page.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (error) {
    // Every caller is an onClick that does not await, so swallow here rather
    // than surfacing an unhandled rejection.
    console.error('Failed to open evidence file', error)
  }
}
