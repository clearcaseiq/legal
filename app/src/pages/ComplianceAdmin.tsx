import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Shield } from 'lucide-react'
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
import EmptyState from '../components/EmptyState'
import { Badge, EmptyState as InlineMessage, PageHeader, SectionCard } from '../features/shared/ui'

/** A save/load result shown next to the control that produced it. */
type Notice = { text: string; ok: boolean } | null

function NoticeText({ notice }: { notice: Notice }) {
  if (!notice) return null
  return (
    <p
      className={
        notice.ok
          ? 'text-xs text-emerald-600 dark:text-emerald-400'
          : 'text-xs text-rose-600 dark:text-rose-400'
      }
    >
      {notice.text}
    </p>
  )
}

export default function ComplianceAdmin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [settingsMessage, setSettingsMessage] = useState<Notice>(null)
  const [retentionPolicies, setRetentionPolicies] = useState<any[]>([])
  const [retentionForm, setRetentionForm] = useState({
    entityType: '',
    retentionDays: '',
    action: 'archive',
    enabled: true
  })
  const [retentionMessage, setRetentionMessage] = useState<Notice>(null)
  const [ethicalWalls, setEthicalWalls] = useState<any[]>([])
  const [ethicalForm, setEthicalForm] = useState({
    assessmentId: '',
    blockedAttorneyId: '',
    reason: ''
  })
  const [ethicalMessage, setEthicalMessage] = useState<Notice>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditMessage, setAuditMessage] = useState<Notice>(null)
  const [attorneys, setAttorneys] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [settingsData, policies, walls, logs, attorneysData] = await Promise.all([
          getComplianceSettings(),
          listRetentionPolicies(),
          listEthicalWalls(),
          // Only the automation slice is rendered here, so ask for just that.
          listAuditLogs({ limit: 50, action: 'automation_' }),
          getAdminAttorneys().catch(() => ({ attorneys: [] }))
        ])
        setSettings(settingsData)
        setRetentionPolicies(Array.isArray(policies) ? policies : [])
        setEthicalWalls(Array.isArray(walls) ? walls : [])
        setAuditLogs(Array.isArray(logs?.logs) ? logs.logs : [])
        setAttorneys(attorneysData.attorneys || [])
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login/admin?redirect=/admin/compliance')
          return
        }
        // Previously swallowed, which left every section silently blank.
        setLoadError(err.response?.data?.error || 'Failed to load compliance data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [navigate])

  const automationAuditLogs = auditLogs.filter((log) => String(log?.action || '').startsWith('automation_'))

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Compliance" description="Governance workspace" />
        <div className="surface-panel p-4">
          <InlineMessage message="Loading compliance data…" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Compliance" description="Governance workspace" />
        <EmptyState icon={Shield} title="Couldn't load compliance data" description={loadError}>
          <button onClick={() => window.location.reload()} className="btn-primary text-ui-sm">
            Try again
          </button>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Platform controls, retention policy, ethical walls, and the permanent automation audit trail."
      />

      <SectionCard title="Compliance settings">
        <div className="space-y-4">
          {settings && (
            <div className="grid grid-cols-1 gap-4 text-sm text-slate-700 md:grid-cols-3 dark:text-slate-300">
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
            className="input"
            rows={3}
            placeholder="Compliance notes"
          />
          <div className="flex flex-wrap items-center gap-3">
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
                  setSettingsMessage({ text: 'Compliance settings updated.', ok: true })
                } catch (err: any) {
                  setSettingsMessage({
                    text: err.response?.data?.error || 'Failed to update settings.',
                    ok: false,
                  })
                }
              }}
              className="btn-primary text-ui-sm"
            >
              Save settings
            </button>
            <NoticeText notice={settingsMessage} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Data retention policies">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
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
                  setRetentionMessage({ text: 'Retention policy created.', ok: true })
                } catch (err: any) {
                  setRetentionMessage({
                    text: err.response?.data?.error || 'Failed to create retention policy.',
                    ok: false,
                  })
                }
              }}
              className="btn-primary text-ui-sm"
            >
              Add policy
            </button>
          </div>
          <NoticeText notice={retentionMessage} />
          <div className="space-y-2 text-sm">
            {retentionPolicies.length === 0 ? (
              <InlineMessage message="No policies configured." />
            ) : (
              retentionPolicies.map(policy => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {policy.entityType}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {policy.retentionDays} days • {policy.action}
                    </div>
                  </div>
                  <Badge tone={policy.enabled ? 'success' : 'neutral'}>
                    {policy.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Ethical walls">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
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
                  setEthicalMessage({ text: 'Ethical wall created.', ok: true })
                } catch (err: any) {
                  setEthicalMessage({
                    text: err.response?.data?.error || 'Failed to create ethical wall.',
                    ok: false,
                  })
                }
              }}
              className="btn-primary text-ui-sm"
            >
              Add wall
            </button>
          </div>
          <NoticeText notice={ethicalMessage} />
          <div className="space-y-2 text-sm">
            {ethicalWalls.length === 0 ? (
              <InlineMessage message="No ethical walls configured." />
            ) : (
              ethicalWalls.map(wall => (
                <div
                  key={wall.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Assessment: {wall.assessmentId}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Blocked attorney: {wall.blockedAttorneyId}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {wall.reason || 'No reason provided'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>

      {/*
        The full, filterable, paginated audit trail now lives at
        /admin/audit-logs. This card keeps only the automation slice, which is
        the part that belongs to compliance, and links out for the rest.
      */}
      <SectionCard
        title="Automation history"
        trailing={
          <Link to="/admin/audit-logs" className="btn-outline inline-flex items-center gap-1.5 text-ui-sm">
            View full audit trail
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Permanent record of automated reminders and sweeps. For request-level events across the
            whole platform, open the full audit trail.
          </p>
          <NoticeText notice={auditMessage} />
          {automationAuditLogs.length === 0 ? (
            <InlineMessage message="No automation history yet." />
          ) : (
            <div className="space-y-2 text-sm">
              {automationAuditLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {String(log.action).replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {log.entityType || 'entity'} • {log.entityId || 'unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
