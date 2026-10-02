/**
 * "Case team" window: who is on a case and in what role, with add/remove.
 * Reads the firm's people, assignable roles and the case's current team from
 * the firm dashboard summary, and writes through the firm assignment API (the
 * server enforces `assign_cases`).
 */
import { useState } from 'react'
import { X } from 'lucide-react'
import { assignFirmCase, removeFirmCaseAssignment } from '../../lib/api'
import { formatClaimType } from '../../lib/claimTypes'
import { invalidateFirmDashboardSummary, useFirmDashboardSummary } from '../../hooks/useFirmDashboardSummary'

/** Case-team role preselected when a staff member is checked in the case team window. */
export const STAFF_DEFAULT_CASE_ROLE: Record<string, string> = {
  case_manager: 'case_manager',
  paralegal: 'paralegal',
  legal_assistant: 'paralegal',
  intake_specialist: 'intake_owner',
  billing_admin: 'billing_owner',
  demand_writer: 'demand_writer',
  medical_records: 'medical_records',
}

const DEFAULT_ASSIGNMENT_ROLES = ['lead_attorney', 'secondary_attorney', 'case_manager', 'paralegal']
const DEFAULT_MULTI_ASSIGNEE_ROLES = ['secondary_attorney', 'case_manager', 'paralegal']

const formatRole = (role: string) =>
  (role || '').split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

type Assignment = { id?: string; role: string; name?: string | null; assignedAttorneyId?: string | null; assignedUserId?: string | null }

/** Whether the signed-in member may assign cases, from the firm dashboard summary. */
export function canAssignFirmCases(firmDashboard: any): boolean {
  const workspace = firmDashboard?.workspace
  return (workspace?.permissions || []).includes('assign_cases') || workspace?.currentRole === 'firm_admin'
}

export default function CaseTeamDialog({
  assessmentId,
  caseLabel,
  onClose,
  onChanged,
}: {
  assessmentId: string
  caseLabel?: string
  onClose: () => void
  onChanged?: () => void
}) {
  const { data, loading } = useFirmDashboardSummary()
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const workspace = data?.workspace
  const assignmentRoles: string[] = workspace?.assignmentRoles || DEFAULT_ASSIGNMENT_ROLES
  const multiAssigneeRoles: string[] = workspace?.multiAssigneeRoles || DEFAULT_MULTI_ASSIGNEE_ROLES
  const row = (data?.cases || []).find((c: any) => c.assessmentId === assessmentId)
  const team: Assignment[] = (row?.assignments || []).filter((a: Assignment) => a.id)

  const memberKey = (a: Assignment) => (a.assignedAttorneyId ? `att:${a.assignedAttorneyId}` : `usr:${a.assignedUserId}`)
  const rolesOnCase = new Map<string, string[]>()
  for (const a of team) rolesOnCase.set(memberKey(a), [...(rolesOnCase.get(memberKey(a)) || []), a.role])
  const hasLead = team.some((a) => a.role === 'lead_attorney')

  const staffOptions = (data?.members || [])
    .filter((m: any) => m.user?.id && !m.attorney && m.status !== 'suspended' && m.status !== 'removed')
    .map((m: any) => ({
      key: `usr:${m.user.id}`,
      label: [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() || m.user?.email || 'Member',
      sub: formatRole(m.role),
      defaultRole:
        STAFF_DEFAULT_CASE_ROLE[m.role] && assignmentRoles.includes(STAFF_DEFAULT_CASE_ROLE[m.role])
          ? STAFF_DEFAULT_CASE_ROLE[m.role]
          : 'case_manager',
    }))
  const attorneyOptions = (data?.attorneys || []).map((a: any) => ({
    key: `att:${a.id}`,
    label: a.name,
    sub: 'Attorney',
    defaultRole: '',
  }))

  const togglePick = (key: string, defaultRole: string) =>
    setPicks((prev) => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
        return next
      }
      const leadTaken = hasLead || Object.values(next).includes('lead_attorney')
      next[key] = defaultRole || (leadTaken ? 'secondary_attorney' : 'lead_attorney')
      return next
    })

  const submit = async () => {
    const entries = Object.entries(picks)
    if (entries.length === 0) {
      setError('Select at least one person to add.')
      return
    }
    const singleRoleCounts = new Map<string, number>()
    for (const [, role] of entries) {
      if (!multiAssigneeRoles.includes(role)) singleRoleCounts.set(role, (singleRoleCounts.get(role) || 0) + 1)
    }
    const clash = [...singleRoleCounts].find(([, n]) => n > 1)
    if (clash) {
      setError(`Only one person can be ${formatRole(clash[0])}. Change the role for the others.`)
      return
    }
    try {
      setSaving(true)
      setError(null)
      for (const [key, role] of entries) {
        const [kind, id] = key.split(':')
        await assignFirmCase(assessmentId, {
          role,
          assignedAttorneyId: kind === 'att' ? id : undefined,
          assignedUserId: kind === 'usr' ? id : undefined,
        })
      }
      setPicks({})
      onChanged?.()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to assign case.')
    } finally {
      invalidateFirmDashboardSummary()
      setSaving(false)
    }
  }

  const remove = async (assignmentId: string) => {
    try {
      setRemovingId(assignmentId)
      setError(null)
      await removeFirmCaseAssignment(assessmentId, assignmentId)
      invalidateFirmDashboardSummary()
      onChanged?.()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to remove from case team.')
    } finally {
      setRemovingId(null)
    }
  }

  const pickCount = Object.keys(picks).length
  const title = caseLabel || row?.clientName || (row?.claimType ? formatClaimType(row.claimType) : 'Case')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Case team"
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Case team</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
            <div className="font-medium text-slate-800 dark:text-slate-100">{title}</div>
            {row?.claimType && (
              <div className="text-xs text-slate-400">
                {formatClaimType(row.claimType)}
                {row.venueCounty ? ` · ${row.venueCounty}` : ''}
              </div>
            )}
          </div>

          {loading && !data ? (
            <p className="text-sm text-slate-400">Loading the case team…</p>
          ) : !row ? (
            <p className="text-sm text-slate-500">This case isn&apos;t on your firm&apos;s caseload, so it can&apos;t be assigned here.</p>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">On this case</p>
                {row.primaryAttorney && (
                  <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{row.primaryAttorney.name}</span>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Accepting attorney</span>
                  </div>
                )}
                {team.length === 0 ? (
                  <p className="text-sm text-slate-400">No one else is on this case yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {team.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                        <div className="min-w-0">
                          <span className="truncate font-medium text-slate-800 dark:text-slate-100">{a.name || 'Team member'}</span>
                          <span className="ml-2 text-xs text-slate-500">{formatRole(a.role)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void remove(a.id!)}
                          disabled={removingId === a.id}
                          className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {removingId === a.id ? 'Removing…' : 'Remove'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Add to case team</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Check everyone to add, then pick each person&apos;s role. Lead attorney and other single roles replace whoever holds them now.
                  </p>
                </div>
                {attorneyOptions.length + staffOptions.length === 0 ? (
                  <p className="text-sm text-slate-400">No one in this firm to add yet.</p>
                ) : (
                  <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                    {[
                      { label: 'Attorneys', options: attorneyOptions },
                      { label: 'Staff', options: staffOptions },
                    ]
                      .filter((group) => group.options.length > 0)
                      .map((group) => (
                        <div key={group.label}>
                          <p className="px-1.5 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                          {group.options.map((o: { key: string; label: string; sub: string; defaultRole: string }) => {
                            const picked = picks[o.key]
                            const current = rolesOnCase.get(o.key)
                            return (
                              <div key={o.key} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                  <input type="checkbox" checked={Boolean(picked)} onChange={() => togglePick(o.key, o.defaultRole)} />
                                  <span className="truncate">{o.label}</span>
                                  <span className="shrink-0 text-xs text-slate-400">
                                    {current ? `on case as ${current.map(formatRole).join(', ')}` : o.sub}
                                  </span>
                                </label>
                                {picked && (
                                  <select
                                    aria-label={`Role for ${o.label}`}
                                    value={picked}
                                    onChange={(e) => setPicks((prev) => ({ ...prev, [o.key]: e.target.value }))}
                                    className="w-40 shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                                  >
                                    {assignmentRoles.map((r) => (
                                      <option key={r} value={r}>{formatRole(r)}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || pickCount === 0 || !row}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Adding…' : pickCount > 1 ? `Add ${pickCount} people` : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
