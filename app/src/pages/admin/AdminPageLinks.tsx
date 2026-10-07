import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createAdminPageLink,
  deleteAdminPageLink,
  listAdminPageLinks,
  listEditablePages,
  updateAdminPageLink,
  type AdminPageLink,
} from '../../lib/api'
import { PageHeader, SectionCard } from '../../features/shared/ui'

type Kind = AdminPageLink['kind']
type Rel = AdminPageLink['rel']

const MAX_LINKS = 15

const REL_LABELS: Record<Rel, string> = {
  follow: 'Follow',
  nofollow: 'Nofollow',
  sponsored: 'Sponsored (paid or exchanged)',
}

const EMPTY_FORM = { url: '', anchor: '', kind: 'outbound' as Kind, rel: 'nofollow' as Rel }

function defaultRel(kind: Kind): Rel {
  return kind === 'internal' ? 'follow' : 'nofollow'
}

export default function AdminPageLinks() {
  const [pages, setPages] = useState<Array<{ path: string; title: string }>>([])
  const [pagesError, setPagesError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [allLinks, setAllLinks] = useState<AdminPageLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    listEditablePages()
      .then(setPages)
      .catch(() => setPagesError('Could not load the page list. You can still type a page path below.'))
  }, [])

  const loadLinks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setAllLinks(await listAdminPageLinks())
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load links')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  const countsByPath = useMemo(() => {
    const counts = new Map<string, number>()
    for (const link of allLinks) counts.set(link.path, (counts.get(link.path) ?? 0) + 1)
    return counts
  }, [allLinks])

  const titleByPath = useMemo(() => new Map(pages.map((page) => [page.path, page.title])), [pages])

  const filteredPages = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? pages.filter((page) => page.title.toLowerCase().includes(q) || page.path.toLowerCase().includes(q))
      : pages
    // Pages that already carry links first, so ongoing work is easy to find.
    return [...list].sort((a, b) => (countsByPath.get(b.path) ?? 0) - (countsByPath.get(a.path) ?? 0)).slice(0, 50)
  }, [pages, search, countsByPath])

  const pageLinks = useMemo(
    () =>
      allLinks
        .filter((link) => link.path === selectedPath)
        .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)),
    [allLinks, selectedPath],
  )

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const selectPage = (path: string) => {
    setSelectedPath(path)
    resetForm()
    setNotice(null)
    setError(null)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedPath) return
    setError(null)
    setNotice(null)
    try {
      setSaving(true)
      const payload = { url: form.url.trim(), anchor: form.anchor.trim(), kind: form.kind, rel: form.rel }
      if (editingId) {
        await updateAdminPageLink(editingId, payload)
        setNotice('Link updated. It shows on the live page within about an hour.')
      } else {
        await createAdminPageLink({ path: selectedPath, ...payload })
        setNotice('Link added. It shows on the live page within about an hour.')
      }
      resetForm()
      await loadLinks()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save link')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (link: AdminPageLink) => {
    setEditingId(link.id)
    setForm({ url: link.url, anchor: link.anchor, kind: link.kind, rel: link.rel })
    setNotice(null)
  }

  const runRowAction = async (id: string, action: () => Promise<unknown>) => {
    try {
      setBusyId(id)
      setError(null)
      await action()
      await loadLinks()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update link')
    } finally {
      setBusyId(null)
    }
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = pageLinks[index + direction]
    const current = pageLinks[index]
    if (!target || !current) return
    void runRowAction(current.id, async () => {
      // Renumber the whole page so legacy ties can't make a swap a no-op.
      const order = pageLinks.map((link) => link.id)
      ;[order[index], order[index + direction]] = [order[index + direction], order[index]]
      await Promise.all(order.map((id, position) => updateAdminPageLink(id, { position })))
    })
  }

  const onDelete = (link: AdminPageLink) => {
    if (!window.confirm(`Remove the link “${link.anchor}”?`)) return
    void runRowAction(link.id, () => deleteAdminPageLink(link.id))
  }

  const atLimit = !editingId && pageLinks.length >= MAX_LINKS

  return (
    <div className="space-y-6">
      <PageHeader
        title="Page links"
        description="Add internal and outbound links to public guide pages. They appear in a “Further reading” block on the page within about an hour."
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Outbound links default to <strong>nofollow</strong>. Mark any paid or exchanged link as{' '}
        <strong>Sponsored</strong>. Search engines can penalize followed links that were paid for.
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <SectionCard title="Pages">
          <div className="space-y-3 p-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or path"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              aria-label="Search pages"
            />
            {pagesError && <p className="text-xs text-amber-700">{pagesError}</p>}
            {pagesError && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const value = search.trim()
                  if (value.startsWith('/')) selectPage(value)
                }}
              >
                <button type="submit" className="text-xs font-semibold text-brand-700 hover:underline">
                  Use “{search.trim() || '/path'}” as the page path
                </button>
              </form>
            )}
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {filteredPages.map((page) => {
                const count = countsByPath.get(page.path) ?? 0
                const active = page.path === selectedPath
                return (
                  <li key={page.path}>
                    <button
                      type="button"
                      onClick={() => selectPage(page.path)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                        active ? 'bg-brand-100 text-brand-900' : 'hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{page.title}</span>
                        {count > 0 && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{count}</span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{page.path}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </SectionCard>

        <div className="space-y-6">
          {!selectedPath ? (
            <SectionCard>
              <p className="p-6 text-sm text-slate-500">Pick a page on the left to see and add its links.</p>
            </SectionCard>
          ) : (
            <>
              <SectionCard
                title={titleByPath.get(selectedPath) || selectedPath}
                trailing={
                  <a
                    href={selectedPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                  >
                    View page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                }
              >
                {loading ? (
                  <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : pageLinks.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No links on this page yet.</p>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Link</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Shown</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {pageLinks.map((link, index) => (
                        <tr key={link.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{link.anchor}</p>
                            <p className="max-w-md truncate text-xs text-slate-500">{link.url}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {link.kind === 'internal' ? 'Internal' : 'Outbound'}
                            {link.kind === 'outbound' && (
                              <span className="block text-xs text-slate-500">{REL_LABELS[link.rel]}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={link.active}
                                disabled={busyId === link.id}
                                onChange={(e) =>
                                  void runRowAction(link.id, () =>
                                    updateAdminPageLink(link.id, { active: e.target.checked }),
                                  )
                                }
                              />
                              <span className="text-xs text-slate-600">{link.active ? 'On' : 'Off'}</span>
                            </label>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label="Move up"
                                disabled={index === 0 || busyId != null}
                                onClick={() => move(index, -1)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Move down"
                                disabled={index === pageLinks.length - 1 || busyId != null}
                                onClick={() => move(index, 1)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Edit"
                                onClick={() => startEdit(link)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Remove"
                                disabled={busyId === link.id}
                                onClick={() => onDelete(link)}
                                className="rounded p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </SectionCard>

              <SectionCard title={editingId ? 'Edit link' : 'Add a link'}>
                <form onSubmit={onSubmit} className="grid gap-4 p-4 sm:grid-cols-2">
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block font-medium text-slate-700">Link type</span>
                    <div className="flex gap-2">
                      {(['outbound', 'internal'] as Kind[]).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, kind, rel: defaultRel(kind) }))}
                          className={`rounded-lg px-3 py-1.5 text-sm ${
                            form.kind === kind
                              ? 'bg-slate-900 text-white'
                              : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {kind === 'outbound' ? 'Outbound (another site)' : 'Internal (our site)'}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block font-medium text-slate-700">
                      {form.kind === 'outbound' ? 'Address' : 'Page path'}
                    </span>
                    <input
                      required
                      value={form.url}
                      onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                      placeholder={form.kind === 'outbound' ? 'https://example.com/article' : '/car-accident'}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block font-medium text-slate-700">Anchor text</span>
                    <input
                      required
                      maxLength={120}
                      value={form.anchor}
                      onChange={(e) => setForm((f) => ({ ...f, anchor: e.target.value }))}
                      placeholder="What the reader will find there"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  {form.kind === 'outbound' && (
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-slate-700">Search engine treatment</span>
                      <select
                        value={form.rel}
                        onChange={(e) => setForm((f) => ({ ...f, rel: e.target.value as Rel }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      >
                        {(Object.keys(REL_LABELS) as Rel[]).map((rel) => (
                          <option key={rel} value={rel}>
                            {REL_LABELS[rel]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="flex items-end gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={saving || atLimit}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {editingId ? 'Save changes' : 'Add link'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    )}
                    {atLimit && (
                      <span className="text-xs text-slate-500">This page has the maximum of {MAX_LINKS} links.</span>
                    )}
                  </div>
                </form>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
