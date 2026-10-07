/**
 * Admin → Page links. Content editors attach internal and outbound links to
 * public guide pages; the public router below serves the active ones to the
 * Next.js page renderer.
 */
import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import {
  MAX_LINKS_PER_PAGE,
  PageLinkCreateSchema,
  PageLinkUpdateSchema,
  defaultRelFor,
  normalizePagePath,
  serializePublicPageLink,
  validateLinkUrl,
} from '../lib/page-links'

const router: ExpressRouter = Router()

const gate = [authMiddleware, adminMiddleware, requireAdminCapability('content')] as const

const createdByInclude = {
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const

router.get('/page-links', ...gate, async (req: AuthRequest, res) => {
  try {
    const where: Record<string, unknown> = {}
    if (req.query.path != null) {
      const path = normalizePagePath(req.query.path)
      if (!path) return res.status(400).json({ error: 'Invalid page path' })
      where.path = path
    }
    const rows = await prisma.pageLink.findMany({
      where,
      include: createdByInclude,
      orderBy: [{ path: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
      take: 500,
    })
    res.json({ success: true, data: rows })
  } catch (error) {
    logger.error('Failed to list page links', { error })
    res.status(500).json({ error: 'Failed to load page links' })
  }
})

router.post('/page-links', ...gate, async (req: AuthRequest, res) => {
  try {
    const parsed = PageLinkCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid link', details: parsed.error.flatten() })
    }
    const path = normalizePagePath(parsed.data.path)
    if (!path) return res.status(400).json({ error: 'Invalid page path' })
    const url = validateLinkUrl(parsed.data.kind, parsed.data.url)
    if (!url.ok) return res.status(400).json({ error: url.error })

    const count = await prisma.pageLink.count({ where: { path } })
    if (count >= MAX_LINKS_PER_PAGE) {
      return res.status(400).json({ error: `A page can hold at most ${MAX_LINKS_PER_PAGE} links.` })
    }

    const row = await prisma.pageLink.create({
      data: {
        path,
        url: url.url,
        anchor: parsed.data.anchor,
        kind: parsed.data.kind,
        rel: parsed.data.rel ?? defaultRelFor(parsed.data.kind),
        active: parsed.data.active ?? true,
        position: count,
        createdById: req.user?.id || null,
      },
      include: createdByInclude,
    })
    await writeAdminAudit(req, {
      action: 'page_link.create',
      entityType: 'PageLink',
      entityId: row.id,
      statusCode: 201,
      metadata: { path: row.path, url: row.url, kind: row.kind, rel: row.rel },
    })
    res.status(201).json({ success: true, data: row })
  } catch (error) {
    logger.error('Failed to create page link', { error })
    res.status(500).json({ error: 'Failed to create link' })
  }
})

router.patch('/page-links/:id', ...gate, async (req: AuthRequest, res) => {
  try {
    const parsed = PageLinkUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid link', details: parsed.error.flatten() })
    }
    const existing = await prisma.pageLink.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Link not found' })

    const kind = parsed.data.kind ?? (existing.kind === 'internal' ? 'internal' : 'outbound')
    const data: Record<string, unknown> = {}
    if (parsed.data.url != null || parsed.data.kind != null) {
      const url = validateLinkUrl(kind, parsed.data.url ?? existing.url)
      if (!url.ok) return res.status(400).json({ error: url.error })
      data.url = url.url
      data.kind = kind
    }
    if (parsed.data.anchor != null) data.anchor = parsed.data.anchor
    if (parsed.data.rel != null) data.rel = parsed.data.rel
    if (parsed.data.active != null) data.active = parsed.data.active
    if (parsed.data.position != null) data.position = parsed.data.position

    const row = await prisma.pageLink.update({
      where: { id: existing.id },
      data,
      include: createdByInclude,
    })
    await writeAdminAudit(req, {
      action: 'page_link.update',
      entityType: 'PageLink',
      entityId: row.id,
      statusCode: 200,
      metadata: { path: row.path, changes: Object.keys(data), url: row.url, rel: row.rel, active: row.active },
    })
    res.json({ success: true, data: row })
  } catch (error) {
    logger.error('Failed to update page link', { error })
    res.status(500).json({ error: 'Failed to update link' })
  }
})

router.delete('/page-links/:id', ...gate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.pageLink.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Link not found' })
    await prisma.pageLink.delete({ where: { id: existing.id } })
    await writeAdminAudit(req, {
      action: 'page_link.delete',
      entityType: 'PageLink',
      entityId: existing.id,
      statusCode: 200,
      metadata: { path: existing.path, url: existing.url },
    })
    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete page link', { error })
    res.status(500).json({ error: 'Failed to delete link' })
  }
})

export default router

/** Public: active links for one page, mounted at `/v1/page-links`. */
export const publicPageLinksRouter: ExpressRouter = Router()

publicPageLinksRouter.get('/', async (req, res) => {
  try {
    const path = normalizePagePath(req.query.path)
    if (!path) return res.status(400).json({ error: 'Invalid page path' })
    const rows = await prisma.pageLink.findMany({
      where: { path, active: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      take: 15,
    })
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.json({ success: true, data: rows.map(serializePublicPageLink) })
  } catch (error) {
    logger.error('Failed to load public page links', { error })
    res.status(500).json({ error: 'Failed to load links' })
  }
})
