function isPrivateLanHostname(hostname: string) {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  )
}

function isLoopbackHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

/** Local / LAN hosts that can use the Next.js `/v1` rewrite proxy. */
export function isLocalDevWebHost(hostname: string) {
  return isLoopbackHostname(hostname) || isPrivateLanHostname(hostname)
}

/**
 * Resolve the API origin for browser requests.
 *
 * In `next dev`, always use same-origin `/v1/...` (rewritten to the API in
 * next.config.mjs). That is the only reliable way to avoid CORS and Chromium
 * Private Network Access failures when the UI is opened via localhost or a
 * LAN Network URL.
 */
export function getApiOrigin() {
  // Next inlines this at build time: true for `next dev`, false for production.
  if (process.env.NODE_ENV === 'development') {
    return ''
  }

  const explicitApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '') || ''
  if (explicitApiUrl) return explicitApiUrl

  if (typeof window !== 'undefined') {
    const pageHost = window.location.hostname
    if (isLoopbackHostname(pageHost)) return 'http://127.0.0.1:4000'
    if (isPrivateLanHostname(pageHost)) return `http://${pageHost}:4000`
  }

  return ''
}
