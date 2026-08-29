/** URL slug from a post title. Empty titles become `post`. */
export function slugifyBlogTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'post'
}

const AUTHOR_SELECT = {
  firstName: true,
  lastName: true,
} as const

export function blogAuthorName(author?: { firstName?: string | null; lastName?: string | null } | null) {
  const name = [author?.firstName, author?.lastName].filter(Boolean).join(' ').trim()
  return name || 'ClearCaseIQ'
}

export function serializeBlogPost(
  row: {
    id: string
    slug: string
    title: string
    excerpt: string
    body: string
    published: boolean
    publishedAt: Date | null
    createdAt: Date
    updatedAt: Date
    author?: { firstName?: string | null; lastName?: string | null } | null
  },
  { includeBody }: { includeBody: boolean },
) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    ...(includeBody ? { body: row.body } : {}),
    published: row.published,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    authorName: blogAuthorName(row.author),
  }
}

export const blogAuthorInclude = { author: { select: AUTHOR_SELECT } }
