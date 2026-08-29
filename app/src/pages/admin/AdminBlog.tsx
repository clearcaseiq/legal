import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { deleteAdminBlogPost, listAdminBlogPosts, type BlogPost } from '../../lib/api'
import { PageHeader, SectionCard } from '../../features/shared/ui'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminBlog() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listAdminBlogPosts({ limit: 100, status })
      setRows(data.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  const onDelete = async (post: BlogPost) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return
    try {
      setDeletingId(post.id)
      await deleteAdminBlogPost(post.id)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete post')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        description="Write posts that appear on /blog. Drafts stay private until you publish."
        actions={
          <Link
            to="/admin/blog/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" />
            New post
          </Link>
        }
      />

      <div className="flex gap-2">
        {['all', 'published', 'draft'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
              status === value ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <SectionCard>
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No posts yet. Create one to get started.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((post) => (
                <tr key={post.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="font-medium text-brand-700 hover:underline"
                      onClick={() => navigate(`/admin/blog/${post.id}`)}
                    >
                      {post.title}
                    </button>
                    <p className="text-xs text-slate-500">/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        post.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(post.publishedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={deletingId === post.id}
                      onClick={() => void onDelete(post)}
                      className="inline-flex items-center gap-1 text-rose-700 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
