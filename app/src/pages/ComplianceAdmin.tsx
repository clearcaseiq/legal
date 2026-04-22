import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getComplianceSettings,
  updateComplianceSettings,
  listRetentionPolicies,
  createRetentionPolicy,
  listEthicalWalls,
  createEthicalWall,
  listAuditLogs,
  getAdminAttorneys
} from '../lib/api'

export default function ComplianceAdmin() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<any>(null)
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)
  const [retentionPolicies, setRetentionPolicies] = useState<any[]>([])
  const [retentionForm, setRetentionForm] = useState({
    entityType: '',
    retentionDays: '',
    action: 'archive',
    enabled: true
  })
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null)
  const [ethicalWalls, setEthicalWalls] = useState<any[]>([])
  const [ethicalForm, setEthicalForm] = useState({
    assessmentId: '',
    blockedAttorneyId: '',
    reason: ''
  })
  const [ethicalMessage, setEthicalMessage] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditMessage, setAuditMessage] = useState<string | null>(null)
  const [attorneys, setAttorneys] = useState<any[]>([])
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    entityType: '',
    search: '',
  })

  const loadAuditTrail = async (filters = auditFilters) => {
    try {
      setAuditMessage(null)
      const logs = await listAuditLogs({
        limit: 50,
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        search: filters.search || undefined,
      })
      setAuditLogs(Array.isArray(logs) ? logs : [])
    } catch (err: any) {
      setAuditMessage(err.response?.data?.error || 'Failed to load audit logs.')
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsData, policies, walls, logs, attorneysData] = await Promise.all([
          getComplianceSettings(),
          listRetentionPolicies(),
          listEthicalWalls(),
          listAuditLogs({ limit: 50 }),
          getAdminAttorneys().catch(() => ({ attorneys: [] }))
        ])
        setSettings(settingsData)
        setRetentionPolicies(Array.isArray(policies) ? policies : [])
        setEthicalWalls(Array.isArray(walls) ? walls : [])
        setAuditLogs(Array.isArray(logs) ? logs : [])
        setAttorneys(attorneysData.attorneys || [])
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login?redirect=/admin/compliance')
        }
      }
    }
    load()
  }, [navigate])

  const automationAuditLogs = auditLogs.filter((log) => String(log?.action || '').startsWith('automation_'))

  return (
    <div className="page-shell max-w-6xl space-y-8">
      <div className="page-header">
        <div className="space-y-3">
          <span className="page-kicker">Governance workspace</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Compliance Admin</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage platform controls, retention policy, ethical walls, and the permanent automation audit trail.
            </p>
          </div>
        </div>
      </div>

      <section className="subtle-panel space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Compliance Settings</h2>
        {settings && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settings.hipaaAligned}
                onChange={(e) => setSettings({ ...settings, hipaaAligned: e.target.checked })}
              />
              HIPAA aligned
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settings.soc2Ready}
                onChange={(e) => setSettings({ ...settings, soc2Ready: e.target.checked })}
              />
              SOC 2 ready
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.secureApis !== false}
                onChange={(e) => setSettings({ ...settings, secureApis: e.target.checked })}
              />
              Secure APIs enabled
            </label>
          </div>
        )}
        <textarea
          value={settings?.notes || ''}
          onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2 text-sm"
          rows={3}
          placeholder="Compliance notes"
        />
        <button
          onClick={async () => {
            try {
              setSettingsMessage(null)
              const updated = await updateComplianceSettings({
                hipaaAligned: settings?.hipaaAligned,
                soc2Ready: settings?.soc2Ready,
                secureApis: settings?.secureApis,
                notes: settings?.notes
              })
              setSettings(updated)
              setSettingsMessage('Compliance settings updated.')
            } catch (err: any) {
              setSettingsMessage(err.response?.data?.error || 'Failed to update settings.')
            }
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
        >
          Save Settings
        </button>
        {settingsMessage && <p className="text-xs text-gray-500">{settingsMessage}</p>}
      </section>

      <section className="subtle-panel space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Data Retention Policies</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <input
            value={retentionForm.entityType}
            onChange={(e) => setRetentionForm({ ...retentionForm, entityType: e.target.value })}
            className="input"
            placeholder="Entity (evidence, logs, messages)"
          />
          <input
            value={retentionForm.retentionDays}
            onChange={(e) => setRetentionForm({ ...retentionForm, retentionDays: e.target.value })}
            className="input"
            placeholder="Retention days"
          />
          <select
            value={retentionForm.action}
            onChange={(e) => setRetentionForm({ ...retentionForm, action: e.target.value })}
            className="input"
          >
            <option value="archive">Archive</option>
            <option value="delete">Delete</option>
          </select>
          <button
            onClick={async () => {
              try {
                setRetentionMessage(null)
                const record = await createRetentionPolicy({
                  entityType: retentionForm.entityType,
                  retentionDays: Number(retentionForm.retentionDays),
                  action: retentionForm.action as 'archive' | 'delete',
                  enabled: retentionForm.enabled
                })
                setRetentionPolicies(prev => [record, ...prev])
                setRetentionForm({ entityType: '', retentionDays: '', action: 'archive', enabled: true })
                setRetentionMessage('Retention policy created.')
              } catch (err: any) {
                setRetentionMessage(err.response?.data?.error || 'Failed to create retention policy.')
              }
            }}
            className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Add Policy
          </button>
        </div>
        {retentionMessage && <p className="text-xs text-gray-500">{retentionMessage}</p>}
        <div className="space-y-2 text-sm">
          {retentionPolicies.length === 0 ? (
            <div className="text-xs text-gray-500">No policies configured.</div>
          ) : (
            retentionPolicies.map(policy => (
              <div key={policy.id} className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2">
                <div>
                  <div className="font-medium">{policy.entityType}</div>
                  <div className="text-xs text-gray-500">{policy.retentionDays} days • {policy.action}</div>
                </div>
                <div className="text-xs text-gray-400">{policy.enabled ? 'enabled' : 'disabled'}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="subtle-panel space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Ethical Walls</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <input
            value={ethicalForm.assessmentId}
            onChange={(e) => setEthicalForm({ ...ethicalForm, assessmentId: e.target.value })}
            className="input"
            placeholder="Assessment ID"
          />
          <select
            value={ethicalForm.blockedAttorneyId}
            onChange={(e) => setEthicalForm({ ...ethicalForm, blockedAttorneyId: e.target.value })}
            className="input"
          >
            <option value="">Select attorney</option>
            {attorneys.map((attorney: any) => (
              <option key={attorney.id} value={attorney.id}>
                {attorney.name || attorney.email}
              </option>
            ))}
          </select>
          <input
            value={ethicalForm.reason}
            onChange={(e) => setEthicalForm({ ...ethicalForm, reason: e.target.value })}
            className="input"
            placeholder="Reason (optional)"
          />
          <button
            onClick={async () => {
              try {
                setEthicalMessage(null)
                const record = await createEthicalWall({
                  assessmentId: ethicalForm.assessmentId,
                  blockedAttorneyId: ethicalForm.blockedAttorneyId,
                  reason: ethicalForm.reason || undefined
                })
                setEthicalWalls(prev => [record, ...prev])
                setEthicalForm({ assessmentId: '', blockedAttorneyId: '', reason: '' })
                setEthicalMessage('Ethical wall created.')
              } catch (err: any) {
                setEthicalMessage(err.response?.data?.error || 'Failed to create ethical wall.')
              }
            }}
            className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Add Wall
          </button>
        </div>
        {ethicalMessage && <p className="text-xs text-gray-500">{ethicalMessage}</p>}
        <div className="space-y-2 text-sm">
          {ethicalWalls.length === 0 ? (
            <div className="text-xs text-gray-500">No ethical walls configured.</div>
          ) : (
            ethicalWalls.map(wall => (
              <div key={wall.id} className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2">
                <div>
                  <div className="font-medium">Assessment: {wall.assessmentId}</div>
                  <div className="text-xs text-gray-500">Blocked attorney: {wall.blockedAttorneyId}</div>
                </div>
                <div className="text-xs text-gray-400">{wall.reason || 'No reason provided'}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="subtle-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Audit Logs</h2>
            <p className="mt-1 text-sm text-gray-600">
              Includes permanent automation reminder history alongside request-level audit events.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip">{auditLogs.length} total</span>
            <span className="chip">{automationAuditLogs.length} automation</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            value={auditFilters.action}
            onChange={(e) => setAuditFilters((current) => ({ ...current, action: e.target.value }))}
            className="input"
            placeholder="Filter by action"
          />
          <input
            value={auditFilters.entityType}
            onChange={(e) => setAuditFilters((current) => ({ ...current, entityType: e.target.value }))}
            className="input"
            placeholder="Filter by entity type"
          />
          <input
            value={auditFilters.search}
            onChange={(e) => setAuditFilters((current) => ({ ...current, search: e.target.value }))}
            className="input"
            placeholder="Search entity ID or metadata"
          />
          <button
            onClick={() => { void loadAuditTrail() }}
            className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Apply filters
          </button>
        </div>
        {automationAuditLogs.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Recent automation history</h3>
              <span className="text-xs text-slate-500">Newest first</span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {automationAuditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">{String(log.action).replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {log.entityType || 'entity'} • {log.entityId || 'unknown'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {auditMessage && <p className="text-xs text-gray-500">{auditMessage}</p>}
        <div className="space-y-2 text-sm">
          {auditLogs.length === 0 ? (
            <div className="text-xs text-gray-500">No audit logs available.</div>
          ) : (
            auditLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2">
                <div>
                  <div className="font-medium">{log.action}</div>
                  <div className="text-xs text-gray-500">
                    {log.entityType || 'entity'} • {log.entityId || 'no entity'} • {log.ipAddress || 'Unknown IP'} • {log.statusCode || 'N/A'}
                  </div>
                </div>
                <div className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
