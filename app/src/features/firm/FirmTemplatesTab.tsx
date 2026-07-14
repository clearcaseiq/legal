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
  updateFirmTemplate,
  deleteFirmTemplate,
  seedRecommendedFirmTemplates,
  uploadFirmTemplateFile,
  removeFirmTemplateFile,
  getFirmTemplateFileObjectUrl,
  sendFirmTemplateForSignature,
  type FirmTemplate,
  type FirmTemplatesResponse,
} from '../../lib/api'
import { SectionCard, EmptyState, Badge } from '../shared/ui'

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
  const importInputRef = useRef<HTMLInputElement | null>(null)

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
          Reusable firm documents — retainers, HIPAA authorizations, intake packages, and more. Import or drag &amp; drop
          files, or start from the recommended set. Attach a PDF to send it for signature.
        </p>

        {importError && (
          <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            {importError}
          </div>
        )}

        {editing && data ? (
          <TemplateForm
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
  onEdit,
  onSend,
  onChanged,
}: {
  template: FirmTemplate
  canManage: boolean
  hasRecipients: boolean
  onEdit: () => void
  onSend: () => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)

  const view = async () => {
    try {
      const url = await getFirmTemplateFileObjectUrl(template.id)
      window.open(url, '_blank', 'noreferrer')
    } catch {
      alert('Unable to open the attached file.')
    }
  }

  const remove = async () => {
    if (!confirm(`Delete the "${template.name}" template? This cannot be undone.`)) return
    setBusy(true)
    try {
      await deleteFirmTemplate(template.id)
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
          {canManage && template.isPdf && (
            <button
              type="button"
              className={btnGhost}
              onClick={onSend}
              disabled={!hasRecipients}
              title={hasRecipients ? 'Send for signature' : 'No signable clients on active cases yet'}
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
                onClick={remove}
                disabled={busy}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TemplateForm({
  value,
  categories,
  onCancel,
  onSaved,
}: {
  value: FirmTemplate | null
  categories: Array<{ key: string; label: string }>
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(value?.name ?? '')
  const [category, setCategory] = useState(value?.category ?? 'other')
  const [description, setDescription] = useState(value?.description ?? '')
  const [body, setBody] = useState(value?.body ?? '')
  const [isActive, setIsActive] = useState(value?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // File state lives on the saved template; reflect edits locally.
  const [file, setFile] = useState<{ fileName: string | null; fileSize: number | null; hasFile: boolean } | null>(
    value ? { fileName: value.fileName, fileSize: value.fileSize, hasFile: value.hasFile } : null
  )
  const [fileBusy, setFileBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const save = async () => {
    if (!name.trim()) {
      setError('A template name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        category,
        description: description.trim() || null,
        body: body || null,
        isActive,
      }
      if (value) await updateFirmTemplate(value.id, payload)
      else await createFirmTemplate(payload)
      onSaved()
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save template')
      setSaving(false)
    }
  }

  const onPickFile = async (f: File | undefined) => {
    if (!f || !value) return
    setFileBusy(true)
    setError(null)
    try {
      const updated = await uploadFirmTemplateFile(value.id, f)
      setFile({ fileName: updated.fileName, fileSize: updated.fileSize, hasFile: updated.hasFile })
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to upload file')
    } finally {
      setFileBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const clearFile = async () => {
    if (!value) return
    setFileBusy(true)
    try {
      const updated = await removeFirmTemplateFile(value.id)
      setFile({ fileName: updated.fileName, fileSize: updated.fileSize, hasFile: updated.hasFile })
    } finally {
      setFileBusy(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Contingency Fee Agreement" />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Description</label>
          <input
            className={inputCls}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short summary of when to use this template"
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Body (supports {'{{merge_tokens}}'})</label>
          <textarea
            className={`${inputCls} min-h-[220px] font-mono text-xs`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Template text. Use tokens like {{client_name}}, {{firm_name}}, {{date}}…"
          />
        </div>
      </div>

      {/* Attachment (only after the template exists) */}
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3">
        <label className={labelCls}>Source file (PDF or Word)</label>
        {value ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
            <button type="button" className={btnGhost} onClick={() => fileInputRef.current?.click()} disabled={fileBusy}>
              <Upload className="h-3.5 w-3.5" /> {file?.hasFile ? 'Replace file' : 'Attach file'}
            </button>
            {file?.hasFile && (
              <>
                <span className="text-xs text-slate-500">
                  {file.fileName} {file.fileSize ? `· ${formatBytes(file.fileSize)}` : ''}
                </span>
                <button type="button" className={`${btnGhost} text-rose-600 hover:bg-rose-50`} onClick={clearFile} disabled={fileBusy}>
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              </>
            )}
            <span className="w-full text-xs text-slate-400">Only PDF files can be sent for e-signature.</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Save the template first, then re-open it to attach a PDF/Word file.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : value ? 'Save changes' : 'Create template'}
        </button>
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancel
        </button>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Send className="h-4 w-4 text-indigo-600" /> Send for signature
          </h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

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
              Sending <span className="font-medium text-slate-700">{template.name}</span> (PDF) to a client on one of
              your firm's active cases.
            </p>
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

            <div>
              <label className={labelCls}>Client / case</label>
              <select className={inputCls} value={leadId} onChange={(e) => pickRecipient(e.target.value)}>
                <option value="">Select a client…</option>
                {recipients.map((r) => (
                  <option key={r.leadId} value={r.leadId}>
                    {r.name} — {r.email}
                    {r.claimType ? ` (${r.claimType})` : ''}
                  </option>
                ))}
              </select>
            </div>

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
                No e-signature provider is configured on the server yet. Sending will fail until one is connected.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={onClose}>
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={send} disabled={busy}>
                {busy ? 'Sending…' : 'Send for signature'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
