/** "www.firm.com" -> "https://www.firm.com"; leaves an explicit http(s):// alone. */
export function withWebsiteProtocol(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'https://' || trimmed === 'http://') return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, '')}`
}
