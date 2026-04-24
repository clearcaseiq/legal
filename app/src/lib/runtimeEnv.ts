export function getApiOrigin() {
  const explicitApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (explicitApiUrl) return explicitApiUrl.replace(/\/+$/, '')

  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(window.location.host)) {
    return 'http://127.0.0.1:4000'
  }

  return ''
}
