/**
 * Place signature, date, initials, text and checkbox fields on a firm
 * template's PDF and assign each to the client or the attorney.
 *
 * Positions are stored as fractions of the page, so the layout does not depend
 * on the zoom it was drawn at; the API turns them into points on the PDF that
 * is actually sent.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CalendarCheck, CheckSquare, Loader2, PenLine, Signature, Trash2, Type } from 'lucide-react'
import {
  getFirmTemplateFileObjectUrl,
  saveFirmTemplateSignatureFields,
  type FirmTemplate,
  type TemplateFieldSigner,
  type TemplateFieldType,
  type TemplateSignatureField,
} from '../../lib/api'

const FIELD_TYPES: Array<{ type: TemplateFieldType; label: string; icon: typeof Signature }> = [
  { type: 'signature', label: 'Signature', icon: Signature },
  { type: 'date_signed', label: 'Date signed', icon: CalendarCheck },
  { type: 'initials', label: 'Initials', icon: PenLine },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
]

const TYPE_LABEL: Record<TemplateFieldType, string> = {
  signature: 'Signature',
  date_signed: 'Date signed',
  initials: 'Initials',
  text: 'Text',
  checkbox: 'Checkbox',
}

/** Default size as fractions of a US Letter page. */
const DEFAULT_SIZE: Record<TemplateFieldType, { width: number; height: number }> = {
  signature: { width: 0.3, height: 0.045 },
  date_signed: { width: 0.18, height: 0.025 },
  initials: { width: 0.09, height: 0.04 },
  text: { width: 0.25, height: 0.025 },
  checkbox: { width: 0.028, height: 0.021 },
}

const SIGNER_STYLE: Record<TemplateFieldSigner, { box: string; chip: string; label: string }> = {
  client: {
    box: 'border-indigo-500 bg-indigo-500/15 text-indigo-800',
    chip: 'bg-indigo-100 text-indigo-700',
    label: 'Client',
  },
  attorney: {
    box: 'border-amber-500 bg-amber-400/20 text-amber-900',
    chip: 'bg-amber-100 text-amber-800',
    label: 'Attorney',
  },
}

const PAGE_WIDTH = 760

type PageImage = { url: string; aspect: number }

type Drag = {
  id: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origin: TemplateSignatureField
  pageRect: DOMRect
}

function newId(): string {
  return `f_${Math.random().toString(36).slice(2, 10)}`
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function countersigned(documentType: string | null | undefined): boolean {
  return documentType === 'retainer' || documentType === 'fee_agreement'
}

/** The same rules the API enforces, shown before the attorney presses Save. */
export function layoutProblems(fields: TemplateSignatureField[], documentType: string | null | undefined): string[] {
  if (fields.length === 0) return []
  const problems: string[] = []
  if (!fields.some((f) => f.signer === 'client' && f.type === 'signature')) {
    problems.push('Place at least one client signature field.')
  }
  if (countersigned(documentType)) {
    if (!fields.some((f) => f.signer === 'attorney' && f.type === 'signature')) {
      problems.push('Retainers and fee agreements need an attorney signature field (California B&P §6147).')
    }
  } else if (fields.some((f) => f.signer === 'attorney')) {
    problems.push('Only retainers and fee agreements are countersigned. Reassign the attorney fields to the client.')
  }
  return problems
}

export function TemplateFieldEditor({
  template,
  documentType,
  onClose,
  onSaved,
}: {
  template: FirmTemplate
  /** The type currently chosen on the form, which may not be saved yet. */
  documentType: string | null
  onClose: () => void
  onSaved: (template: FirmTemplate) => void
}) {
  const [pages, setPages] = useState<PageImage[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fields, setFields] = useState<TemplateSignatureField[]>(() => template.signatureFields ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<TemplateFieldType>('signature')
  const [signer, setSigner] = useState<TemplateFieldSigner>('client')
  const [show, setShow] = useState<'all' | TemplateFieldSigner>('all')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const attorneyAllowed = countersigned(documentType)

  useEffect(() => {
    if (!attorneyAllowed && signer === 'attorney') setSigner('client')
  }, [attorneyAllowed, signer])

  // Render every page to an image once; field boxes sit over the image.
  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        objectUrl = await getFirmTemplateFileObjectUrl(template.id)
        const doc = await pdfjs.getDocument({ url: objectUrl }).promise
        const rendered: PageImage[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (PAGE_WIDTH * 2) / base.width })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
          rendered.push({ url: canvas.toDataURL('image/png'), aspect: base.height / base.width })
          if (cancelled) return
        }
        if (!cancelled) setPages(rendered)
        await doc.destroy()
      } catch {
        if (!cancelled) setLoadError('This PDF could not be opened. Re-save it as a standard PDF and upload it again.')
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [template.id])

  const selected = fields.find((f) => f.id === selectedId) || null
  const update = useCallback((id: string, patch: Partial<TemplateSignatureField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])
  const remove = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id))
    setSelectedId((cur) => (cur === id ? null : cur))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        remove(selectedId)
      } else if (e.key === 'Escape') {
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [remove, selectedId])

  const placeAt = (pageIndex: number, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const size = DEFAULT_SIZE[tool]
    const width = size.width
    // Checkbox fractions are of page width; keep them square on any page shape.
    const height = tool === 'checkbox' ? (size.width * rect.width) / rect.height : size.height
    const field: TemplateSignatureField = {
      id: newId(),
      page: pageIndex,
      x: clamp((e.clientX - rect.left) / rect.width - width / 2, 0, 1 - width),
      y: clamp((e.clientY - rect.top) / rect.height - height / 2, 0, 1 - height),
      width,
      height,
      type: tool,
      signer,
      required: tool !== 'checkbox',
      ...(tool === 'text' ? { label: 'Text' } : {}),
    }
    setFields((prev) => [...prev, field])
    setSelectedId(field.id)
  }

  const startDrag = (field: TemplateSignatureField, mode: Drag['mode'], e: ReactPointerEvent<HTMLElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const pageEl = (e.currentTarget as HTMLElement).closest('[data-page]') as HTMLElement | null
    if (!pageEl) return
    setSelectedId(field.id)
    dragRef.current = { id: field.id, mode, startX: e.clientX, startY: e.clientY, origin: field, pageRect: pageEl.getBoundingClientRect() }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onDragMove = (e: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = (e.clientX - drag.startX) / drag.pageRect.width
    const dy = (e.clientY - drag.startY) / drag.pageRect.height
    const o = drag.origin
    if (drag.mode === 'move') {
      update(drag.id, { x: clamp(o.x + dx, 0, 1 - o.width), y: clamp(o.y + dy, 0, 1 - o.height) })
    } else {
      update(drag.id, { width: clamp(o.width + dx, 0.015, 1 - o.x), height: clamp(o.height + dy, 0.012, 1 - o.y) })
    }
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const problems = useMemo(() => layoutProblems(fields, documentType), [fields, documentType])
  const summary = useMemo(() => {
    const per = (who: TemplateFieldSigner) => fields.filter((f) => f.signer === who)
    return (['client', 'attorney'] as TemplateFieldSigner[]).map((who) => ({
      who,
      total: per(who).length,
      required: per(who).filter((f) => f.required).length,
      signatures: per(who).filter((f) => f.type === 'signature').length,
      pages: Array.from(new Set(per(who).map((f) => f.page + 1))).sort((a, b) => a - b),
    }))
  }, [fields])

  const save = async () => {
    if (problems.length) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveFirmTemplateSignatureFields(template.id, fields, documentType)
      onSaved(saved)
    } catch (e: any) {
      setSaveError(e?.response?.data?.error || 'Could not save the fields.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60" role="dialog" aria-modal="true" aria-label="Place signature fields">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900">Place signature fields · {template.name}</h2>
          <p className="text-xs text-slate-500">
            Pick a field and signer, then click the page where it goes. Drag to move, use the corner to resize, Delete to remove.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || problems.length > 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save fields
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 space-y-5 overflow-y-auto border-r border-slate-200 bg-white p-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Signer</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['client', 'attorney'] as TemplateFieldSigner[]).map((who) => (
                <button
                  key={who}
                  type="button"
                  disabled={who === 'attorney' && !attorneyAllowed}
                  onClick={() => setSigner(who)}
                  className={`rounded-lg border px-2 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                    signer === who ? `${SIGNER_STYLE[who].chip} border-transparent ring-2 ring-offset-1 ring-slate-300` : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {SIGNER_STYLE[who].label}
                </button>
              ))}
            </div>
            {!attorneyAllowed && (
              <p className="mt-1.5 text-xs text-slate-400">Attorney fields are for retainers and fee agreements, which the attorney countersigns.</p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Field</h3>
            <div className="space-y-1">
              {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTool(type)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${
                    tool === type ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <section className="rounded-lg border border-slate-200 p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selected · page {selected.page + 1}
              </h3>
              <label className="mb-2 block text-xs text-slate-600">
                Type
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={selected.type}
                  onChange={(e) => update(selected.id, { type: e.target.value as TemplateFieldType })}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mb-2 block text-xs text-slate-600">
                Signer
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={selected.signer}
                  onChange={(e) => update(selected.id, { signer: e.target.value as TemplateFieldSigner })}
                >
                  <option value="client">Client</option>
                  <option value="attorney" disabled={!attorneyAllowed}>
                    Attorney
                  </option>
                </select>
              </label>
              {(selected.type === 'text' || selected.type === 'checkbox') && (
                <label className="mb-2 block text-xs text-slate-600">
                  Label shown to the signer
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={selected.label || ''}
                    maxLength={80}
                    onChange={(e) => update(selected.id, { label: e.target.value })}
                    placeholder="e.g. Date of birth"
                  />
                </label>
              )}
              <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selected.required}
                  disabled={selected.type === 'signature' || selected.type === 'date_signed'}
                  onChange={(e) => update(selected.id, { required: e.target.checked })}
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => remove(selected.id)}
                className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
              >
                <Trash2 className="h-4 w-4" /> Remove field
              </button>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recipients</h3>
            <ul className="space-y-2">
              {summary
                .filter((s) => s.who === 'client' || attorneyAllowed || s.total > 0)
                .map((s) => (
                  <li key={s.who} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${SIGNER_STYLE[s.who].chip}`}>
                        {s.who === 'client' ? 'Signer 1 · Client' : 'Signer 2 · Attorney'}
                      </span>
                      <span className="text-xs text-slate-500">{s.total} fields</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {s.signatures} signature{s.signatures === 1 ? '' : 's'} · {s.required} required
                      {s.pages.length ? ` · page${s.pages.length > 1 ? 's' : ''} ${s.pages.join(', ')}` : ''}
                    </p>
                  </li>
                ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview as</h3>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              {(['all', 'client', 'attorney'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setShow(v)}
                  className={`flex-1 rounded-md px-2 py-1 font-medium ${show === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                >
                  {v === 'all' ? 'Everyone' : SIGNER_STYLE[v].label}
                </button>
              ))}
            </div>
          </section>

          {(problems.length > 0 || saveError) && (
            <div className="space-y-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {saveError && <p className="text-rose-700">{saveError}</p>}
            </div>
          )}
          {fields.length === 0 && !loading && (
            <p className="text-xs text-slate-500">
              With no fields placed, Dropbox Sign adds its own signature page after your document instead.
            </p>
          )}
        </aside>

        <main className="min-w-0 flex-1 overflow-auto bg-slate-200 p-6" onClick={() => setSelectedId(null)}>
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening the PDF…
            </div>
          )}
          {loadError && (
            <div className="mx-auto max-w-lg rounded-lg bg-white p-4 text-sm text-rose-700 ring-1 ring-rose-200">{loadError}</div>
          )}
          <div className="mx-auto space-y-6" style={{ width: PAGE_WIDTH }}>
            {pages.map((page, pageIndex) => (
              <div key={pageIndex}>
                <p className="mb-1 text-xs font-medium text-slate-500">Page {pageIndex + 1}</p>
                <div
                  data-page={pageIndex}
                  className="relative cursor-crosshair bg-white shadow-md"
                  style={{ width: PAGE_WIDTH, height: PAGE_WIDTH * page.aspect }}
                  onPointerDown={(e) => placeAt(pageIndex, e)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src={page.url} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none" />
                  {fields
                    .filter((f) => f.page === pageIndex)
                    .map((f) => {
                      const dimmed = show !== 'all' && show !== f.signer
                      const style = SIGNER_STYLE[f.signer]
                      return (
                        <div
                          key={f.id}
                          className={`absolute flex cursor-move items-center overflow-hidden rounded-sm border-2 px-1 text-[11px] font-semibold leading-none ${style.box} ${
                            selectedId === f.id ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                          } ${dimmed ? 'opacity-20' : ''}`}
                          style={{
                            left: `${f.x * 100}%`,
                            top: `${f.y * 100}%`,
                            width: `${f.width * 100}%`,
                            height: `${f.height * 100}%`,
                          }}
                          onPointerDown={(e) => startDrag(f, 'move', e)}
                          onPointerMove={onDragMove}
                          onPointerUp={endDrag}
                          title={`${style.label} · ${TYPE_LABEL[f.type]}${f.required ? ' · required' : ''}`}
                        >
                          {f.type !== 'checkbox' && (
                            <span className="truncate">
                              {f.type === 'text' && f.label ? f.label : TYPE_LABEL[f.type]}
                              {f.required ? ' *' : ''}
                            </span>
                          )}
                          {selectedId === f.id && (
                            <span
                              className="absolute bottom-0 right-0 h-2.5 w-2.5 cursor-se-resize bg-slate-900"
                              onPointerDown={(e) => startDrag(f, 'resize', e)}
                              onPointerMove={onDragMove}
                              onPointerUp={endDrag}
                            />
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
