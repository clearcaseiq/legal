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

/**
 * Open an evidence file for preview. Opening a blob: URL via
 * window.open(..., 'noopener,noreferrer') is unreliable/blocked in Chrome and
 * Firefox (the new document loses access to the blob), so the Eye button
 * appeared to do nothing for not-yet-uploaded local files (#11). Use an anchor
 * click (no `noreferrer`) for blob/data URLs; keep window.open for http(s).
 */
export function openEvidenceFile(fileUrl?: string) {
  const url = resolveEvidenceFileUrl(fileUrl)
  if (!url) return
  if (/^(blob:|data:)/i.test(url)) {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
