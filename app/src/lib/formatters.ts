import { getStateName } from './constants'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Turns a raw enum/database value (e.g. "ACCEPTED", "slip_and_fall",
 * "in_progress") into a human, Title Case label ("Accepted", "Slip And Fall",
 * "In Progress"). Used to keep admin/internal screens from leaking raw enum
 * formatting to users (#73).
 */
export function formatEnumLabel(value: unknown): string {
  if (value == null || value === '') return '—'
  return String(value)
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/**
 * Capitalize the first letter of each word without altering the rest, so names
 * stored lowercase render properly ("john smith" -> "John Smith") while
 * intentional mid-word capitals ("McDonald") are preserved (CP-309).
 */
export function capitalizeWords(value: unknown): string {
  if (value == null || value === '') return ''
  return String(value)
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
    .trim()
}

/**
 * Turn a raw jurisdiction token into a human label:
 *  - a 2-letter state code ("CA") -> full state name ("California")
 *  - a state-prefixed slug ("ca_los_angeles") -> the readable remainder ("Los Angeles")
 *  - anything else -> Title Case ("los_angeles" -> "Los Angeles")
 */
function prettifyToken(token: string): string {
  const t = token.trim()
  if (!t) return ''
  if (/^[A-Za-z]{2}$/.test(t)) return getStateName(t.toUpperCase())
  const slug = t.match(/^([A-Za-z]{2})[_-](.+)$/)
  if (slug && getStateName(slug[1].toUpperCase()) !== slug[1].toUpperCase()) {
    return formatEnumLabel(slug[2])
  }
  return formatEnumLabel(t)
}

/** Format a single jurisdiction/venue entry (string or {state, counties}). */
function formatJurisdictionEntry(item: unknown): string {
  if (item == null) return ''
  if (typeof item === 'string') return prettifyToken(item)
  const obj = item as { state?: string; name?: string; counties?: unknown; county?: unknown }
  const rawState = obj.state || obj.name || ''
  const state = rawState ? prettifyToken(String(rawState)) : ''
  const countyList = Array.isArray(obj.counties)
    ? obj.counties
    : obj.county != null
    ? [obj.county]
    : []
  const counties = countyList
    .map((c) => formatEnumLabel(String(c)))
    .filter(Boolean)
    .join(', ')
  return counties ? `${state} (${counties})` : state
}

/**
 * Render a jurisdictions value that may be an array, an object, or a JSON
 * string (e.g. '["ca_los_angeles"]'). Previously a stored JSON string was
 * printed verbatim, leaking raw JSON to admins (CP-312).
 */
export function formatJurisdictions(value: unknown): string {
  if (value == null || value === '') return '—'
  let parsed: unknown = value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        parsed = JSON.parse(trimmed)
      } catch {
        return formatEnumLabel(trimmed)
      }
    } else {
      return formatEnumLabel(trimmed)
    }
  }
  if (Array.isArray(parsed)) {
    const labels = parsed.map(formatJurisdictionEntry).filter(Boolean)
    return labels.length ? labels.join('; ') : '—'
  }
  return formatJurisdictionEntry(parsed) || '—'
}
