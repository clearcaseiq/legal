/**
 * Links a content editor attaches to public guide pages. Validation lives here
 * so the admin routes and their tests share one definition of a safe link.
 */
import { z } from 'zod'

export const PAGE_LINK_KINDS = ['internal', 'outbound'] as const
export const PAGE_LINK_RELS = ['follow', 'nofollow', 'sponsored'] as const
export const MAX_LINKS_PER_PAGE = 15
export const MAX_ANCHOR_LENGTH = 120

export type PageLinkKind = (typeof PAGE_LINK_KINDS)[number]
export type PageLinkRel = (typeof PAGE_LINK_RELS)[number]

/** A site path: leading slash, no protocol-relative `//host`, no query or fragment. */
export function normalizePagePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (/[\s?#\\]/.test(trimmed) || trimmed.length > 300) return null
  return trimmed.length > 1 ? trimmed.replace(/\/+$/, '') : trimmed
}

/**
 * Checks a link target against its kind. Outbound links must be absolute https
 * URLs; internal links must be site paths. Anything else (http, javascript:,
 * data:, protocol-relative) is rejected rather than rewritten.
 */
export function validateLinkUrl(kind: PageLinkKind, raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const value = raw.trim()
  if (kind === 'internal') {
    const path = value.split('#')[0]
    if (!normalizePagePath(path)) {
      return { ok: false, error: 'Internal links must be a site path starting with "/", e.g. /car-accident.' }
    }
    return { ok: true, url: value }
  }
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false, error: 'Outbound links must be a full address, e.g. https://example.com/page.' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Outbound links must use https.' }
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Outbound links cannot contain credentials.' }
  }
  return { ok: true, url: parsed.toString() }
}

export const PageLinkCreateSchema = z.object({
  path: z.string().trim().min(1).max(300),
  url: z.string().trim().min(1).max(2000),
  anchor: z.string().trim().min(1).max(MAX_ANCHOR_LENGTH),
  kind: z.enum(PAGE_LINK_KINDS),
  rel: z.enum(PAGE_LINK_RELS).optional(),
  active: z.boolean().optional(),
})

export const PageLinkUpdateSchema = z.object({
  url: z.string().trim().min(1).max(2000).optional(),
  anchor: z.string().trim().min(1).max(MAX_ANCHOR_LENGTH).optional(),
  kind: z.enum(PAGE_LINK_KINDS).optional(),
  rel: z.enum(PAGE_LINK_RELS).optional(),
  active: z.boolean().optional(),
  position: z.number().int().min(0).max(1000).optional(),
})

/** Internal links are followed by default; outbound links are not unless the editor says so. */
export function defaultRelFor(kind: PageLinkKind): PageLinkRel {
  return kind === 'internal' ? 'follow' : 'nofollow'
}

export type PublicPageLink = {
  id: string
  url: string
  anchor: string
  kind: PageLinkKind
  rel: PageLinkRel
}

export function serializePublicPageLink(row: {
  id: string
  url: string
  anchor: string
  kind: string
  rel: string
}): PublicPageLink {
  return {
    id: row.id,
    url: row.url,
    anchor: row.anchor,
    kind: row.kind === 'internal' ? 'internal' : 'outbound',
    rel: (PAGE_LINK_RELS as readonly string[]).includes(row.rel) ? (row.rel as PageLinkRel) : 'nofollow',
  }
}
