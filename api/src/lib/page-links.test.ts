import { describe, it, expect, vi } from 'vitest'
import {
  adminMiddleware,
  isContentOnlyAdmin,
  requireAdminCapability,
  resolveAdminCapabilities,
} from './admin-access'
import { defaultRelFor, normalizePagePath, serializePublicPageLink, validateLinkUrl } from './page-links'

const contentEditor = { email: 'seo@agency.example', role: 'admin', adminCapabilities: '["content"]' }
const fullAdmin = { email: 'ops@clearcaseiq.example', role: 'admin', adminCapabilities: null }
const opsAndContent = { email: 'mix@clearcaseiq.example', role: 'admin', adminCapabilities: '["ops","content"]' }

function run(middleware: any, user: unknown, baseUrl: string, path: string) {
  const res: any = { statusCode: 200, body: null }
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })
  res.json = vi.fn((body: unknown) => {
    res.body = body
    return res
  })
  const next = vi.fn()
  middleware({ user, baseUrl, path }, res, next)
  return { res, next }
}

describe('content-only admins', () => {
  it('treats a content-only list as content-only, and full or mixed admins as not', () => {
    expect(isContentOnlyAdmin(contentEditor)).toBe(true)
    expect(isContentOnlyAdmin(fullAdmin)).toBe(false)
    expect(isContentOnlyAdmin(opsAndContent)).toBe(false)
  })

  it('gives full-access admins the content capability', () => {
    expect(resolveAdminCapabilities(fullAdmin)).toContain('content')
  })

  it('blocks a content editor from ungated admin routes such as stats and cases', () => {
    for (const path of ['/stats', '/cases', '/intake-leads', '/users']) {
      const { res, next } = run(adminMiddleware, contentEditor, '/v1/admin', path)
      expect(next).not.toHaveBeenCalled()
      expect(res.statusCode).toBe(403)
    }
  })

  it('lets a content editor reach page links', () => {
    const { next } = run(adminMiddleware, contentEditor, '/v1/admin', '/page-links')
    expect(next).toHaveBeenCalled()
    const gate = run(requireAdminCapability('content'), contentEditor, '/v1/admin', '/page-links')
    expect(gate.next).toHaveBeenCalled()
  })

  it('leaves other admins unaffected', () => {
    expect(run(adminMiddleware, fullAdmin, '/v1/admin', '/stats').next).toHaveBeenCalled()
    expect(run(adminMiddleware, opsAndContent, '/v1/admin', '/cases').next).toHaveBeenCalled()
  })

  it('denies page links to an admin without the content capability', () => {
    const opsOnly = { ...fullAdmin, adminCapabilities: '["ops"]' }
    const { res, next } = run(requireAdminCapability('content'), opsOnly, '/v1/admin', '/page-links')
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
  })
})

describe('page link validation', () => {
  it('accepts https outbound links and site-path internal links', () => {
    expect(validateLinkUrl('outbound', 'https://example.com/guide')).toEqual({
      ok: true,
      url: 'https://example.com/guide',
    })
    expect(validateLinkUrl('internal', '/car-accident#evidence')).toEqual({ ok: true, url: '/car-accident#evidence' })
  })

  it.each([
    ['outbound', 'http://example.com'],
    ['outbound', 'javascript:alert(1)'],
    ['outbound', 'data:text/html,hi'],
    ['outbound', 'https://user:pass@example.com'],
    ['outbound', '/car-accident'],
    ['internal', '//evil.example/path'],
    ['internal', 'https://example.com'],
    ['internal', 'javascript:alert(1)'],
  ] as const)('rejects %s link %s', (kind, url) => {
    expect(validateLinkUrl(kind, url).ok).toBe(false)
  })

  it('normalizes page paths and rejects unsafe ones', () => {
    expect(normalizePagePath('/car-accident/')).toBe('/car-accident')
    expect(normalizePagePath('/')).toBe('/')
    expect(normalizePagePath('car-accident')).toBeNull()
    expect(normalizePagePath('//evil.example')).toBeNull()
    expect(normalizePagePath('/a?b=1')).toBeNull()
  })

  it('defaults internal links to follow and outbound links to nofollow', () => {
    expect(defaultRelFor('internal')).toBe('follow')
    expect(defaultRelFor('outbound')).toBe('nofollow')
  })

  it('never serves an unknown rel as followed', () => {
    expect(
      serializePublicPageLink({ id: '1', url: 'https://x.example', anchor: 'X', kind: 'outbound', rel: 'weird' }).rel,
    ).toBe('nofollow')
  })
})
