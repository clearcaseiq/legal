/**
 * Public blog. Only published posts are listed or readable.
 */
import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { blogAuthorInclude, serializeBlogPost } from '../lib/blog'
import { parsePagination, paginated } from '../lib/pagination'

const router: ExpressRouter = Router()

function publishedWhere() {
  return {
    published: true,
    publishedAt: { lte: new Date() },
  }
}

router.get('/', async (req, res) => {
  try {
    const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
      defaultLimit: 20,
      maxLimit: 50,
    })
    const where = publishedWhere()
    const [rows, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: blogAuthorInclude,
        orderBy: { publishedAt: 'desc' },
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
    logger.error('Failed to list blog posts', { error })
    res.status(500).json({ error: 'Failed to load blog' })
  }
})

router.get('/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim()
    const row = await prisma.blogPost.findFirst({
      where: { slug, ...publishedWhere() },
      include: blogAuthorInclude,
    })
    if (!row) return res.status(404).json({ error: 'Post not found' })
    res.json({ success: true, data: serializeBlogPost(row, { includeBody: true }) })
  } catch (error) {
    logger.error('Failed to load blog post', { error })
    res.status(500).json({ error: 'Failed to load post' })
  }
})

export default router
