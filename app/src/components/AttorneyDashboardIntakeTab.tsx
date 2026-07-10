import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download,
  Upload,
  FileSpreadsheet,
  FilePlus2,
  UserPlus,
  Copy,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  Wand2,
} from 'lucide-react'
import { cloneCaseTemplate, createManualIntake, importCase, saveSmartIntakeConfig } from '../lib/api'

type AttorneyDashboardIntakeTabProps = {
  onGoToLeads: () => void
}

// Canonical fields the importer understands, shown in the mapping UI.
const MAP_FIELDS: Array<{ key: string; label: string; synonyms: string[] }> = [
  { key: 'firstName', label: 'First name', synonyms: ['first name', 'client first name', 'plaintiff first name', 'firstname', 'first', 'given name'] },
  { key: 'lastName', label: 'Last name', synonyms: ['last name', 'client last name', 'plaintiff last name', 'lastname', 'last', 'surname', 'family name'] },
  { key: 'email', label: 'Email', synonyms: ['email', 'client email', 'plaintiff email', 'e-mail', 'email address'] },
  { key: 'phone', label: 'Phone', synonyms: ['phone', 'mobile', 'client phone', 'plaintiff phone', 'telephone', 'cell', 'phone number'] },
  { key: 'caseType', label: 'Case type', synonyms: ['case type', 'claim type', 'matter type', 'practice area', 'case_type'] },
  { key: 'incidentDate', label: 'Incident date', synonyms: ['incident date', 'date of loss', 'dol', 'doi', 'accident date', 'incident_date'] },
  { key: 'state', label: 'State', synonyms: ['state', 'venue state', 'jurisdiction state'] },
  { key: 'county', label: 'County', synonyms: ['county', 'venue county', 'jurisdiction county'] },
  { key: 'description', label: 'Description', synonyms: ['description', 'narrative', 'facts', 'summary', 'notes'] },
  { key: 'externalId', label: 'External ID', synonyms: ['external id', 'case id', 'matter id', 'file number', 'external_id'] },
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

type ParsedPreview = { fileName: string; headers: string[]; rows: Record<string, string>[]; unsupported?: string }

function splitDelimited(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]
    if (c === '"' && inQuotes && line[i + 1] === '"') {
      current += '"'
      i += 1
    } else if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  cells.push(current.trim())
  return cells
}

function parseDelimited(content: string, delimiter: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = splitDelimited(lines[0], delimiter).map((h) => h.trim())
  const rows = lines.slice(1).map((line) => {
    const values = splitDelimited(line, delimiter)
    return headers.reduce<Record<string, string>>((row, header, i) => {
      row[header] = values[i] || ''
      return row
    }, {})
  })
  return { headers, rows }
}

function flattenObj(value: any, prefix = ''): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  return Object.entries(value).reduce<Record<string, string>>((row, [key, nested]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      Object.assign(row, flattenObj(nested, nextKey))
    } else if (Array.isArray(nested)) {
      row[nextKey] = nested.map((it) => (typeof it === 'object' ? JSON.stringify(it) : String(it))).join('; ')
    } else {
      row[nextKey] = nested == null ? '' : String(nested)
    }
    return row
  }, {})
}

async function parsePreviewFile(file: File): Promise<ParsedPreview> {
  const name = file.name
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  if (['.xlsx', '.xls'].includes(ext)) {
    return { fileName: name, headers: [], rows: [], unsupported: 'Excel files can’t be previewed in the browser — export as CSV to preview and map columns.' }
  }
  const content = await file.text()
  if (ext === '.json') {
    try {
      const parsed = JSON.parse(content)
      const arr = Array.isArray(parsed) ? parsed : parsed.cases || parsed.matters || parsed.projects || [parsed]
      const rows = arr.map((r: unknown) => flattenObj(r))
      const headers = Array.from(new Set(rows.flatMap((r: Record<string, string>) => Object.keys(r))))
      return { fileName: name, headers, rows }
    } catch {
      return { fileName: name, headers: [], rows: [], unsupported: 'Could not parse this JSON file.' }
    }
  }
  const delimiter = ext === '.tsv' ? '\t' : ','
  const { headers, rows } = parseDelimited(content, delimiter)
  if (headers.length === 0) return { fileName: name, headers: [], rows: [], unsupported: 'No columns detected in this file.' }
  return { fileName: name, headers, rows }
}

function guessMapping(headers: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  const used = new Set<string>()
  for (const field of MAP_FIELDS) {
    const match = headers.find((h) => !used.has(h) && field.synonyms.some((syn) => norm(syn) === norm(h)))
    if (match) {
      out[field.key] = match
      used.add(match)
    }
  }
  return out
}

const IMPORT_SOURCES = [
  { value: 'clio', label: 'Clio', hint: 'API / export' },
  { value: 'filevine', label: 'Filevine', hint: 'API / export' },
  { value: 'needles', label: 'Needles', hint: 'Export' },
  { value: 'litify', label: 'Litify', hint: 'Export' },
  { value: 'spreadsheet', label: 'Spreadsheet / CSV', hint: 'Upload a file' },
]

const INCLUDE_OPTIONS: Array<{ key: 'includeDocuments' | 'includeHistory' | 'includeTasks' | 'includeMedical'; label: string; desc: string }> = [
  { key: 'includeDocuments', label: 'Documents', desc: 'PDFs, Word, images, emails' },
  { key: 'includeHistory', label: 'Negotiation history', desc: 'Historical offers & demands' },
  { key: 'includeTasks', label: 'Tasks & deadlines', desc: 'Deadlines, tasks, and notes' },
  { key: 'includeMedical', label: 'Medical & liens', desc: 'Medical bills & lien extraction' },
]

const SMART_OPTIONS: Array<{ key: 'dynamicQuestionnaires' | 'conditionalLogic' | 'missingInfoDetection' | 'autoFollowUps'; label: string; desc: string }> = [
  { key: 'dynamicQuestionnaires', label: 'Dynamic questionnaires', desc: 'Tailor questions to the case type' },
  { key: 'conditionalLogic', label: 'Conditional logic', desc: 'Show/hide fields based on answers' },
  { key: 'missingInfoDetection', label: 'Missing-info detection', desc: 'Flag gaps before submission' },
  { key: 'autoFollowUps', label: 'Auto follow-ups', desc: 'Prompt clients for what’s missing' },
]

const INTAKE_TEMPLATES = ['PI', 'MVA', 'Premises', 'MedMal']

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function Banner({ message }: { message: string }) {
  const failed = /fail|error|could not|unable/i.test(message)
  const success = /import|saved|created|queued|clon/i.test(message) && !failed
  const tone = failed
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : success
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-slate-200 bg-slate-50 text-slate-600'
  const Icon = failed ? AlertCircle : success ? CheckCircle2 : Loader2
  return (
    <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      <Icon className={`h-4 w-4 shrink-0 ${!failed && !success ? 'animate-spin' : ''}`} />
      <span>{message}</span>
    </div>
  )
}

const cardCls = 'rounded-xl border border-slate-200 bg-white p-5'
const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50'

export default function AttorneyDashboardIntakeTab({ onGoToLeads }: AttorneyDashboardIntakeTabProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [intakeTemplate, setIntakeTemplate] = useState('PI')
  const [intakeMessage, setIntakeMessage] = useState<string | null>(null)
  const [manualBusy, setManualBusy] = useState(false)
  const [cloneBusy, setCloneBusy] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<ParsedPreview | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importForm, setImportForm] = useState({
    source: 'clio',
    includeDocuments: true,
    includeHistory: true,
    includeTasks: true,
    includeMedical: true,
    notes: '',
    files: [] as File[],
  })
  const [smartIntakeConfig, setSmartIntakeConfig] = useState({
    dynamicQuestionnaires: true,
    conditionalLogic: true,
    missingInfoDetection: true,
    autoFollowUps: true,
  })
  const [smartIntakeMessage, setSmartIntakeMessage] = useState<string | null>(null)
  const [smartSaving, setSmartSaving] = useState(false)

  // Parse the first uploaded file client-side so the attorney can preview the
  // rows and correct the column mapping before anything is created.
  const refreshPreview = async (firstFile: File | undefined) => {
    if (!firstFile) {
      setPreview(null)
      setMapping({})
      return
    }
    try {
      const parsed = await parsePreviewFile(firstFile)
      setPreview(parsed)
      setMapping(parsed.headers.length ? guessMapping(parsed.headers) : {})
    } catch {
      setPreview({ fileName: firstFile.name, headers: [], rows: [], unsupported: 'Could not read this file.' })
      setMapping({})
    }
  }

  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return
    setImportForm((prev) => {
      const seen = new Set(prev.files.map((f) => `${f.name}:${f.size}`))
      const merged = [...prev.files]
      for (const f of incoming) {
        const key = `${f.name}:${f.size}`
        if (!seen.has(key)) {
          seen.add(key)
          merged.push(f)
        }
      }
      if (merged[0]) void refreshPreview(merged[0])
      return { ...prev, files: merged }
    })
  }

  const removeFile = (index: number) => {
    setImportForm((prev) => {
      const files = prev.files.filter((_, i) => i !== index)
      void refreshPreview(files[0])
      return { ...prev, files }
    })
  }

  const downloadSampleImportFile = () => {
    const headers = ['client_first_name', 'client_last_name', 'email', 'phone', 'case_type', 'incident_date', 'state', 'county', 'description', 'status']
    const sampleRows = [
      ['Jane', 'Doe', 'jane.doe@example.com', '(213) 555-0100', 'auto', '2025-03-14', 'CA', 'Los Angeles', 'Rear-ended at a red light; neck and back injuries with ongoing PT.', 'open'],
      ['John', 'Smith', 'john.smith@example.com', '(415) 555-0182', 'slip_and_fall', '2025-01-08', 'CA', 'San Francisco', 'Slipped on unmarked wet floor at a grocery store; wrist fracture.', 'open'],
    ]
    const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
    const csv = [headers, ...sampleRows].map((row) => row.map(escape).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sample-case-import.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const handleManual = async () => {
    try {
      setManualBusy(true)
      setIntakeMessage('Creating draft case…')
      const data = await createManualIntake({ template: intakeTemplate })
      setIntakeMessage('Draft case created. Opening intake…')
      navigate(`/edit-assessment/${data.assessmentId}`)
    } catch (err: any) {
      setIntakeMessage(err.response?.data?.error || 'Failed to create draft case')
    } finally {
      setManualBusy(false)
    }
  }

  const handleClone = async () => {
    try {
      setCloneBusy(true)
      setIntakeMessage(`Cloning ${intakeTemplate} template…`)
      const data = await cloneCaseTemplate({ template: intakeTemplate })
      navigate(`/edit-assessment/${data.assessmentId}`)
    } catch (err: any) {
      setIntakeMessage(err.response?.data?.error || 'Failed to clone template')
    } finally {
      setCloneBusy(false)
    }
  }

  const handleImport = async () => {
    if (importForm.source === 'spreadsheet' && importForm.files.length === 0) {
      setImportMessage('Add at least one spreadsheet file to import.')
      return
    }
    try {
      setImporting(true)
      setImportMessage('Submitting import request…')
      const cleanMapping = Object.fromEntries(Object.entries(mapping).filter(([, v]) => v))
      const data = await importCase({
        source: importForm.source,
        includeDocuments: importForm.includeDocuments,
        includeHistory: importForm.includeHistory,
        includeTasks: importForm.includeTasks,
        includeMedical: importForm.includeMedical,
        notes: importForm.notes,
        mapping: Object.keys(cleanMapping).length ? cleanMapping : undefined,
        files: importForm.files,
      })
      const createdCount = data.createdCount ?? data.assessmentIds?.length ?? 0
      setImportMessage(
        createdCount > 0
          ? `Imported ${createdCount} case${createdCount === 1 ? '' : 's'} from ${importForm.source}.`
          : 'Import queued. We will hydrate the case once files are processed.',
      )
    } catch (err: any) {
      setImportMessage(err.response?.data?.error || 'Failed to import case')
    } finally {
      setImporting(false)
    }
  }

  const handleSaveSmart = async () => {
    try {
      setSmartSaving(true)
      await saveSmartIntakeConfig(smartIntakeConfig)
      setSmartIntakeMessage('Smart intake preferences saved.')
    } catch (err: any) {
      setSmartIntakeMessage(err.response?.data?.error || 'Failed to save smart intake settings')
    } finally {
      setSmartSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Imports & intake</h3>
        <p className="mt-0.5 text-sm text-slate-500">Create new cases, bulk-import from your case management system, and configure how intake works.</p>
      </div>

      {/* Case creation */}
      <div className={cardCls}>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <FilePlus2 className="h-4 w-4" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Create a case</h4>
            <p className="text-xs text-slate-500">Start from a routed lead, from scratch, or from a reusable template.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            onClick={onGoToLeads}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
          >
            <span className="flex items-center gap-2.5">
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />
              <span className="text-sm font-semibold text-slate-800">From routed lead</span>
            </span>
          </button>
          <button
            onClick={handleManual}
            disabled={manualBusy}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
          >
            <span className="flex items-center gap-2.5">
              {manualBusy ? <Loader2 className="h-4 w-4 animate-spin text-brand-600" /> : <UserPlus className="h-4 w-4 text-slate-400 group-hover:text-brand-600" />}
              <span className="text-sm font-semibold text-slate-800">New case (manual)</span>
            </span>
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <select value={intakeTemplate} onChange={(e) => setIntakeTemplate(e.target.value)} className={inputCls + ' !py-1.5'}>
              {INTAKE_TEMPLATES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={handleClone}
              disabled={cloneBusy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
            >
              {cloneBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Clone
            </button>
          </div>
        </div>
        {intakeMessage && <Banner message={intakeMessage} />}
      </div>

      {/* Case import */}
      <div className={cardCls}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Upload className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Import cases</h4>
              <p className="text-xs text-slate-500">Bring cases over from your existing system, with documents and history.</p>
            </div>
          </div>
          <button type="button" onClick={downloadSampleImportFile} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5 text-slate-400" />
            Sample CSV
          </button>
        </div>

        {/* Source picker */}
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Source</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {IMPORT_SOURCES.map((s) => {
            const active = importForm.source === s.value
            return (
              <button
                key={s.value}
                onClick={() => setImportForm((prev) => ({ ...prev, source: s.value }))}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-brand-400 bg-brand-50 ring-1 ring-inset ring-brand-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className={`text-sm font-semibold ${active ? 'text-brand-700' : 'text-slate-800'}`}>{s.label}</div>
                <div className="text-[11px] text-slate-400">{s.hint}</div>
              </button>
            )
          })}
        </div>

        {/* Drag & drop upload */}
        <div className="mt-4">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFiles(Array.from(e.dataTransfer.files || []))
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${dragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}
          >
            <FileSpreadsheet className={`h-7 w-7 ${dragOver ? 'text-brand-500' : 'text-slate-400'}`} />
            <p className="mt-2 text-sm font-medium text-slate-700">
              Drag &amp; drop files here, or <span className="text-brand-600">browse</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">CSV, TSV, JSON, Excel, TXT</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.tsv,.txt,.json,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files || []))
                e.target.value = ''
              }}
            />
          </div>

          {importForm.files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {importForm.files.map((f, i) => (
                <li key={`${f.name}:${f.size}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate font-medium text-slate-700">{f.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatBytes(f.size)}</span>
                  </span>
                  <button onClick={() => removeFile(i)} className="ml-2 shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600" aria-label={`Remove ${f.name}`}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Preview & column mapping */}
        {preview && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            {preview.unsupported ? (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {preview.unsupported}
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-brand-600" />
                  <h5 className="text-sm font-semibold text-slate-800">Preview &amp; map columns</h5>
                  <span className="text-xs text-slate-400">
                    {preview.fileName} · {preview.rows.length} row{preview.rows.length === 1 ? '' : 's'}
                  </span>
                </div>

                <p className="mb-3 text-xs text-slate-500">
                  We auto-matched your columns. Adjust any mapping below — unmapped fields fall back to smart detection.
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {MAP_FIELDS.map((field) => (
                    <label key={field.key} className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{field.label}</span>
                      <select
                        value={mapping[field.key] || ''}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${mapping[field.key] ? 'border-brand-300 text-slate-900' : 'border-slate-300 text-slate-500'}`}
                      >
                        <option value="">— skip / auto —</option>
                        {preview.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                {preview.rows.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Row preview (first {Math.min(5, preview.rows.length)})
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            {preview.headers.map((h) => {
                              const mappedTo = MAP_FIELDS.find((f) => mapping[f.key] === h)
                              return (
                                <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-500">
                                  {h}
                                  {mappedTo && <span className="ml-1 rounded bg-brand-50 px-1 py-0.5 text-[9px] font-bold uppercase text-brand-600">{mappedTo.label}</span>}
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.rows.slice(0, 5).map((row, ri) => (
                            <tr key={ri}>
                              {preview.headers.map((h) => (
                                <td key={h} className="max-w-[220px] truncate px-3 py-1.5 text-slate-600" title={row[h] || ''}>
                                  {row[h] || <span className="text-slate-300">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* What to include */}
        <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">What to include</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INCLUDE_OPTIONS.map((opt) => {
            const checked = importForm[opt.key]
            return (
              <label
                key={opt.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${checked ? 'border-brand-300 bg-brand-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setImportForm((prev) => ({ ...prev, [opt.key]: e.target.checked }))}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{opt.label}</span>
                  <span className="block text-xs text-slate-500">{opt.desc}</span>
                </span>
              </label>
            )
          })}
        </div>

        <input
          value={importForm.notes}
          onChange={(e) => setImportForm((prev) => ({ ...prev, notes: e.target.value }))}
          className={inputCls + ' mt-3'}
          placeholder="Import notes or special handling (optional)"
        />

        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleImport} disabled={importing} className={btnPrimary}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? 'Importing…' : 'Start import'}
          </button>
          {importForm.files.length > 0 && <span className="text-xs text-slate-400">{importForm.files.length} file{importForm.files.length === 1 ? '' : 's'} ready</span>}
        </div>
        {importMessage && <Banner message={importMessage} />}
      </div>

      {/* Smart intake */}
      <div className={cardCls}>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Smart intake engine</h4>
            <p className="text-xs text-slate-500">Control how intake forms adapt and chase missing information.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SMART_OPTIONS.map((opt) => {
            const checked = smartIntakeConfig[opt.key]
            return (
              <label
                key={opt.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${checked ? 'border-brand-300 bg-brand-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setSmartIntakeConfig((prev) => ({ ...prev, [opt.key]: e.target.checked }))}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{opt.label}</span>
                  <span className="block text-xs text-slate-500">{opt.desc}</span>
                </span>
              </label>
            )
          })}
        </div>
        <div className="mt-4">
          <button onClick={handleSaveSmart} disabled={smartSaving} className={btnPrimary}>
            {smartSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {smartSaving ? 'Saving…' : 'Save smart intake settings'}
          </button>
        </div>
        {smartIntakeMessage && <Banner message={smartIntakeMessage} />}
      </div>
    </div>
  )
}
