import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createAdminBlogPost, getAdminBlogPost, updateAdminBlogPost } from '../../lib/api'
import { PageHeader } from '../../features/shared/ui'

export default function AdminBlogEditor() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [published, setPublished] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    getAdminBlogPost(id)
      .then((post) => {
        if (cancelled) return
        setTitle(post.title)
        setSlug(post.slug)
        setExcerpt(post.excerpt || '')
        setBody(post.body || '')
        setPublished(post.published)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.error || 'Failed to load post')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { title, slug: slug.trim() || undefined, excerpt, body, published }
      if (isNew) {
        const created = await createAdminBlogPost(payload)
        navigate(`/admin/blog/${created.id}`, { replace: true })
      } else {
        await updateAdminBlogPost(id, payload)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading post…</p>

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'New blog post' : 'Edit blog post'}
        description="Plain text plus simple markdown: # headings, **bold**, lists, and [links](/path)."
        actions={
          <Link to="/admin/blog" className="text-sm font-medium text-brand-700 hover:underline">
            All posts
          </Link>
        }
      />

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          URL slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto from title"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Excerpt
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Body
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Published on /blog
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isNew ? 'Create post' : 'Save changes'}
          </button>
          {published && slug && (
            <a href={`/blog/${slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">
              View live
            </a>
          )}
        </div>
      </form>
    </div>
  )
}
