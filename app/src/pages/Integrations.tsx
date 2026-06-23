import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react'
import {
  connectCmsProvider,
  disconnectCmsConnection,
  getCmsConnectionLogs,
  getCmsConnections,
  getCmsProviders,
  type CmsConnectionView,
  type CmsProviderMeta,
  type CmsSyncLogView,
} from '../lib/api-integrations'

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

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([getCmsProviders(), getCmsConnections()])
      setProviders(p)
      setConnections(c)
    } catch {
      setBanner({ kind: 'error', text: 'Failed to load integrations.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

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
              Connect your firm's case management system to auto-send accepted cases, contacts, and documents — no double entry.
            </p>
          </div>
        </div>
      </header>

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
                    <button
                      onClick={() => handleDisconnect(conn.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(p)}
                    disabled={!p.configured && p.authType === 'oauth'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Connect
                  </button>
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
