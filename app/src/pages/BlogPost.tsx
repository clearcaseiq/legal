import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublishedBlogPost, type BlogPost } from '../lib/api'
import { renderBlogMarkdown } from '../lib/blogMarkdown'

function formatDate(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    getPublishedBlogPost(slug)
      .then((row) => {
        if (!cancelled) {
          setPost(row)
          document.title = `${row.title} | ClearCaseIQ`
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.status === 404 ? 'Post not found.' : 'Unable to load this post.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <Link to="/blog" className="text-sm font-medium text-brand-700 hover:text-brand-800">
        ← All posts
      </Link>
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {post && (
        <article className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Blog</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            {post.title}
          </h1>
          <p className="text-sm text-slate-500">
            {formatDate(post.publishedAt)}
            {post.authorName ? ` · ${post.authorName}` : ''}
          </p>
          <div
            className="prose prose-slate max-w-none dark:prose-invert [&_a]:text-brand-700 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: renderBlogMarkdown(post.body || '') }}
          />
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            This article is educational and is not legal advice. ClearCaseIQ is not a law firm.
          </p>
        </article>
      )}
    </div>
  )
}
