/**
 * Admin authoring for /blog. Drafts are stored here; the public router only
 * serves rows with published=true and a publishedAt in the past.
 */
import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { parsePagination, paginated } from '../lib/pagination'
import { blogAuthorInclude, serializeBlogPost, slugifyBlogTitle } from '../lib/blog'

const router: ExpressRouter = Router()

const WriteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(500).optional(),
  body: z.string().trim().min(1).max(50_000),
  published: z.boolean().optional(),
})

async function uniqueSlug(desired: string, excludeId?: string) {
  let candidate = slugifyBlogTitle(desired)
  for (let n = 2; n < 50; n += 1) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: candidate } })
    if (!existing || existing.id === excludeId) return candidate
    candidate = `${slugifyBlogTitle(desired).slice(0, 76)}-${n}`
  }
  return `${candidate}-${Date.now().toString(36)}`
}

const gate = [authMiddleware, adminMiddleware, requireAdminCapability('oversight')] as const

router.get('/blog', ...gate, async (req: AuthRequest, res) => {
  try {
    const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
      defaultLimit: 25,
      maxLimit: 100,
    })
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'all'
    const where: Record<string, unknown> = {}
    if (status === 'published') where.published = true
    if (status === 'draft') where.published = false
    const [rows, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: blogAuthorInclude,
        orderBy: { updatedAt: 'desc' },
        take,
        skip,
      }),
      prisma.blogPost.count({ where }),
    ])
    res.json({
      success: true,
      data: rows.map((row) => serializeBlogPost(row, { includeBody: false })),
      ...paginated(rows, total, { take, skip }),
    })
  } catch (error) {
    logger.error('Failed to list admin blog posts', { error })
    res.status(500).json({ error: 'Failed to load posts' })
  }
})

router.get('/blog/:id', ...gate, async (req: AuthRequest, res) => {
  try {
    const row = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      include: blogAuthorInclude,
    })
    if (!row) return res.status(404).json({ error: 'Post not found' })
    res.json({ success: true, data: serializeBlogPost(row, { includeBody: true }) })
  } catch (error) {
    logger.error('Failed to load admin blog post', { error })
    res.status(500).json({ error: 'Failed to load post' })
  }
})

router.post('/blog', ...gate, async (req: AuthRequest, res) => {
  try {
    const parsed = WriteSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid post', details: parsed.error.flatten() })
    }
    const published = Boolean(parsed.data.published)
    const slug = await uniqueSlug(parsed.data.slug || parsed.data.title)
    const row = await prisma.blogPost.create({
      data: {
        title: parsed.data.title,
        slug,
        excerpt: parsed.data.excerpt || '',
        body: parsed.data.body,
        published,
        publishedAt: published ? new Date() : null,
        authorId: req.user?.id || null,
      },
      include: blogAuthorInclude,
    })
    await writeAdminAudit(req, {
      action: 'blog.create',
      entityType: 'BlogPost',
      entityId: row.id,
      statusCode: 201,
      metadata: { slug: row.slug, published: row.published },
    })
    res.status(201).json({ success: true, data: serializeBlogPost(row, { includeBody: true }) })
  } catch (error) {
    logger.error('Failed to create blog post', { error })
    res.status(500).json({ error: 'Failed to create post' })
  }
})

router.patch('/blog/:id', ...gate, async (req: AuthRequest, res) => {
  try {
    const parsed = WriteSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid post', details: parsed.error.flatten() })
    }
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Post not found' })

    const data: Record<string, unknown> = {}
    if (parsed.data.title != null) data.title = parsed.data.title
    if (parsed.data.excerpt != null) data.excerpt = parsed.data.excerpt
    if (parsed.data.body != null) data.body = parsed.data.body
    if (parsed.data.slug != null && parsed.data.slug.trim()) {
      data.slug = await uniqueSlug(parsed.data.slug, existing.id)
    }
    if (parsed.data.published != null) {
      data.published = parsed.data.published
      if (parsed.data.published && !existing.publishedAt) data.publishedAt = new Date()
      if (!parsed.data.published) data.publishedAt = null
    }

    const row = await prisma.blogPost.update({
      where: { id: existing.id },
      data,
      include: blogAuthorInclude,
    })
    await writeAdminAudit(req, {
      action: 'blog.update',
      entityType: 'BlogPost',
      entityId: row.id,
      statusCode: 200,
      metadata: { slug: row.slug, published: row.published },
    })
    res.json({ success: true, data: serializeBlogPost(row, { includeBody: true }) })
  } catch (error) {
    logger.error('Failed to update blog post', { error })
    res.status(500).json({ error: 'Failed to update post' })
  }
})

router.delete('/blog/:id', ...gate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Post not found' })
    await prisma.blogPost.delete({ where: { id: existing.id } })
    await writeAdminAudit(req, {
      action: 'blog.delete',
      entityType: 'BlogPost',
      entityId: existing.id,
      statusCode: 200,
      metadata: { slug: existing.slug },
    })
    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete blog post', { error })
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

export default router
