import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getAttorneyCalendarHealth,
  getAttorneyCalendarConnectUrl,
  syncAttorneyCalendar,
  disconnectAttorneyCalendar,
  getAttorneyZoomStatus,
  getAttorneyZoomConnectUrl,
  disconnectAttorneyZoom,
  type AttorneyCalendarConnection,
  type AttorneyZoomStatus,
} from '../../lib/api'

type CalendarHealthSummary = {
  totalConnections: number
  connectedCount: number
  healthyCount: number
  warningCount: number
  errorCount: number
  disconnectedCount: number
}

/**
 * Self-contained Calendar + Zoom connection manager.
 *
 * This used to live only inside the legacy AttorneyDashboard "Profile" tab. It
 * owns all of its own data loading, OAuth round-trip handling and connect/sync/
 * disconnect actions so it can be dropped onto any modern page (here: the
 * Scheduling settings page, where calendar/Zoom sync is contextually relevant).
 */
export default function AttorneyCalendarZoomSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [connections, setConnections] = useState<AttorneyCalendarConnection[]>([])
  const [healthSummary, setHealthSummary] = useState<CalendarHealthSummary | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarActionProvider, setCalendarActionProvider] = useState<string | null>(null)
  const [zoomStatus, setZoomStatus] = useState<AttorneyZoomStatus | null>(null)
  const [zoomLoading, setZoomLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const flash = useCallback((text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 5000)
  }, [])

  const loadCalendarConnections = useCallback(async () => {
    try {
      setCalendarLoading(true)
      const response = await getAttorneyCalendarHealth()
      setConnections(Array.isArray(response?.connections) ? response.connections : [])
      setHealthSummary(response?.summary || null)
    } catch (err) {
      console.error('Failed to load calendar connections:', err)
      setConnections([])
      setHealthSummary(null)
    } finally {
      setCalendarLoading(false)
    }
  }, [])

  const loadZoomStatus = useCallback(async () => {
    try {
      setZoomStatus(await getAttorneyZoomStatus())
    } catch (err) {
      console.error('Failed to load Zoom status:', err)
      setZoomStatus(null)
    }
  }, [])

  useEffect(() => {
    void loadCalendarConnections()
    void loadZoomStatus()
  }, [loadCalendarConnections, loadZoomStatus])

  // Surface the result of a calendar OAuth round-trip if the provider redirects
  // back here (?calendar_sync=success|error).
  useEffect(() => {
    const calendarSync = searchParams.get('calendar_sync')
    const provider = searchParams.get('calendar_provider')
    if (!calendarSync || !provider) return

    if (calendarSync === 'success') {
      flash(`${provider === 'google' ? 'Google' : 'Microsoft'} calendar connected.`)
      void loadCalendarConnections()
    } else {
      flash(searchParams.get('calendar_error') || 'Calendar connection failed.')
    }

    const next = new URLSearchParams(searchParams)
    next.delete('calendar_sync')
    next.delete('calendar_provider')
    next.delete('calendar_error')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, loadCalendarConnections, flash])

  useEffect(() => {
    const zoomSync = searchParams.get('zoom_sync')
    if (!zoomSync) return

    if (zoomSync === 'success') {
      flash('Zoom account connected.')
      void loadZoomStatus()
    } else {
      flash(searchParams.get('zoom_error') || 'Zoom connection failed.')
    }

    const next = new URLSearchParams(searchParams)
    next.delete('zoom_sync')
    next.delete('zoom_error')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, loadZoomStatus, flash])

  const handleConnectCalendar = useCallback(async (provider: 'google' | 'microsoft') => {
    try {
      setCalendarActionProvider(provider)
      const response = await getAttorneyCalendarConnectUrl(provider)
      window.location.assign(response.authorizeUrl)
    } catch (err: any) {
      flash(err?.response?.data?.error || `Failed to connect ${provider} calendar.`)
      setCalendarActionProvider(null)
    }
  }, [flash])

  const handleSyncCalendar = useCallback(async (provider: 'google' | 'microsoft') => {
    try {
      setCalendarActionProvider(provider)
      const response = await syncAttorneyCalendar(provider)
      flash(
        `Synced ${response.syncedBlocks} busy time block(s) from ${provider === 'google' ? 'Google' : 'Microsoft'}${response.autoSyncEnabled ? '. Auto-sync is active.' : '.'}`,
      )
      await loadCalendarConnections()
    } catch (err: any) {
      flash(err?.response?.data?.error || `Failed to sync ${provider} calendar.`)
    } finally {
      setCalendarActionProvider(null)
    }
  }, [flash, loadCalendarConnections])

  const handleDisconnectCalendar = useCallback(async (provider: 'google' | 'microsoft') => {
    try {
      setCalendarActionProvider(provider)
      await disconnectAttorneyCalendar(provider)
      flash(`${provider === 'google' ? 'Google' : 'Microsoft'} calendar disconnected.`)
      await loadCalendarConnections()
    } catch (err: any) {
      flash(err?.response?.data?.error || `Failed to disconnect ${provider} calendar.`)
    } finally {
      setCalendarActionProvider(null)
    }
  }, [flash, loadCalendarConnections])

  const handleConnectZoom = useCallback(async () => {
    try {
      setZoomLoading(true)
      const response = await getAttorneyZoomConnectUrl()
      window.location.assign(response.authorizeUrl)
    } catch (err: any) {
      flash(err?.response?.data?.error || 'Failed to connect Zoom.')
      setZoomLoading(false)
    }
  }, [flash])

  const handleDisconnectZoom = useCallback(async () => {
    try {
      setZoomLoading(true)
      await disconnectAttorneyZoom()
      flash('Zoom account disconnected.')
      await loadZoomStatus()
    } catch (err: any) {
      flash(err?.response?.data?.error || 'Failed to disconnect Zoom.')
    } finally {
      setZoomLoading(false)
    }
  }, [flash, loadZoomStatus])

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
          {message}
        </div>
      )}
      <CalendarSyncSettings
        connections={connections}
        healthSummary={healthSummary}
        loading={calendarLoading}
        actionProvider={calendarActionProvider}
        onRefresh={loadCalendarConnections}
        onConnect={handleConnectCalendar}
        onSync={handleSyncCalendar}
        onDisconnect={handleDisconnectCalendar}
      />
      <ZoomSyncSettings
        status={zoomStatus}
        loading={zoomLoading}
        onRefresh={loadZoomStatus}
        onConnect={handleConnectZoom}
        onDisconnect={handleDisconnectZoom}
      />
    </div>
  )
}

function CalendarSyncSettings({
  connections,
  healthSummary,
  loading,
  actionProvider,
  onRefresh,
  onConnect,
  onSync,
  onDisconnect,
}: {
  connections: AttorneyCalendarConnection[]
  healthSummary: CalendarHealthSummary | null
  loading: boolean
  actionProvider: string | null
  onRefresh: () => void | Promise<void>
  onConnect: (provider: 'google' | 'microsoft') => void | Promise<void>
  onSync: (provider: 'google' | 'microsoft') => void | Promise<void>
  onDisconnect: (provider: 'google' | 'microsoft') => void | Promise<void>
}) {
  return (
    <section className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Calendar sync</h3>
          <p className="mt-1 text-sm text-gray-600">
            Connect Google or Microsoft Calendar so plaintiff consultations only use current availability.
          </p>
        </div>
        <button
          onClick={() => void onRefresh()}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {healthSummary && (
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                {healthSummary.connectedCount}/{healthSummary.totalConnections} connected
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                {healthSummary.healthyCount} healthy
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                {healthSummary.warningCount} warning
              </span>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">
                {healthSummary.errorCount} error
              </span>
            </div>
          </div>
        )}
        {(['google', 'microsoft'] as const).map((provider) => {
          const connection = connections.find((item) => item.provider === provider)
          const providerLabel = provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'
          const actionLoading = actionProvider === provider
          const healthTone =
            connection?.health?.status === 'healthy'
              ? 'bg-emerald-100 text-emerald-700'
              : connection?.health?.status === 'warning'
                ? 'bg-amber-100 text-amber-700'
                : connection?.health?.status === 'error'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-200 text-slate-700'

          return (
            <div key={provider} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{providerLabel}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {connection?.connected
                      ? `${connection.externalAccountEmail || 'Connected'}${connection.lastSyncedAt ? ` | synced ${new Date(connection.lastSyncedAt).toLocaleString()}` : ''}`
                      : 'Not connected'}
                  </p>
                  {connection?.connected && (
                    <p className={`mt-1 text-xs ${connection.autoSyncEnabled ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {connection.autoSyncEnabled
                        ? `Auto-sync active${connection.webhookExpiresAt ? ` until ${new Date(connection.webhookExpiresAt).toLocaleString()}` : ''}`
                        : 'Auto-sync is not active yet. Manual sync still works.'}
                    </p>
                  )}
                  {connection?.lastWebhookAt && (
                    <p className="mt-1 text-xs text-slate-500">
                      Last webhook: {new Date(connection.lastWebhookAt).toLocaleString()}
                    </p>
                  )}
                  {connection?.lastSyncError && (
                    <p className="mt-1 text-xs text-amber-700">{connection.lastSyncError}</p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${healthTone}`}>
                  {connection?.health?.status
                    ? connection.health.status.charAt(0).toUpperCase() + connection.health.status.slice(1)
                    : connection?.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {connection?.health && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span>{connection.health.busyBlockCount} busy block(s) synced</span>
                    <span>Recommendation: {connection.health.recommendedAction}</span>
                  </div>
                  {connection.health.issues.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {connection.health.issues.map((issue) => (
                        <p key={issue} className="text-xs text-slate-600">
                          {issue}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void onConnect(provider)}
                  disabled={actionLoading}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {connection?.connected ? 'Reconnect' : 'Connect'}
                </button>
                {connection?.connected && (
                  <>
                    <button
                      onClick={() => void onSync(provider)}
                      disabled={actionLoading}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                    >
                      Sync now
                    </button>
                    <button
                      onClick={() => void onDisconnect(provider)}
                      disabled={actionLoading}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ZoomSyncSettings({
  status,
  loading,
  onRefresh,
  onConnect,
  onDisconnect,
}: {
  status: AttorneyZoomStatus | null
  loading: boolean
  onRefresh: () => void | Promise<void>
  onConnect: () => void | Promise<void>
  onDisconnect: () => void | Promise<void>
}) {
  const configured = status?.configured ?? false
  const connected = status?.connected ?? false

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Zoom</h3>
          <p className="mt-1 text-sm text-gray-600">
            Connect your Zoom account so video consultations create a real Zoom meeting on your calendar and
            share a join link with the client automatically.
          </p>
        </div>
        <button
          onClick={() => void onRefresh()}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {!configured ? (
          <p className="text-xs text-amber-700">
            Zoom isn't configured on this server yet. Add <code>ZOOM_CLIENT_ID</code> and{' '}
            <code>ZOOM_CLIENT_SECRET</code> to the API environment to enable per-attorney Zoom.
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Zoom Meetings</p>
                <p className="mt-1 text-xs text-slate-600">
                  {connected
                    ? `${status?.email || status?.displayName || 'Connected'}`
                    : 'Not connected'}
                </p>
                {connected && status?.syncStatus === 'sync_error' && (
                  <p className="mt-1 text-xs text-amber-700">
                    Last meeting sync failed. Try reconnecting Zoom.
                  </p>
                )}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void onConnect()}
                disabled={loading}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {connected ? 'Reconnect' : 'Connect'}
              </button>
              {connected && (
                <button
                  onClick={() => void onDisconnect()}
                  disabled={loading}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Disconnect
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
