export function getApiOrigin() {
  const explicitApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (explicitApiUrl) return explicitApiUrl.replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:4000'
    }

    // Local dev accessed over the LAN (e.g. http://192.168.1.x:3000): point the API
    // at the same host on port 4000 (the API listens on 0.0.0.0:4000).
    const isPrivateLanIp =
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    if (isPrivateLanIp) {
      return `http://${hostname}:4000`
    }
  }

  return ''
}
