import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAdminInvitations,
  inviteAttorneyToClaim,
  revokeAdminInvitation,
  type AdminInvitation,
  type AdminInvitationOutcome,
} from '../lib/api'
import { getAdminLoginPath, isAdminAuthError } from '../lib/auth'
import {
  Badge,
  DataTable,
  PageHeader,
  Pagination,
  SectionCard,
  type DataTableColumn,
} from '../features/shared/ui'

const DEFAULT_LIMIT = 50

/**
 * "Declined" is the one an operator must be able to act on differently: the
 * attorney has told us no, so re-inviting them is not a follow-up, it is
 * pestering. Expired means the link simply lapsed and a re-send is fine.
 */
const OUTCOME_META: Record<
  AdminInvitationOutcome,
  { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger'; hint: string }
> = {
  pending: {
    label: 'Pending',
    tone: 'warning',
    hint: 'Invitation sent; the attorney has not responded yet.',
  },
  accepted: {
    label: 'Accepted',
    tone: 'success',
    hint: 'The attorney verified and claimed the profile.',
  },
  declined: {
    label: 'Declined',
    tone: 'danger',
    hint: 'The attorney refused the invitation. Only re-invite deliberately.',
  },
  expired: {
    label: 'Expired',
    tone: 'neutral',
    hint: 'The link lapsed without a response. Safe to send another.',
  },
}

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

export default function AdminInvitations() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AdminInvitation[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [outcome, setOutcome] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim())
      setOffset(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminInvitations({
        limit,
        offset,
        search: appliedSearch || undefined,
        outcome: outcome || undefined,
      })
      setRows(data.data || [])
      setSummary(data.summary || null)
      setTotal(data.total ?? (data.data?.length || 0))
    } catch (err: any) {
      if (isAdminAuthError(err)) {
        navigate(getAdminLoginPath('/admin/invitations'), { replace: true })
        return
      }
      setError(err.response?.data?.error || 'Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }, [limit, offset, appliedSearch, outcome, navigate])

  useEffect(() => {
    load()
  }, [load])

  const resend = async (row: AdminInvitation) => {
    if (!row.attorney) return
    // A declined attorney needs an explicit confirmation, because the whole
    // point of recording the refusal is that we stop emailing them by default.
    if (row.outcome === 'declined') {
      const ok = window.confirm(
        `${row.attorney.name || 'This attorney'} declined a previous invitation. Send another one anyway?`,
      )
      if (!ok) return
    }
    setBusyId(row.id)
    setError(null)
    setNotice(null)
    try {
      await inviteAttorneyToClaim(row.attorney.id, row.outcome === 'declined')
      setNotice(`Invitation sent to ${row.email || row.attorney.email || 'the attorney'}.`)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send the invitation')
    } finally {
      setBusyId(null)
    }
  }

  const revoke = async (row: AdminInvitation) => {
    setBusyId(row.id)
    setError(null)
    setNotice(null)
    try {
      await revokeAdminInvitation(row.id)
      setNotice('Invitation link revoked.')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke the invitation')
    } finally {
      setBusyId(null)
    }
  }

  const columns: DataTableColumn<AdminInvitation>[] = [
    {
      key: 'attorney',
      header: 'Attorney',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">
            {row.attorney?.name || 'Unknown attorney'}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {row.email || row.attorney?.email || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'outcome',
      header: 'Invitation',
      cell: (row) => {
        const meta = OUTCOME_META[row.outcome]
        return (
          <span title={meta.hint}>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </span>
        )
      },
    },
    {
      key: 'vetting',
      header: 'Vetting',
      cell: (row) => {
        if (row.outcome !== 'accepted') return <span className="text-xs text-slate-400">—</span>
        // Claiming no longer implies vetting, so an accepted invitation that is
        // still unvetted is a real queue someone has to work through.
        return row.attorney?.isVerified ? (
          <Badge tone="blue">Verified</Badge>
        ) : (
          <span title="Claimed the profile but not yet approved for lead routing.">
            <Badge tone="warning">Awaiting review</Badge>
          </span>
        )
      },
    },
    {
      key: 'sentAt',
      header: 'Sent',
      cell: (row) => (
        <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
          {formatDate(row.sentAt)}
        </span>
      ),
    },
    {
      key: 'responded',
      header: 'Responded',
      cell: (row) => (
        <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
          {row.outcome === 'pending' ? `Expires ${formatDate(row.expiresAt)}` : formatDate(row.respondedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => {
        const busy = busyId === row.id
        if (row.outcome === 'accepted') return <span className="text-xs text-slate-400">—</span>
        return (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => resend(row)}
              className="btn-outline text-ui-xs"
            >
              {busy ? 'Working…' : row.outcome === 'pending' ? 'Re-send' : 'Invite again'}
            </button>
            {row.outcome === 'pending' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => revoke(row)}
                className="btn-outline text-ui-xs"
                title="Cancel this link without recording a refusal"
              >
                Revoke
              </button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attorney invitations"
        description="Invitations to claim a directory profile, and what became of them. A declined invitation is recorded here only — nothing about a refusal is shown on the public directory or to the attorney."
        actions={
          <button type="button" onClick={() => navigate('/admin')} className="btn-outline text-ui-sm">
            Back to dashboard
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SectionCard title="Pending">
            <p className="text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {summary.pending}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Awaiting a response</p>
          </SectionCard>
          <SectionCard title="Accepted">
            <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {summary.accepted}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Profiles claimed</p>
          </SectionCard>
          <SectionCard title="Declined">
            <p className="text-2xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {summary.declined}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Will not be re-invited</p>
          </SectionCard>
          <SectionCard title="Expired">
            <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {summary.expired}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lapsed without a reply</p>
          </SectionCard>
        </div>
      )}

      <SectionCard
        title={`${total.toLocaleString()} invitation${total === 1 ? '' : 's'}`}
        trailing={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="Filter by outcome"
            >
              <option value="">All outcomes</option>
              {(Object.keys(OUTCOME_META) as AdminInvitationOutcome[]).map((key) => (
                <option key={key} value={key}>
                  {OUTCOME_META[key].label}
                </option>
              ))}
            </select>
            <input
              className="input w-full sm:w-56"
              placeholder="Search attorney or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          loadingMessage="Loading invitations…"
          emptyMessage={
            appliedSearch || outcome
              ? 'No invitations match these filters.'
              : 'No invitations sent yet. Invite an attorney from the Attorneys list.'
          }
        />

        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          disabled={loading}
          onChange={setOffset}
          onLimitChange={(next) => {
            setLimit(next)
            setOffset(0)
          }}
          className="mt-4"
        />
      </SectionCard>
    </div>
  )
}
