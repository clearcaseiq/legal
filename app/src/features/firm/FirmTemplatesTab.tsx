/**
 * Firm Dashboard → Firm Templates tab. A firm-level document library
 * (retainer, HIPAA, intake package, LOR, etc.). Each template can carry an
 * editable text/markdown body AND/OR an uploaded source file (PDF/DOCX).
 * PDF-backed templates can be sent for e-signature against a specific case.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Upload,
  Eye,
  Send,
  X,
  Paperclip,
  FileUp,
} from 'lucide-react'
import {
  getFirmTemplates,
  createFirmTemplate,
  deleteFirmTemplate,
  seedRecommendedFirmTemplates,
  uploadFirmTemplateFile,
  getFirmTemplateFileObjectUrl,
  sendFirmTemplateForSignature,
  previewFirmTemplate,
  type FirmTemplate,
  type FirmTemplatesResponse,
} from '../../lib/api'
import { getEsignProviders } from '../../lib/api-esign'
import { SectionCard, EmptyState, Badge } from '../shared/ui'
import ConfirmDialog from '../../components/ConfirmDialog'
import ModalPortal from '../../components/ModalPortal'
import { formatClaimType } from '../../lib/claimTypes'
import { FirmTemplateForm } from './FirmTemplateForm'

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60'
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

function formatBytes(n: number | null): string {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function FirmTemplatesTab() {
  const [data, setData] = useState<FirmTemplatesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<FirmTemplate | 'new' | null>(null)
  const [sending, setSending] = useState<FirmTemplate | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  // null until the probe answers, so rows don't flash "not connected" (CP-436).
  const [esignConfigured, setEsignConfigured] = useState<boolean | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    getEsignProviders()
      .then((providers) => setEsignConfigured(providers.some((p) => p.configured)))
      // A failed probe shouldn't block sending; the server still enforces it.
      .catch(() => setEsignConfigured(true))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    getFirmTemplates()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const canManage = data?.canManage ?? false
  const categories = data?.categories ?? []

  const grouped = useMemo(() => {
    const templates = data?.templates ?? []
    return categories
      .map((c) => ({ ...c, items: templates.filter((t) => t.category === c.key) }))
      .filter((g) => g.items.length > 0)
  }, [data, categories])

  const seed = async () => {
    setSeeding(true)
    try {
      const res = await seedRecommendedFirmTemplates()
      setData((prev) => (prev ? { ...prev, templates: res.templates } : prev))
    } finally {
      setSeeding(false)
    }
  }

  // Import one file into a new template. Text files (.txt/.md) become the
  // editable body; PDF/Word files are attached as the signable source document.
  const importOne = async (file: File): Promise<FirmTemplate> => {
    const dot = file.name.lastIndexOf('.')
    const baseName = (dot > 0 ? file.name.slice(0, dot) : file.name).trim() || 'Imported template'
    const ext = (dot >= 0 ? file.name.slice(dot + 1) : '').toLowerCase()
    const isText = ext === 'txt' || ext === 'md' || file.type.startsWith('text/')
    if (isText) {
      const text = await file.text()
      return createFirmTemplate({ name: baseName, category: 'other', body: text })
    }
    const created = await createFirmTemplate({ name: baseName, category: 'other' })
    return uploadFirmTemplateFile(created.id, file)
  }

  // Bulk import: process files sequentially so failures are isolated.
  const onImport = async (fileList: FileList | null) => {
    if (importInputRef.current) importInputRef.current.value = ''
    const files = fileList ? Array.from(fileList) : []
    if (files.length === 0) return
    setImporting(true)
    setImportError(null)
    setImportStatus(null)

    let last: FirmTemplate | null = null
    let ok = 0
    const failed: string[] = []
    for (let i = 0; i < files.length; i++) {
      setImportStatus(`Importing ${i + 1} of ${files.length}…`)
      try {
        last = await importOne(files[i])
        ok += 1
      } catch {
        failed.push(files[i].name)
      }
    }

    setImporting(false)
    setImportStatus(null)
    if (failed.length) {
      setImportError(
        `Imported ${ok} of ${files.length}. Couldn't import: ${failed.join(', ')}. Use PDF, Word, or .txt/.md files.`
      )
    }
    load()
    // Single successful import → jump into it to finish setup; bulk → stay in list.
    if (ok === 1 && files.length === 1 && last) setEditing(last)
  }

  const dropEnabled = canManage && !editing && !importing

  return (
    <div
      className="relative space-y-6"
      onDragOver={(e) => {
        if (!dropEnabled) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        // Only clear when the pointer actually leaves the container.
        if (e.currentTarget === e.target) setDragOver(false)
      }}
      onDrop={(e) => {
        if (!dropEnabled) return
        e.preventDefault()
        setDragOver(false)
        onImport(e.dataTransfer.files)
      }}
    >
      {dragOver && dropEnabled && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/80">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <FileUp className="h-5 w-5" /> Drop files to import as templates
          </div>
        </div>
      )}
      <SectionCard
        title="Firm templates"
        trailing={
          canManage && !editing ? (
            <div className="flex items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => onImport(e.target.files)}
              />
              <button
                type="button"
                className={btnGhost}
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
              >
                <FileUp className="h-4 w-4" /> {importing ? importStatus || 'Importing…' : 'Import'}
              </button>
              <button type="button" className={btnGhost} onClick={seed} disabled={seeding}>
                <Sparkles className="h-4 w-4" /> {seeding ? 'Adding…' : 'Add recommended'}
              </button>
              <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
                <Plus className="h-4 w-4" /> New template
              </button>
            </div>
          ) : undefined
        }
      >
        <p className="mb-4 text-sm text-slate-500">
          Reusable firm documents: retainers, HIPAA authorizations, intake packages, and more. Import or drag &amp; drop
          files, or start from the recommended set. Attach a PDF to send it for signature.
        </p>

        {importError && (
          <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            {importError}
          </div>
        )}

        {editing && data ? (
          <FirmTemplateForm
            key={editing === 'new' ? 'new' : editing.id}
            value={editing === 'new' ? null : editing}
            categories={categories}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              load()
            }}
          />
        ) : loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : !data || data.templates.length === 0 ? (
          <EmptyState message="No templates yet. Add the recommended starter set or create your own." />
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.key}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</h4>
                <div className="space-y-2">
                  {group.items.map((t) => (
                    <TemplateRow
                      key={t.id}
                      template={t}
                      canManage={canManage}
                      hasRecipients={(data.recipients?.length ?? 0) > 0}
                      esignConfigured={esignConfigured}
                      onEdit={() => setEditing(t)}
                      onSend={() => setSending(t)}
                      onChanged={load}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {sending && data && (
        <SendModal
          template={sending}
          recipients={data.recipients}
          providers={data.providers}
          onClose={() => setSending(null)}
        />
      )}
    </div>
  )
}

function TemplateRow({
  template,
  canManage,
  hasRecipients,
  esignConfigured,
  onEdit,
  onSend,
  onChanged,
}: {
  template: FirmTemplate
  canManage: boolean
  hasRecipients: boolean
  /** null while the provider probe is still in flight. */
  esignConfigured: boolean | null
  onEdit: () => void
  onSend: () => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)

  // A template with neither a PDF nor body text has nothing to render into a
  // signable document, and there's nothing to send to without an accepted case
  // or a connected provider. The button used to simply vanish, which QA read as
  // a missing feature (CP-438), and sending with no provider connected returned
  // a raw vendor error (CP-436). Say which of those it is, in the row.
  const signable = template.isPdf || Boolean(template.body && template.body.trim())
  const blockedReason = !signable
    ? template.hasFile
      ? 'Only PDF attachments can be sent for signature. Re-upload this template as a PDF or add body text.'
      : 'Add body text or attach a PDF before this template can be sent for signature.'
    : esignConfigured === false
      ? 'E-signature isn’t connected yet. A firm admin can connect Dropbox Sign or Documenso under Firm Settings → Integrations.'
      : !hasRecipients
        ? 'No accepted cases to send to yet. Accept a case first.'
        : null

  const view = async () => {
    setViewError(null)
    try {
      const url = await getFirmTemplateFileObjectUrl(template.id)
      window.open(url, '_blank', 'noreferrer')
    } catch {
      setViewError('Unable to open the attached file.')
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await deleteFirmTemplate(template.id)
      setConfirmDelete(false)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="font-semibold text-slate-900">{template.name}</span>
            {!template.isActive && <Badge tone="neutral">Inactive</Badge>}
            {template.hasFile ? (
              <Badge tone={template.isPdf ? 'success' : 'blue'}>
                {template.isPdf ? 'PDF' : 'DOCX'}
              </Badge>
            ) : (
              <Badge tone="neutral">Text only</Badge>
            )}
          </div>
          {template.description && <p className="mt-1 text-xs text-slate-500">{template.description}</p>}
          {template.fileName && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <Paperclip className="h-3 w-3" /> {template.fileName}
              {template.fileSize ? ` · ${formatBytes(template.fileSize)}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {template.hasFile && (
            <button type="button" className={btnGhost} onClick={view}>
              <Eye className="h-3.5 w-3.5" /> View
            </button>
          )}
          {canManage && (
            <button
              type="button"
              className={btnGhost}
              onClick={onSend}
              disabled={!!blockedReason}
              title={blockedReason ?? 'Send for signature'}
            >
              <Send className="h-3.5 w-3.5" /> Send for signature
            </button>
          )}
          {canManage && (
            <>
              <button type="button" className={btnGhost} onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                className={`${btnGhost} text-rose-600 hover:bg-rose-50`}
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      </div>
      {blockedReason && canManage && <p className="mt-2 text-xs text-slate-500">{blockedReason}</p>}
      {viewError && <p className="mt-2 text-xs text-rose-600">{viewError}</p>}
      <ConfirmDialog
        open={confirmDelete}
        busy={busy}
        title="Delete this template?"
        message={<>“{template.name}” will be removed for everyone at your firm. This cannot be undone.</>}
        confirmLabel="Delete template"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function SendModal({
  template,
  recipients,
  providers,
  onClose,
}: {
  template: FirmTemplate
  recipients: FirmTemplatesResponse['recipients']
  providers: FirmTemplatesResponse['providers']
  onClose: () => void
}) {
  const configured = providers.filter((p) => p.configured)
  const [leadId, setLeadId] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [title, setTitle] = useState(template.name)
  const [provider, setProvider] = useState(configured[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // When there's no attached PDF, the server renders the (token-filled) body to
  // a PDF. Show a live preview of that filled body once a case is picked.
  const willRenderFromBody = !template.isPdf && Boolean(template.body && template.body.trim())
  const [preview, setPreview] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (!willRenderFromBody || !leadId) {
      setPreview(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    previewFirmTemplate(template.id, leadId)
      .then((r) => {
        if (!cancelled) setPreview(r.body)
      })
      .catch(() => {
        if (!cancelled) setPreview(null)
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [willRenderFromBody, leadId, template.id])

  const pickRecipient = (id: string) => {
    setLeadId(id)
    const r = recipients.find((x) => x.leadId === id)
    if (r) {
      setSignerName(r.name)
      setSignerEmail(r.email)
    }
  }

  const send = async () => {
    if (!leadId || !signerName.trim() || !signerEmail.trim()) {
      setError('Choose a client and confirm their name and email')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await sendFirmTemplateForSignature(template.id, {
        leadId,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        title: title.trim() || template.name,
        provider: provider || undefined,
      })
      setDone(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.error || 'Failed to send for signature')
    } finally {
      setBusy(false)
    }
  }

  return (
    // With the document preview and provider picker expanded this dialog is
    // taller than a laptop viewport. Centring it without a height cap pushed the
    // top and the action buttons off screen with nothing to scroll (CP-435), so
    // the overlay scrolls and the body gets its own scroll region.
    <ModalPortal>
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center">
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Send className="h-4 w-4 text-indigo-600" /> Send for signature
          </h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/*
          flex-auto, not flex-1. The card's height is capped but not definite, so
          flex-1's `flex-basis: 0%` has no definite main size to resolve against
          and collapses the body to nothing — a white card with only a header,
          reported as blank white space (CP-451). flex-auto sizes from content
          and still shrinks to fit the cap.
        */}
        <div className="min-h-0 flex-auto overflow-y-auto p-5">
        {done ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
              “{template.name}” was sent to {signerEmail} for signature.
            </div>
            <div className="flex justify-end">
              <button type="button" className={btnPrimary} onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Sending <span className="font-medium text-slate-700">{template.name}</span>{' '}
              {willRenderFromBody
                ? '(generated from the template body with the client\u2019s details filled in)'
                : '(attached PDF)'}{' '}
              to a client on one of your firm's active cases.
            </p>
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

            <div>
              <label className={labelCls}>Client / case</label>
              {/*
                The option text used to be "Name — email (slip_and_fall)": a raw
                database slug, and an email address that pushed the name out of
                view on a narrow select (CP-455). Lead with the name and the
                readable case type; the email is confirmed in the Signer email
                field directly below anyway.
              */}
              <select
                className={inputCls}
                value={leadId}
                onChange={(e) => pickRecipient(e.target.value)}
                disabled={recipients.length === 0}
              >
                <option value="">
                  {recipients.length === 0 ? 'No active cases to send to' : 'Select a client…'}
                </option>
                {recipients.map((r) => (
                  <option key={r.leadId} value={r.leadId}>
                    {r.name}
                    {r.claimType ? ` — ${formatClaimType(r.claimType)}` : ''}
                  </option>
                ))}
              </select>
              {recipients.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Documents are sent against an accepted case. Accept a case first, then send it from here.
                </p>
              ) : null}
            </div>

            {willRenderFromBody && leadId && (
              <div>
                <label className={labelCls}>Filled document preview</label>
                <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
                  {previewLoading ? (
                    <span className="text-slate-400">Building preview…</span>
                  ) : preview ? (
                    <pre className="whitespace-pre-wrap font-sans">{preview}</pre>
                  ) : (
                    <span className="text-slate-400">Preview unavailable.</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Blanks (______) mark fields we couldn't fill automatically.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Signer name</label>
                <input className={inputCls} value={signerName} onChange={(e) => setSignerName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Signer email</label>
                <input className={inputCls} value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Document title</label>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {configured.length > 0 ? (
              <div>
                <label className={labelCls}>E-signature provider</label>
                <select className={inputCls} value={provider} onChange={(e) => setProvider(e.target.value)}>
                  {configured.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                No e-signature provider is connected yet. Ask a firm admin to connect Dropbox Sign or
                Documenso under Firm Settings → Integrations, or download the document and send it manually.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={send}
                // Without a provider the request can only come back as a server
                // error, so block it here rather than surfacing that (CP-436).
                disabled={busy || configured.length === 0}
                title={configured.length === 0 ? 'Connect an e-signature provider first' : undefined}
              >
                {busy ? 'Sending…' : 'Send for signature'}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
      </div>
    </div>
    </ModalPortal>
  )
}
