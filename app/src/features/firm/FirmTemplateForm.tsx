/**
 * Shared create/edit form for firm library templates (body + optional PDF/Word).
 * Used by Firm Dashboard and case Signatures.
 */
import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import {
  createFirmTemplate,
  removeFirmTemplateFile,
  updateFirmTemplate,
  uploadFirmTemplateFile,
  type FirmTemplate,
} from '../../lib/api'

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

export function FirmTemplateForm({
  value,
  categories,
  onCancel,
  onSaved,
  onUpdated,
}: {
  value: FirmTemplate | null
  categories: Array<{ key: string; label: string }>
  onCancel: () => void
  onSaved: (template: FirmTemplate) => void
  /** Fired after attachment replace/remove so callers can refresh sendability hints. */
  onUpdated?: (template: FirmTemplate) => void
}) {
  const [name, setName] = useState(value?.name ?? '')
  const [category, setCategory] = useState(value?.category ?? 'other')
  const [description, setDescription] = useState(value?.description ?? '')
  const [body, setBody] = useState(value?.body ?? '')
  const [isActive, setIsActive] = useState(value?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [file, setFile] = useState<{ fileName: string | null; fileSize: number | null; hasFile: boolean } | null>(
    value ? { fileName: value.fileName, fileSize: value.fileSize, hasFile: value.hasFile } : null,
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
      const saved = value ? await updateFirmTemplate(value.id, payload) : await createFirmTemplate(payload)
      onSaved(saved)
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
      onUpdated?.(updated)
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
      onUpdated?.(updated)
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
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Contingency Fee Agreement"
          />
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
          <p className="mt-1 text-xs text-slate-400">
            Available tokens:{' '}
            <code className="text-slate-500">
              {
                '{{client_name}} {{client_email}} {{client_phone}} {{firm_name}} {{attorney_name}} {{date}} {{case_ref}} {{claim_type}} {{matter_description}} {{venue}}'
              }
            </code>
            . On send (text-only templates), these are filled from the case and the body is rendered to a signable PDF.
          </p>
        </div>
      </div>

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
                <button
                  type="button"
                  className={`${btnGhost} text-rose-600 hover:bg-rose-50`}
                  onClick={clearFile}
                  disabled={fileBusy}
                >
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
