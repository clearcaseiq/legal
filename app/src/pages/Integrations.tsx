import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  X,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  Plus,
  Database,
  Download,
  Loader2,
} from 'lucide-react'
import {
  createDataExport,
  connectCmsProvider,
  disconnectCmsConnection,
  downloadDataExport,
  getCmsConnectionLogs,
  getCmsConnections,
  getIntegrationAccess,
  getCmsProviders,
  listDataExports,
  type DataExportView,
  type IntegrationAccess,
  type CmsConnectionView,
  type CmsProviderMeta,
  type CmsSyncLogView,
} from '../lib/api-integrations'
import {
  approveReconciliationProposal,
  createSyncKey,
  listReconciliationProposals,
  listSyncKeys,
  rejectReconciliationProposal,
  revokeSyncKey,
  type ReconciliationProposal,
  type SyncApiScope,
  type SyncApiKeyView,
} from '../lib/api-sync'

const AUTH_LABEL: Record<string, string> = {
  oauth: 'OAuth',
  pat: 'Personal Access Token',
  partner: 'Partner API key',
  webhook: 'Webhook',
}

export default function Integrations() {
  const [providers, setProviders] = useState<CmsProviderMeta[]>([])
  const [connections, setConnections] = useState<CmsConnectionView[]>([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [credModal, setCredModal] = useState<CmsProviderMeta | null>(null)
  const [logsFor, setLogsFor] = useState<{ id: string; logs: CmsSyncLogView[] } | null>(null)
  const [proposals, setProposals] = useState<ReconciliationProposal[]>([])
  const [syncKeys, setSyncKeys] = useState<SyncApiKeyView[]>([])
  const [busyProposal, setBusyProposal] = useState<string | null>(null)
  const [newKeyModal, setNewKeyModal] = useState(false)
  const [access, setAccess] = useState<IntegrationAccess | null>(null)
  const [exports, setExports] = useState<DataExportView[]>([])
  const [exportBusy, setExportBusy] = useState<string | null>(null)
  const [incrementalCursor, setIncrementalCursor] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const resolvedAccess = await getIntegrationAccess()
      setAccess(resolvedAccess)
      const [p, c, pr, k, exportRuns] = await Promise.all([
        getCmsProviders(),
        getCmsConnections(),
        listReconciliationProposals().catch(() => []),
        resolvedAccess.canManageIntegrations ? listSyncKeys() : Promise.resolve([]),
        resolvedAccess.canManageIntegrations ? listDataExports() : Promise.resolve([]),
      ])
      setProviders(p)
      setConnections(c)
      setProposals(pr)
      setSyncKeys(k)
      setExports(exportRuns)
    } catch {
      setBanner({ kind: 'error', text: 'Failed to load integrations.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!access?.canManageIntegrations || !exports.some((run) => run.status === 'queued' || run.status === 'building')) {
      return
    }
    const timer = window.setInterval(() => {
      void listDataExports().then(setExports).catch(() => undefined)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [access?.canManageIntegrations, exports])

  useEffect(() => {
    if (incrementalCursor) return
    const latestCutoff = exports.find((run) => run.cutoff_cursor != null)?.cutoff_cursor
    if (latestCutoff != null) setIncrementalCursor(String(latestCutoff))
  }, [exports, incrementalCursor])

  // Surface the result of an OAuth round-trip (?cms_status=success|error).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const status = params.get('cms_status')
    const provider = params.get('cms_provider')
    if (status) {
      setBanner(
        status === 'success'
          ? { kind: 'success', text: `${provider ?? 'CMS'} connected successfully.` }
          : { kind: 'error', text: `Could not connect ${provider ?? 'CMS'}: ${params.get('cms_error') ?? 'unknown error'}` }
      )
      const url = new URL(window.location.href)
      ;['cms_status', 'cms_provider', 'cms_error'].forEach((k) => url.searchParams.delete(k))
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const connectedByProvider = useMemo(() => {
    const map: Record<string, CmsConnectionView | undefined> = {}
    for (const c of connections) if (c.status === 'connected') map[c.provider] = c
    return map
  }, [connections])

  const handleConnect = async (provider: CmsProviderMeta) => {
    if (provider.authType !== 'oauth') {
      setCredModal(provider)
      return
    }
    try {
      const res = await connectCmsProvider(provider.id)
      if (res.mode === 'oauth' && res.authorizeUrl) {
        window.location.href = res.authorizeUrl
      }
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.response?.data?.error || `Could not start ${provider.label} connection.` })
    }
  }

  const handleDisconnect = async (id: string) => {
    if (!window.confirm('Disconnect this CMS? Existing exports are not removed from the CMS.')) return
    try {
      await disconnectCmsConnection(id)
      await refresh()
    } catch {
      setBanner({ kind: 'error', text: 'Failed to disconnect.' })
    }
  }

  const openLogs = async (id: string) => {
    try {
      const logs = await getCmsConnectionLogs(id)
      setLogsFor({ id, logs })
    } catch {
      setBanner({ kind: 'error', text: 'Failed to load sync log.' })
    }
  }

  const handleApprove = async (id: string) => {
    setBusyProposal(id)
    try {
      await approveReconciliationProposal(id)
      setProposals((prev) => prev.filter((p) => p.id !== id))
      setBanner({ kind: 'success', text: 'External change approved and applied.' })
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.response?.data?.error || 'Failed to approve change.' })
    } finally {
      setBusyProposal(null)
    }
  }

  const handleReject = async (id: string) => {
    setBusyProposal(id)
    try {
      await rejectReconciliationProposal(id)
      setProposals((prev) => prev.filter((p) => p.id !== id))
      setBanner({ kind: 'success', text: 'External change rejected.' })
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.response?.data?.error || 'Failed to reject change.' })
    } finally {
      setBusyProposal(null)
    }
  }

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('Revoke this key? Systems using it will lose access immediately.')) return
    try {
      await revokeSyncKey(id)
      await refresh()
    } catch {
      setBanner({ kind: 'error', text: 'Failed to revoke key.' })
    }
  }

  const handleCreateExport = async (type: 'snapshot' | 'incremental') => {
    const cursor = Number(incrementalCursor)
    if (type === 'incremental' && (!Number.isInteger(cursor) || cursor < 0)) {
      setBanner({ kind: 'error', text: 'Enter a valid non-negative change cursor.' })
      return
    }
    setExportBusy(type)
    try {
      await createDataExport(type, type === 'incremental' ? cursor : undefined)
      setExports(await listDataExports())
      setBanner({ kind: 'success', text: `${type === 'snapshot' ? 'Full' : 'Incremental'} export queued.` })
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.response?.data?.error || 'Could not start the export.' })
    } finally {
      setExportBusy(null)
    }
  }

  const handleDownloadExport = async (run: DataExportView) => {
    setExportBusy(run.id)
    try {
      const blob = await downloadDataExport(run.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `clearcaseiq-${run.kind}-${run.id}.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setBanner({ kind: 'error', text: e?.response?.data?.error || 'Could not download the export.' })
    } finally {
      setExportBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Plug className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Case Management Integrations</h1>
            <p className="text-sm text-gray-500">
              Connect your firm's case management system to auto-send accepted cases, contacts, and documents. No double entry.
            </p>
          </div>
        </div>
      </header>

      {access && !access.canManageIntegrations && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Integration settings and firm exports are managed by a firm administrator. You can still review connection
          status and reconciliation items available to you.
        </div>
      )}

      {banner && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            banner.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span className="flex items-center gap-2">
            {banner.kind === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {banner.text}
          </span>
          <button onClick={() => setBanner(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {providers.map((p) => {
          const conn = connectedByProvider[p.id]
          return (
            <div key={p.id} className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{p.label}</h3>
                  {conn ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                      {AUTH_LABEL[p.authType] ?? p.authType}
                    </span>
                  )}
                </div>
                {p.notes && <p className="mt-2 text-sm text-gray-500">{p.notes}</p>}
                {conn?.lastError && <p className="mt-2 text-xs text-red-600">Last error: {conn.lastError}</p>}
                {conn?.lastSyncedAt && (
                  <p className="mt-1 text-xs text-gray-400">Last synced {new Date(conn.lastSyncedAt).toLocaleString()}</p>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                {conn ? (
                  <>
                    <button
                      onClick={() => openLogs(conn.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Sync log
                    </button>
                    {access?.canManageIntegrations && (
                      <button
                        onClick={() => handleDisconnect(conn.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Disconnect
                      </button>
                    )}
                  </>
                ) : access?.canManageIntegrations ? (
                  <button
                    onClick={() => handleConnect(p)}
                    disabled={!p.configured && p.authType === 'oauth'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Connect
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">Firm admin required</span>
                )}
                {p.docsUrl && (
                  <a
                    href={p.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Docs <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
        {loading && <p className="text-sm text-gray-400">Loading…</p>}
      </section>

      {/* --- Reconciliation inbox ------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Reconciliation inbox</h2>
            <p className="text-sm text-gray-500">
              ClearCaseIQ is the system of record. When a connected system writes back a field we own, the change is held
              here for your review — nothing is overwritten until you approve it.
            </p>
          </div>
          {proposals.length > 0 && (
            <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {proposals.length} pending
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {proposals.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">No pending changes. Everything is in sync.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {proposals.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                        {p.field}
                      </span>
                      <span className="text-xs text-gray-400">
                        via {p.provider || p.source} · {new Date(p.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-700">
                      <span className="text-gray-400 line-through">{p.currentValue || '—'}</span>
                      <span className="mx-2 text-gray-300">→</span>
                      <span className="font-medium text-gray-900">{p.proposedValue || '—'}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">Case {p.assessmentId}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={busyProposal === p.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={busyProposal === p.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {access?.canManageIntegrations && (
        <>
      {/* --- Firm data exports --------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Database className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export firm data</h2>
            <p className="text-sm text-gray-500">
              Build a ZIP stored encrypted at rest with case records, evidence, checksums, and reconciliation details.
              Downloads expire after seven days.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => void handleCreateExport('snapshot')}
              disabled={exportBusy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {exportBusy === 'snapshot' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              Full snapshot
            </button>
            <input
              type="number"
              min={0}
              value={incrementalCursor}
              onChange={(event) => setIncrementalCursor(event.target.value)}
              placeholder="Change cursor"
              aria-label="Incremental export change cursor"
              className="w-36 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
            <button
              onClick={() => void handleCreateExport('incremental')}
              disabled={exportBusy !== null || incrementalCursor === ''}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {exportBusy === 'incremental' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Incremental
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {exports.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">No exports yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {exports.map((run) => (
                <li key={run.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize text-gray-900">{run.kind}</span>
                      <ExportStatus status={run.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Requested {new Date(run.created_at).toLocaleString()}
                      {run.cutoff_cursor != null ? ` · cursor ${run.cutoff_cursor}` : ''}
                      {run.file_size ? ` · ${formatBytes(run.file_size)}` : ''}
                    </p>
                    {run.expires_at && run.status === 'ready' && (
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Expires {new Date(run.expires_at).toLocaleString()}
                      </p>
                    )}
                    {run.error && <p className="mt-1 text-xs text-red-600">{run.error}</p>}
                  </div>
                  {run.status === 'ready' && (
                    <button
                      onClick={() => void handleDownloadExport(run)}
                      disabled={exportBusy === run.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                    >
                      {exportBusy === run.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Download
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* --- Sync API keys -------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sync API keys</h2>
            <p className="text-sm text-gray-500">
              Issue read keys so external systems can pull your firm's canonical case records and change feed from the
              Sync API. Each key sees only your firm's cases.
            </p>
          </div>
          <button
            onClick={() => setNewKeyModal(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="h-3.5 w-3.5" /> New key
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {syncKeys.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">No keys yet. Create one to let an external system read from ClearCaseIQ.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {syncKeys.map((k) => (
                <li key={k.id} className="flex items-center justify-between px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{k.name}</span>
                      {k.revokedAt ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">Revoked</span>
                      ) : k.expired ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Expired</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-gray-500">{k.prefix}…</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleString()}` : ' · never used'}
                      {k.expiresAt ? ` · expires ${new Date(k.expiresAt).toLocaleDateString()}` : ''}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">{k.scopes.join(' · ')}</p>
                  </div>
                  {!k.revokedAt && (
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
        </>
      )}

      {newKeyModal && (
        <NewKeyModal
          onClose={() => setNewKeyModal(false)}
          onCreated={async () => {
            await refresh()
          }}
          onError={(text) => setBanner({ kind: 'error', text })}
        />
      )}

      {credModal && (
        <CredentialModal
          provider={credModal}
          onClose={() => setCredModal(null)}
          onConnected={async () => {
            setCredModal(null)
            setBanner({ kind: 'success', text: `${credModal.label} connected.` })
            await refresh()
          }}
          onError={(text) => setBanner({ kind: 'error', text })}
        />
      )}

      {logsFor && (
        <LogsModal logs={logsFor.logs} onClose={() => setLogsFor(null)} />
      )}
    </div>
  )
}

function CredentialModal({
  provider,
  onClose,
  onConnected,
  onError,
}: {
  provider: CmsProviderMeta
  onClose: () => void
  onConnected: () => void
  onError: (text: string) => void
}) {
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [pat, setPat] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await connectCmsProvider(provider.id, {
        apiBaseUrl: apiBaseUrl || undefined,
        apiKey: apiKey || undefined,
        pat: pat || undefined,
        webhookUrl: webhookUrl || undefined,
      })
      onConnected()
    } catch (e: any) {
      onError(e?.response?.data?.error || `Could not connect ${provider.label}.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Connect {provider.label}</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          {provider.authType === 'pat' && (
            <Field label="Personal Access Token" value={pat} onChange={setPat} placeholder="Paste your Filevine PAT" />
          )}
          {provider.authType === 'partner' && (
            <>
              <Field label="API Base URL" value={apiBaseUrl} onChange={setApiBaseUrl} placeholder="https://your-firm.smartadvocate.com" />
              <Field label="API Key" value={apiKey} onChange={setApiKey} placeholder="Partner-issued API key" />
            </>
          )}
          {provider.authType === 'webhook' && (
            <Field label="Webhook URL" value={webhookUrl} onChange={setWebhookUrl} placeholder="https://hooks.zapier.com/..." />
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {saving ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ExportStatus({ status }: { status: DataExportView['status'] }) {
  const style = {
    ready: 'bg-emerald-100 text-emerald-700',
    queued: 'bg-blue-100 text-blue-700',
    building: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-600',
  }[status]
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}>
      {status === 'building' ? 'Building' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </label>
  )
}

function NewKeyModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void
  onCreated: () => void
  onError: (text: string) => void
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [scopes, setScopes] = useState<SyncApiScope[]>(['cases:read', 'changes:read'])
  const [expiresInDays, setExpiresInDays] = useState(90)

  const submit = async () => {
    if (!name.trim() || scopes.length === 0) return
    setSaving(true)
    try {
      const res = await createSyncKey(name.trim(), scopes, expiresInDays)
      setToken(res.token)
      onCreated()
    } catch (e: any) {
      onError(e?.response?.data?.error || 'Could not create key.')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const copy = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{token ? 'Key created' : 'New sync API key'}</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        {token ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Copy this token now — it is shown only once and cannot be recovered.</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              <code className="flex-1 break-all font-mono text-xs text-gray-800">{token}</code>
              <button onClick={copy} className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">Done</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Key name" value={name} onChange={setName} placeholder="e.g. Filevine production" />
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">Permissions</legend>
              <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                {([
                  ['cases:read', 'Read canonical cases'],
                  ['changes:read', 'Read the change feed'],
                  ['proposals:write', 'Propose case-field changes'],
                  ['export:read', 'Create and download firm exports'],
                ] as Array<[SyncApiScope, string]>).map(([scope, label]) => (
                  <label key={scope} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope)}
                      onChange={(event) => setScopes((current) =>
                        event.target.checked ? [...current, scope] : current.filter((value) => value !== scope)
                      )}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>{label}</span>
                    <code className="ml-auto text-[11px] text-gray-400">{scope}</code>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Expires</span>
              <select
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </label>
            {scopes.length === 0 && <p className="text-xs text-red-600">Select at least one permission.</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={submit} disabled={saving || !name.trim() || scopes.length === 0} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Creating…' : 'Create key'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LogsModal({ logs, onClose }: { logs: CmsSyncLogView[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[75vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">Sync log</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="space-y-2 overflow-y-auto p-4">
          {logs.length === 0 && <p className="text-sm text-gray-400">No sync activity yet.</p>}
          {logs.map((l) => (
            <div key={l.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{l.operation}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    l.status === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : l.status === 'skipped'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {l.status}
                </span>
              </div>
              {l.message && <p className="mt-0.5 text-xs text-gray-500">{l.message}</p>}
              <p className="mt-0.5 text-[11px] text-gray-400">{new Date(l.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
