import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Contact, CornerDownLeft, FileSignature, FolderOpen, Loader2, Search, X } from 'lucide-react'
import { globalSearch, type GlobalSearchHit, type GlobalSearchResult } from '../../lib/api'

const GROUPS = [
  { key: 'cases' as const, label: 'Cases', Icon: FolderOpen },
  { key: 'contacts' as const, label: 'Contacts', Icon: Contact },
  { key: 'documents' as const, label: 'Documents & E-sign', Icon: FileSignature },
]

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<GlobalSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Global ⌘K / Ctrl+K to open, Esc handled inside the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus the input whenever the palette opens.
  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 20)
    else {
      setQuery('')
      setResult(null)
      setActiveIndex(0)
    }
  }, [open])

  // Debounced search with request cancellation.
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResult(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const t = window.setTimeout(() => {
      globalSearch(q, controller.signal)
        .then((r) => {
          setResult(r)
          setActiveIndex(0)
        })
        .catch((err) => {
          if (err?.code !== 'ERR_CANCELED' && err?.name !== 'CanceledError') setResult(null)
        })
        .finally(() => setLoading(false))
    }, 220)
    return () => {
      controller.abort()
      window.clearTimeout(t)
    }
  }, [query, open])

  // Flatten hits (in group order) for arrow-key navigation.
  const flat = useMemo<GlobalSearchHit[]>(() => {
    if (!result) return []
    return GROUPS.flatMap((g) => result[g.key] ?? [])
  }, [result])

  const go = useCallback(
    (hit: GlobalSearchHit) => {
      setOpen(false)
      navigate(hit.href)
    },
    [navigate],
  )

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flat.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flat[activeIndex]) {
      e.preventDefault()
      go(flat[activeIndex])
    }
  }

  const totalShown = flat.length
  const hasQuery = query.trim().length >= 2

  // Running index across groups so highlight matches the flat nav order.
  let runningIndex = -1

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-400 shadow-sm transition hover:border-slate-300 hover:text-slate-600"
        aria-label="Search cases, contacts, and documents"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-1 hidden items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:inline-flex">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search cases, contacts, documents…"
                className="w-full bg-transparent py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-300" /> : null}
              <button
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto py-2">
              {!hasQuery ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  Type at least 2 characters to search across your cases, contacts, and documents.
                </p>
              ) : totalShown === 0 && !loading ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  No matches for “{query.trim()}”.
                </p>
              ) : (
                GROUPS.map((g) => {
                  const hits = result?.[g.key] ?? []
                  if (hits.length === 0) return null
                  const total = result?.totals?.[g.key] ?? hits.length
                  const Icon = g.Icon
                  return (
                    <div key={g.key} className="px-2 pb-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {g.label}
                        <span className="font-medium normal-case tracking-normal text-slate-300">
                          {total > hits.length ? `${hits.length} of ${total}` : total}
                        </span>
                      </div>
                      {hits.map((hit) => {
                        runningIndex += 1
                        const active = runningIndex === activeIndex
                        return (
                          <button
                            key={hit.id}
                            onClick={() => go(hit)}
                            onMouseEnter={() => setActiveIndex(GROUPS.flatMap((gg) => result?.[gg.key] ?? []).findIndex((h) => h.id === hit.id))}
                            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                              active ? 'bg-brand-50 ring-1 ring-inset ring-brand-100' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                active ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800">{hit.title}</span>
                              {hit.subtitle ? (
                                <span className="block truncate text-xs text-slate-400">{hit.subtitle}</span>
                              ) : null}
                            </span>
                            {active ? <CornerDownLeft className="h-4 w-4 shrink-0 text-brand-400" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">↑</kbd>
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">↓</kbd>
                  navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">↵</kbd>
                  open
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5">esc</kbd>
                  close
                </span>
              </span>
              <span>Universal search</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
