/**
 * Complete matter migration: the relational preview and import report for a
 * CMS matter package (JSON `tables.*`, or a workbook with one sheet per table).
 *
 * Shown instead of the column-mapping screen, which only makes sense for one
 * row per case. Everything here comes from the server's dry run, so the counts
 * and validation are exactly what the import will act on.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Layers, Loader2, Upload } from 'lucide-react'
import {
  importMatterPackage,
  type MatterPackageImportResponse,
  type MatterPackageIssue,
  type MatterRecordCounts,
} from '../lib/api'

const TILE_ORDER: Array<{ label: string; count: (c: MatterRecordCounts) => number; always?: boolean }> = [
  { label: 'Contacts', count: (c) => c.contacts, always: true },
  { label: 'Medical visits', count: (c) => c.medicalVisits, always: true },
  { label: 'Medical bills', count: (c) => c.medicalBills, always: true },
  { label: 'Insurance', count: (c) => c.insurance, always: true },
  { label: 'Tasks & deadlines', count: (c) => c.tasks, always: true },
  { label: 'Notes', count: (c) => c.notes, always: true },
  { label: 'Timeline events', count: (c) => c.timeline },
  { label: 'Negotiations', count: (c) => c.negotiations },
  { label: 'Expenses', count: (c) => c.expenses },
  { label: 'Liens', count: (c) => c.liens },
  { label: 'Documents', count: (c) => c.documents },
]

const OUTCOME_LABEL: Record<string, { text: string; tone: string }> = {
  created: { text: 'Imported', tone: 'text-emerald-700' },
  merged: { text: 'New records added', tone: 'text-emerald-700' },
  unchanged: { text: 'Nothing new to add', tone: 'text-slate-500' },
  skipped: { text: 'Already on file, left as is', tone: 'text-slate-500' },
  failed: { text: 'Not imported', tone: 'text-rose-700' },
}

function Issues({ issues, heading }: { issues: MatterPackageIssue[]; heading: string }) {
  if (issues.length === 0) return null
  const shown = issues.slice(0, 12)
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{heading}</p>
      <ul className="mt-1 space-y-1 text-xs">
        {shown.map((issue, index) => (
          <li key={index} className={`flex items-start gap-1.5 ${issue.severity === 'error' ? 'text-rose-700' : 'text-amber-700'}`}>
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{issue.message}</span>
          </li>
        ))}
        {issues.length > shown.length && <li className="text-slate-400">and {issues.length - shown.length} more.</li>}
      </ul>
    </div>
  )
}

function Tiles({ counts }: { counts: MatterRecordCounts }) {
  const tiles = TILE_ORDER.filter((t) => t.always || t.count(counts) > 0)
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="text-lg font-semibold text-slate-900">1</div>
        <div className="text-[11px] text-slate-500">Matter</div>
      </div>
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className={`text-lg font-semibold ${t.count(counts) ? 'text-slate-900' : 'text-slate-300'}`}>{t.count(counts)}</div>
          <div className="text-[11px] text-slate-500">{t.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function MatterMigrationPanel({ source, files }: { source: string; files: File[] }) {
  const [preview, setPreview] = useState<MatterPackageImportResponse | null>(null)
  const [result, setResult] = useState<MatterPackageImportResponse | null>(null)
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'merge'>('skip')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (files.length === 0) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setResult(null)
    importMatterPackage({ source, files, dryRun: true, duplicateMode })
      .then((data) => !cancelled && setPreview(data))
      .catch((err: any) => !cancelled && setError(err.response?.data?.error || 'Could not read the matter package.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [source, files, duplicateMode])

  const runImport = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await importMatterPackage({ source, files, duplicateMode })
      setResult(data)
      setPreview(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'The import failed. Nothing was written for matters that errored.')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {error}
      </div>
    )
  }

  if (result?.report) {
    const recordIssues = result.issues.filter((i) => i.severity === 'error')
    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h5 className="text-sm font-semibold text-slate-800">Import report</h5>
        </div>
        <div className="mt-3 space-y-3">
          {result.report.map((row) => {
            const outcome = OUTCOME_LABEL[row.outcome]
            const written = Object.values(row.imported).reduce((sum, n) => sum + n, 0)
            return (
              <div key={row.externalId} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {row.externalId} · {row.label}
                  </span>
                  <span className={`text-xs font-semibold ${outcome.tone}`}>{outcome.text}</span>
                </div>
                {written > 0 && (
                  <p className="mt-1 text-xs text-slate-600">
                    {TILE_ORDER.filter((t) => t.count(row.imported) > 0)
                      .map((t) => `${t.count(row.imported)} ${t.label.toLowerCase()}`)
                      .join(' · ')}
                  </p>
                )}
                {row.alreadyImported > 0 && (
                  <p className="mt-1 text-xs text-slate-500">{row.alreadyImported} record{row.alreadyImported === 1 ? '' : 's'} were already imported and left unchanged.</p>
                )}
                {row.reason && <p className="mt-1 text-xs text-rose-700">{row.reason}</p>}
                {row.leadId && (
                  <Link to={`/attorney-dashboard/lead/${row.leadId}/overview`} className="mt-1 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
                    Open case
                  </Link>
                )}
              </div>
            )
          })}
        </div>
        <Issues issues={recordIssues} heading={`${recordIssues.length} record${recordIssues.length === 1 ? '' : 's'} skipped`} />
      </div>
    )
  }

  if (loading && !preview) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading the matter package…
      </div>
    )
  }
  if (!preview) return null

  const importable = preview.matters.filter((m) => m.action === 'create' || m.action === 'merge')
  const duplicates = preview.matters.filter((m) => m.existingAssessmentId)
  const packageIssues = preview.issues
  const label = source.charAt(0).toUpperCase() + source.slice(1)

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-brand-600" />
        <h5 className="text-sm font-semibold text-slate-800">{label} matter import preview</h5>
        <span className="text-xs text-slate-400">
          {preview.matters.length} matter{preview.matters.length === 1 ? '' : 's'} · {preview.tablesFound.map((t) => `${t.label} ${t.rows}`).join(', ')}
        </span>
      </div>

      {preview.matters.map((m) => (
        <div key={m.externalId} className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {m.externalId} · {m.clientName || m.label}
            </span>
            <span
              className={`text-xs font-semibold ${
                m.action === 'blocked' ? 'text-rose-700' : m.action === 'skip' ? 'text-slate-500' : 'text-emerald-700'
              }`}
            >
              {m.action === 'blocked'
                ? 'Cannot import yet'
                : m.action === 'skip'
                  ? 'Already imported'
                  : m.action === 'merge'
                    ? 'Will add new records'
                    : 'Ready to import'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {[m.claimType, m.incidentDate ? `Date of loss ${m.incidentDate}` : null, [m.venueCounty, m.venueState].filter(Boolean).join(', '), m.clientEmail]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <Tiles counts={m.counts} />
          <Issues issues={m.issues} heading="Checks" />
        </div>
      ))}

      <Issues issues={packageIssues} heading="Records that will be skipped or need attention" />

      {duplicates.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <p className="font-medium text-slate-900">
            {duplicates.length === 1 ? 'This matter was' : `${duplicates.length} matters were`} imported before.
          </p>
          <div className="mt-2 space-y-1.5">
            <label className="flex cursor-pointer items-start gap-2">
              <input type="radio" checked={duplicateMode === 'skip'} onChange={() => setDuplicateMode('skip')} className="mt-0.5" />
              <span>Leave it as is</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input type="radio" checked={duplicateMode === 'merge'} onChange={() => setDuplicateMode('merge')} className="mt-0.5" />
              <span>
                Add new records only
                <span className="block text-xs text-slate-500">
                  Records imported earlier are recognised by their {label} IDs and not added twice. Case details you edited are not overwritten.
                </span>
              </span>
            </label>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Document files are not part of a data export. Their names are listed on the case so they can be uploaded or brought across with a live {label} connection.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => void runImport()}
          disabled={loading || importable.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {importable.length === 1 ? 'Import complete matter' : `Import ${importable.length} complete matters`}
        </button>
        {importable.length === 0 && <span className="text-xs text-slate-500">Fix the checks above, then upload the file again.</span>}
      </div>
    </div>
  )
}
