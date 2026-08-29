import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublishedBlogPosts, type BlogPost } from '../lib/api'

function formatDate(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Blog | ClearCaseIQ'
    let cancelled = false
    listPublishedBlogPosts({ limit: 50 })
      .then((res) => {
        if (!cancelled) setPosts(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load the blog right now.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Blog</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          ClearCaseIQ Blog
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Notes on California injury claims, case readiness, and using the platform — not legal advice.
        </p>
      </header>

      {loading && <p className="text-sm text-slate-500">Loading posts…</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!loading && !error && posts.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          No posts have been published yet.
        </p>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <article
            key={post.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p className="text-xs text-slate-500">{formatDate(post.publishedAt)}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
              <Link to={`/blog/${post.slug}`} className="hover:text-brand-700">
                {post.title}
              </Link>
            </h2>
            {post.excerpt && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{post.excerpt}</p>
            )}
            <Link to={`/blog/${post.slug}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">
              Read more
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
