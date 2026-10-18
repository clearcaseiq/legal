/**
 * Build, download, and send the PDF demand package: choose and order the
 * exhibits, set Bates numbering, then email the finished package to the
 * adjuster (attached, or as a secure link when it's too large to attach).
 */

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FileStack,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'
import {
  buildDemandPackage,
  emailDemandPackage,
  getDemandPackageOptions,
  type DemandLetter,
  type DemandPackage,
  type DemandPackageExhibit,
  type DemandPackageOptions,
} from '../../lib/api'
import ModalPortal from '../../components/ModalPortal'

type Row = DemandPackageExhibit & { include: boolean }

const input =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none'
const label = 'text-xs font-semibold uppercase tracking-wide text-slate-500'

function formatBytes(n: number | null): string {
  if (!n) return ''
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function bates(prefix: string, n: number): string {
  const p = prefix.trim()
  return `${p}${!p || /[-_ ]$/.test(p) ? '' : '-'}${String(n).padStart(6, '0')}`
}

function when(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** The last build's choices first, then anything new: enclosures in, other files out. */
function initialRows(options: DemandPackageOptions): Row[] {
  const saved = options.lastConfig?.exhibits ?? null
  const byKey = new Map(options.exhibits.map((e) => [e.key, e]))
  const rows: Row[] = []
  const seen = new Set<string>()
  for (const s of saved ?? []) {
    const e = byKey.get(s.key)
    if (!e || seen.has(e.key)) continue
    seen.add(e.key)
    rows.push({ ...e, include: s.include && e.available })
  }
  for (const e of options.exhibits) {
    if (seen.has(e.key)) continue
    rows.push({ ...e, include: e.enclosed && e.available })
  }
  return rows
}

export default function DemandPackageModal({
  leadId,
  letter,
  packages,
  onPackagesChanged,
  onLetterUpdated,
  onDownload,
  onClose,
}: {
  leadId: string
  letter: DemandLetter
  packages: DemandPackage[]
  onPackagesChanged: (next: DemandPackage[]) => void
  onLetterUpdated: (letter: DemandLetter) => void
  onDownload: (pkg: DemandPackage) => void
  onClose: () => void
}) {
  const [options, setOptions] = useState<DemandPackageOptions | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [batesOn, setBatesOn] = useState(true)
  const [prefix, setPrefix] = useState('')
  const [start, setStart] = useState(1)
  const [building, setBuilding] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [sendingFor, setSendingFor] = useState<string | null>(null)

  useEffect(() => {
    getDemandPackageOptions(leadId, letter.id)
      .then((o) => {
        setOptions(o)
        setRows(initialRows(o))
        const lastBates = o.lastConfig?.bates
        setBatesOn(o.lastConfig ? Boolean(lastBates) && lastBates?.enabled !== false : true)
        setPrefix(lastBates?.prefix || o.bates.prefix)
        setStart(o.bates.start)
        onPackagesChanged(o.packages)
      })
      .catch(() => setLoadError('Could not load the exhibits for this letter.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, letter.id])

  const included = rows.filter((r) => r.include)
  const droppedCited = rows.filter((r) => r.enclosed && r.cited && !r.include)
  const nextNumber = useMemo(() => {
    const nums = rows.filter((r) => r.enclosed).map((r) => Number(r.number)).filter(Number.isFinite)
    return Math.max(0, ...nums) + 1
  }, [rows])
  const numberFor = useMemo(() => {
    let next = nextNumber
    const map = new Map<string, string>()
    for (const r of rows) if (r.include) map.set(r.key, r.number ?? String(next++))
    return map
  }, [rows, nextNumber])

  const busyBuild = packages.some((p) => p.status === 'queued' || p.status === 'building')

  const move = (i: number, d: number) =>
    setRows((prev) => {
      const j = i + d
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const build = async () => {
    setBuilding(true)
    setBuildError(null)
    try {
      const created = await buildDemandPackage(leadId, letter.id, {
        exhibits: rows.map((r) => ({ key: r.key, include: r.include })),
        bates: batesOn && prefix.trim() ? { prefix: prefix.trim(), start: Math.max(1, Math.floor(start) || 1) } : null,
      })
      onPackagesChanged([created, ...packages])
    } catch (e: any) {
      setBuildError(e?.response?.data?.error || 'Could not start the build.')
    } finally {
      setBuilding(false)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4" onClick={onClose}>
        <div className="flex min-h-full items-center justify-center">
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <FileStack className="h-4 w-4 text-brand-600" /> PDF demand package
              </h3>
              <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-auto space-y-6 overflow-y-auto p-5">
              {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}
              {!options && !loadError ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading exhibits…
                </p>
              ) : null}

              {options ? (
                <>
                  <section>
                    <p className={label}>Exhibits</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Choose what to bind in and in what order. Exhibits the letter encloses keep the number the letter cites
                      them by; files you add are numbered after the last enclosure.
                    </p>
                    {rows.length === 0 ? (
                      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        No exhibits on this case yet. The package will contain the letter only.
                      </p>
                    ) : (
                      <ol className="mt-3 space-y-1.5">
                        {rows.map((r, i) => (
                          <li
                            key={r.key}
                            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                              r.include ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'
                            }`}
                          >
                            <div className="flex flex-col">
                              <button
                                type="button"
                                aria-label="Move up"
                                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                                onClick={() => move(i, -1)}
                                disabled={i === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                aria-label="Move down"
                                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                                onClick={() => move(i, 1)}
                                disabled={i === rows.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                            <input
                              type="checkbox"
                              checked={r.include}
                              disabled={!r.available}
                              onChange={(e) =>
                                setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, include: e.target.checked } : x)))
                              }
                              aria-label={`Include ${r.label}`}
                            />
                            <span className="w-20 shrink-0 text-xs font-semibold text-slate-700">
                              {r.include ? `Exhibit ${numberFor.get(r.key)}` : r.number ? `Exhibit ${r.number}` : 'Not enclosed'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm ${r.include ? 'text-slate-800' : 'text-slate-500'}`}>{r.label}</span>
                              <span className="block truncate text-[11px] text-slate-400">
                                {r.group}
                                {r.fileName ? ` · ${r.fileName}` : ''}
                              </span>
                            </span>
                            {!r.enclosed ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                <Plus className="h-3 w-3" /> Case file
                              </span>
                            ) : null}
                            {r.cited ? (
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  r.include ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                Cited in letter
                              </span>
                            ) : null}
                            {!r.available ? (
                              <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                File missing
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    )}
                    {droppedCited.length ? (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        The letter cites{' '}
                        {droppedCited.map((r) => `Exhibit ${r.number}`).join(', ')}, but{' '}
                        {droppedCited.length === 1 ? 'it is' : 'they are'} left out of this package.
                      </p>
                    ) : null}
                  </section>

                  <section>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <input type="checkbox" checked={batesOn} onChange={(e) => setBatesOn(e.target.checked)} />
                      Bates-number every page
                    </label>
                    {batesOn ? (
                      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <p className={label}>Prefix</p>
                          <input
                            className={`${input} mt-1.5`}
                            value={prefix}
                            maxLength={16}
                            onChange={(e) => setPrefix(e.target.value.replace(/[^A-Za-z0-9_\- ]/g, ''))}
                          />
                        </div>
                        <div>
                          <p className={label}>Start at</p>
                          <input
                            type="number"
                            min={1}
                            className={`${input} mt-1.5`}
                            value={start}
                            onChange={(e) => setStart(Number(e.target.value))}
                          />
                        </div>
                        <div className="text-xs text-slate-500 sm:pt-6">
                          First page: <span className="font-semibold text-slate-700">{bates(prefix || 'DOE', Math.max(1, start || 1))}</span>
                          {options.bates.lastEnd != null ? (
                            <span className="block">Last package on this case ended at {bates(prefix || 'DOE', options.bates.lastEnd)}.</span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={build}
                      disabled={building || busyBuild}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                    >
                      {building || busyBuild ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
                      {busyBuild ? 'Building…' : `Build package (${included.length} exhibit${included.length === 1 ? '' : 's'})`}
                    </button>
                    <span className="text-xs text-slate-500">
                      Builds in the background. You can close this window; you&rsquo;ll be notified when it&rsquo;s ready.
                    </span>
                  </div>
                  {buildError ? <p className="text-sm text-rose-600">{buildError}</p> : null}
                </>
              ) : null}

              {packages.length ? (
                <section>
                  <p className={label}>Packages</p>
                  <ul className="mt-2 space-y-2">
                    {packages.map((p) => (
                      <PackageRow
                        key={p.id}
                        pkg={p}
                        options={options}
                        letter={letter}
                        open={sendingFor === p.id}
                        onToggleSend={() => setSendingFor((v) => (v === p.id ? null : p.id))}
                        onDownload={() => onDownload(p)}
                        onSent={(updated, newLetter) => {
                          onPackagesChanged(packages.map((x) => (x.id === updated.id ? updated : x)))
                          if (newLetter) onLetterUpdated(newLetter)
                        }}
                        leadId={leadId}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

function PackageRow({
  pkg,
  options,
  letter,
  open,
  onToggleSend,
  onDownload,
  onSent,
  leadId,
}: {
  pkg: DemandPackage
  options: DemandPackageOptions | null
  letter: DemandLetter
  open: boolean
  onToggleSend: () => void
  onDownload: () => void
  onSent: (pkg: DemandPackage, letter: DemandLetter | null) => void
  leadId: string
}) {
  const pending = pkg.status === 'queued' || pkg.status === 'building'
  const sendBlocked =
    letter.status === 'DRAFT'
      ? 'Approve and finalize the letter before sending it to the adjuster.'
      : pkg.draft || pkg.stale
        ? 'Built from an earlier draft. Build a new package from the final letter to send it.'
        : null

  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {pending ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            <Loader2 className="h-3 w-3 animate-spin" /> {pkg.status === 'queued' ? 'Queued' : 'Building'}
          </span>
        ) : pkg.status === 'ready' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <Check className="h-3 w-3" /> Ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            <AlertTriangle className="h-3 w-3" /> Failed
          </span>
        )}
        {pkg.draft ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Draft letter</span> : null}
        {pkg.stale ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Letter edited since</span> : null}
        {pkg.sentAt ? (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
            Sent to {pkg.sentTo} · {when(pkg.sentAt)}
          </span>
        ) : null}
        <span className="text-xs text-slate-500">
          {[
            pkg.pageCount ? `${pkg.pageCount} pages` : null,
            pkg.exhibitCount != null ? `${pkg.exhibitCount} exhibits` : null,
            formatBytes(pkg.fileSize),
            pkg.bates ? `${bates(pkg.bates.prefix, pkg.bates.start)}–${bates(pkg.bates.prefix, pkg.bates.end ?? pkg.bates.start)}` : null,
            `${pkg.requestedByName ? `${pkg.requestedByName}, ` : ''}${when(pkg.createdAt)}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {pkg.status === 'ready' ? (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button
              type="button"
              onClick={onToggleSend}
              disabled={!!sendBlocked}
              title={sendBlocked ?? undefined}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5" /> {pkg.sentAt ? 'Send again' : 'Send to adjuster'}
            </button>
          </div>
        ) : null}
      </div>
      {pkg.status === 'failed' && pkg.error ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-700">
          <RefreshCw className="h-3 w-3" /> {pkg.error}
        </p>
      ) : null}
      {pkg.status === 'ready' && sendBlocked ? <p className="mt-2 text-xs text-slate-500">{sendBlocked}</p> : null}
      {open && !sendBlocked && options ? (
        <SendForm pkg={pkg} options={options} letter={letter} leadId={leadId} onSent={onSent} onCancel={onToggleSend} />
      ) : null}
    </li>
  )
}

function SendForm({
  pkg,
  options,
  letter,
  leadId,
  onSent,
  onCancel,
}: {
  pkg: DemandPackage
  options: DemandPackageOptions
  letter: DemandLetter
  leadId: string
  onSent: (pkg: DemandPackage, letter: DemandLetter | null) => void
  onCancel: () => void
}) {
  const preferred = options.recipients.find((r) => r.defendantCarrier) ?? options.recipients[0]
  const [to, setTo] = useState(preferred?.email ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [markSent, setMarkSent] = useState(!letter.sentAt)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const tooBig = (pkg.fileSize ?? 0) > options.attachLimitBytes

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await emailDemandPackage(leadId, letter.id, pkg.id, {
        to: to.trim(),
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
        markSent: markSent && !letter.sentAt,
      })
      setDone(
        res.delivery === 'link'
          ? `Sent to ${to.trim()} as a secure download link.`
          : `Sent to ${to.trim()} with the package attached.`,
      )
      onSent(res.package, res.letter)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'The package could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{done}</p>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
      <div>
        <p className={label}>Adjuster email</p>
        {options.recipients.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {options.recipients.map((r) => (
              <button
                key={r.insuranceId}
                type="button"
                onClick={() => setTo(r.email)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  to === r.email ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.name ? `${r.name}, ` : ''}
                {r.carrier}
                {r.claimNumber ? ` · ${r.claimNumber}` : ''}
              </button>
            ))}
          </div>
        ) : null}
        <input className={`${input} mt-1.5 bg-white`} type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="adjuster@carrier.com" />
      </div>
      <div>
        <p className={label}>Subject (optional)</p>
        <input
          className={`${input} mt-1.5 bg-white`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Settlement demand — client name — claim number"
        />
      </div>
      <div>
        <p className={label}>Message (optional)</p>
        <textarea
          className={`${input} mt-1.5 bg-white`}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave blank for a short cover note that names the client and points to the response deadline in the letter, signed by the attorney."
        />
      </div>
      <p className="text-xs text-slate-500">
        {tooBig
          ? `At ${formatBytes(pkg.fileSize)} this package is too large to attach, so the adjuster gets a secure download link that works for 30 days.`
          : 'The package is attached to the email as a PDF.'}{' '}
        Replies go to the attorney.
      </p>
      {!letter.sentAt ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={markSent} onChange={(e) => setMarkSent(e.target.checked)} />
          Mark the demand as sent (logs it on the negotiation timeline and notifies the client)
        </label>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white">
          Cancel
        </button>
        <button
          type="button"
          onClick={send}
          disabled={busy || !to.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send package
        </button>
      </div>
    </div>
  )
}
