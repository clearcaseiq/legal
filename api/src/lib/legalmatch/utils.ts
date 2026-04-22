import { createHash } from 'crypto'

export function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex')
}

export function normalizeWhitespace(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

export function stripHtml(html: string) {
  return decodeHtmlEntities(
    normalizeWhitespace(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    )
  )
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }
  return result
}

export function parseJsonText<T>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function mergeJsonArray(existing: string | null | undefined, incoming: string[]) {
  const parsed = parseJsonText<string[]>(existing) ?? []
  return JSON.stringify(uniqueStrings([...parsed, ...incoming]))
}

export function maybeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const normalized = value.replace(/[^0-9.]+/g, '')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function firstNonEmpty<T>(...values: Array<T | null | undefined | ''>) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value
  }
  return null
}

export function splitFullName(fullName: string) {
  const normalized = normalizeWhitespace(fullName)
  if (!normalized) return { firstName: null, lastName: null }
  const parts = normalized.split(' ')
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.slice(-1).join(' '),
  }
}

export function slugify(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
