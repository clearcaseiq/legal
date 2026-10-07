/**
 * Expanded view of one insurance policy on the Insurance tab: claim milestones
 * with SLA badges, the correspondence thread with the carrier, document slots
 * (including adjuster uploads from the secure link), OCR auto-fill, the
 * adjuster's track record across the firm, and the policy-limits demand.
 * Backed by /v1/attorney-dashboard/leads/:leadId/insurance/:id/*.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  Download,
  FileText,
  Gavel,
  Link2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import {
  attachPolicyDocument,
  deleteInsuranceCorrespondence,
  downloadPolicyDocument,
  getLeadEvidenceFiles,
  getLimitsDemandPreview,
  getPolicyWorkbench,
  logInsuranceCorrespondence,
  removePolicyDocument,
  requestCarrierDocuments,
  sendLimitsDemand,
  setLimitsDemandStatus,
  updateLeadInsurance,
  updatePolicyMilestones,
  uploadLeadEvidenceOnBehalf,
  type ClaimMilestone,
  type PolicyWorkbench as Workbench,
} from '../../lib/api'
import LetterComposerModal, { saveLetterPdf } from './LetterComposerModal'

export interface WorkbenchPolicy {
  id: string
  carrierName: string
  adjusterName: string | null
  adjusterEmail: string | null
  claimNumber: string | null
  insuredParty: string | null
  lorAcknowledgedAt?: string | null
  liabilityDecision?: string | null
  limitsDemandSentAt?: string | null
  limitsDemandDeadline?: string | null
  limitsDemandStatus?: string | null
}

type Section = 'timeline' | 'thread' | 'documents'

const MILESTONE_BADGE: Record<ClaimMilestone['status'], { cls: string; label: string }> = {
  done: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Done' },
  overdue: { cls: 'bg-rose-50 text-rose-700 ring-rose-200', label: 'Overdue' },
  due_soon: { cls: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Due soon' },
  pending: { cls: 'bg-slate-100 text-slate-600 ring-slate-200', label: 'Pending' },
  not_applicable: { cls: 'bg-slate-50 text-slate-400 ring-slate-200', label: 'N/A' },
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  call: 'Call',
  letter: 'Letter',
  fax: 'Fax',
  portal: 'Secure portal',
  note: 'Note',
}

function shortDate(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dateTime(value: string) {
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function PolicyWorkbench({
  leadId,
  policy,
  onChanged,
}: {
  leadId: string
  policy: WorkbenchPolicy
  onChanged: () => void
}) {
  const [data, setData] = useState<Workbench | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [section, setSection] = useState<Section>('timeline')
  const [busy, setBusy] = useState<string | null>(null)
  const [composer, setComposer] = useState<null | 'entry'>(null)
  const [requesting, setRequesting] = useState(false)
  const [demandOpen, setDemandOpen] = useState(false)
  const [demandDays, setDemandDays] = useState(30)

  const load = useCallback(async () => {
    try {
      setData(await getPolicyWorkbench(leadId, policy.id))
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load the policy details.')
    } finally {
      setLoading(false)
    }
  }, [leadId, policy.id])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key)
    setBanner(null)
    try {
      await fn()
      if (ok) setBanner({ tone: 'ok', text: ok })
      await load()
      onChanged()
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || err?.message || 'Something went wrong.' })
    } finally {
      setBusy(null)
    }
  }

  const applyAutofill = () => {
    const a = data?.autofill
    if (!a) return
    const patch: Record<string, unknown> = {}
    if (a.policyNumber) patch.policyNumber = a.policyNumber
    if (a.claimNumber) patch.claimNumber = a.claimNumber
    if (a.policyLimit) patch.policyLimit = a.policyLimit
    if (a.adjusterEmail) patch.adjusterEmail = a.adjusterEmail
    if (a.adjusterPhone) patch.adjusterPhone = a.adjusterPhone
    void run('autofill', () => updateLeadInsurance(leadId, policy.id, patch), 'Policy updated from the document.')
  }

  if (loading) return <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">Loading claim details…</div>
  if (error || !data) return <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-rose-600">{error}</div>

  const overdue = data.milestones.filter((m) => m.status === 'overdue').length
  const isClient = policy.insuredParty === 'client'

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      {banner ? (
        <div className={`rounded-lg px-3 py-2 text-xs ${banner.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{banner.text}</div>
      ) : null}

      {data.autofill ? (
        <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <div className="text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Found in {data.autofill.sourceName || 'an uploaded document'}</p>
              <p className="mt-0.5">
                {[
                  data.autofill.policyNumber && `Policy # ${data.autofill.policyNumber}`,
                  data.autofill.claimNumber && `Claim # ${data.autofill.claimNumber}`,
                  data.autofill.policyLimit && `Limit $${Math.round(data.autofill.policyLimit).toLocaleString()}`,
                  data.autofill.adjusterEmail,
                  data.autofill.adjusterPhone,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {data.autofill.coverageHints?.length ? (
                <p className="mt-0.5 text-slate-500">Mentions {data.autofill.coverageHints.map((h) => h.toUpperCase()).join(', ')} coverage. Add a policy record for each.</p>
              ) : null}
            </div>
          </div>
          {data.autofill.policyNumber || data.autofill.claimNumber || data.autofill.policyLimit || data.autofill.adjusterEmail || data.autofill.adjusterPhone ? (
            <button
              type="button"
              onClick={applyAutofill}
              disabled={busy === 'autofill'}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Apply to policy
            </button>
          ) : null}
        </div>
      ) : null}

      {data.adjuster ? <AdjusterLine profile={data.adjuster} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
          {(
            [
              ['timeline', `Timeline${overdue ? ` (${overdue} overdue)` : ''}`],
              ['thread', `Correspondence (${data.thread.length})`],
              ['documents', `Documents (${data.documents.length})`],
            ] as [Section, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`rounded-md px-2.5 py-1 transition ${section === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} ${key === 'timeline' && overdue ? 'text-rose-600' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRequesting(true)}
            disabled={!policy.adjusterEmail}
            title={
              policy.adjusterEmail
                ? `Email ${isClient ? "your client's" : 'the'} adjuster a secure link to upload documents straight into this policy.`
                : "Add the adjuster's email first."
            }
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Link2 className="h-3.5 w-3.5" /> Request documents
          </button>
          <button
            type="button"
            onClick={() => setComposer('entry')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Log / email
          </button>
          {!isClient && !policy.limitsDemandSentAt ? (
            <button
              type="button"
              onClick={() => setDemandOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Gavel className="h-3.5 w-3.5" /> Policy-limits demand
            </button>
          ) : null}
        </div>
      </div>

      {policy.limitsDemandSentAt ? (
        <LimitsDemandStatus
          policy={policy}
          busy={busy === 'limits'}
          onSet={(status) =>
            run('limits', () => setLimitsDemandStatus(leadId, policy.id, status), `Demand marked ${status}.`)
          }
        />
      ) : null}

      {section === 'timeline' ? (
        <div className="space-y-2">
          <ol className="space-y-1.5">
            {data.milestones.map((m) => (
              <li key={m.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  {m.status === 'done' ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : m.status === 'overdue' ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{m.label}</p>
                    <p className="text-xs text-slate-500">
                      {m.at ? shortDate(m.at) : m.dueAt ? `Target ${shortDate(m.dueAt)}` : 'No target yet'}
                      {m.detail ? ` · ${m.detail}` : ''}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${MILESTONE_BADGE[m.status].cls}`}>
                  {MILESTONE_BADGE[m.status].label}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              disabled={busy === 'ack'}
              onClick={() =>
                run(
                  'ack',
                  () => updatePolicyMilestones(leadId, policy.id, { lorAcknowledged: !policy.lorAcknowledgedAt }),
                  policy.lorAcknowledgedAt ? 'Acknowledgment cleared.' : 'Marked as acknowledged by the carrier.',
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" /> {policy.lorAcknowledgedAt ? 'Clear acknowledgment' : 'Carrier acknowledged LOR'}
            </button>
            {!isClient ? (
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                Liability
                <select
                  value={policy.liabilityDecision || ''}
                  disabled={busy === 'liability'}
                  onChange={(e) =>
                    run(
                      'liability',
                      () =>
                        updatePolicyMilestones(leadId, policy.id, {
                          liabilityDecision: (e.target.value || null) as 'accepted' | 'denied' | 'partial' | null,
                        }),
                      'Liability decision saved.',
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                >
                  <option value="">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="partial">Partial / comparative</option>
                  <option value="denied">Denied</option>
                </select>
              </label>
            ) : null}
          </div>
        </div>
      ) : null}

      {section === 'thread' ? (
        <div className="space-y-1.5">
          {!data.thread.length ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
              No correspondence yet. Log adjuster calls and letters here, or email the adjuster from the platform.
            </p>
          ) : null}
          {data.thread.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5 rounded-lg border border-slate-100 px-3 py-2">
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${item.direction === 'inbound' ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'}`}
                title={item.direction === 'inbound' ? 'From the carrier' : 'To the carrier'}
              >
                {item.direction === 'inbound' ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{item.subject || CHANNEL_LABELS[item.channel] || item.channel}</span>
                  <span>{CHANNEL_LABELS[item.channel] || item.channel}</span>
                  <span>{dateTime(item.occurredAt)}</span>
                  {item.contactName ? <span>· {item.contactName}</span> : null}
                  {item.createdByName ? <span>· by {item.createdByName}</span> : null}
                  {item.status ? <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold uppercase">{item.status}</span> : null}
                </div>
                {item.body ? <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{item.body}</p> : null}
              </div>
              {item.kind === 'letter' && item.letterId ? (
                <button
                  type="button"
                  onClick={() => void saveLetterPdf(leadId, item.letterId!, `${(item.subject || 'Letter').replace(/[^a-z0-9]+/gi, '-')}.pdf`)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Download PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {item.kind === 'entry' ? (
                <button
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => run(item.id, () => deleteInsuranceCorrespondence(leadId, policy.id, item.id))}
                  className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                  title="Delete entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {section === 'documents' ? (
        <DocumentSlots leadId={leadId} policyId={policy.id} data={data} busy={busy} run={run} />
      ) : null}

      {composer === 'entry' ? (
        <CorrespondenceModal
          policy={policy}
          onClose={() => setComposer(null)}
          onSubmit={async (payload) => {
            const res = await logInsuranceCorrespondence(leadId, policy.id, payload)
            setComposer(null)
            setSection('thread')
            setBanner({ tone: 'ok', text: res.emailed ? `Email sent to ${payload.recipientEmail || policy.adjusterEmail}.` : 'Entry logged.' })
            await load()
            onChanged()
          }}
        />
      ) : null}

      {requesting ? (
        <RequestDocsModal
          policy={policy}
          options={data.requestableDocs}
          onClose={() => setRequesting(false)}
          onSubmit={async (docs, message) => {
            await requestCarrierDocuments(leadId, policy.id, { docs, message })
            setRequesting(false)
            setSection('thread')
            setBanner({ tone: 'ok', text: `Secure upload link emailed to ${policy.adjusterEmail}. Uploads file into this policy automatically.` })
            await load()
            onChanged()
          }}
        />
      ) : null}

      {demandOpen ? (
        <LetterComposerModal
          leadId={leadId}
          title="Time-limited policy-limits demand"
          docLabel="Policy-limits demand"
          recipientLabel={policy.adjusterName ? `${policy.adjusterName}, ${policy.carrierName}` : policy.carrierName}
          defaultEmail={policy.adjusterEmail}
          previewKey={String(demandDays)}
          loadPreview={() => getLimitsDemandPreview(leadId, policy.id, demandDays)}
          onSend={async (payload) => {
            const res = await sendLimitsDemand(leadId, policy.id, { ...payload, deadlineDays: demandDays })
            return { letter: { id: res.letterId } as any, emailed: res.emailed, tasksCompleted: 0 }
          }}
          onSent={(_r, message) => {
            setDemandOpen(false)
            setBanner({ tone: 'ok', text: `${message} The deadline is on the task board and tracked on this policy.` })
            void load()
            onChanged()
          }}
          onClose={() => setDemandOpen(false)}
          controls={
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Deadline to accept
              <select
                value={demandDays}
                onChange={(e) => setDemandDays(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
              >
                {[10, 15, 20, 30, 45, 60].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
              <span className="text-xs text-slate-500">Check your state's minimum response window before sending.</span>
            </label>
          }
        />
      ) : null}
    </div>
  )
}

function AdjusterLine({ profile }: { profile: NonNullable<Workbench['adjuster']> }) {
  const parts = [
    `${profile.caseCount} case${profile.caseCount === 1 ? '' : 's'} with your firm`,
    profile.avgResponseDays != null ? `responds in ~${profile.avgResponseDays} day${profile.avgResponseDays === 1 ? '' : 's'}` : null,
    profile.unansweredOutreach ? `${profile.unansweredOutreach} unanswered` : null,
    profile.liabilityAccepted + profile.liabilityDenied
      ? `liability accepted ${profile.liabilityAccepted}/${profile.liabilityAccepted + profile.liabilityDenied}`
      : null,
    profile.limitsAccepted + profile.limitsRejected
      ? `limits demands paid ${profile.limitsAccepted}/${profile.limitsAccepted + profile.limitsRejected}`
      : null,
  ].filter(Boolean)
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span>
        <span className="font-semibold text-slate-800">{profile.name || profile.email}</span> · {parts.join(' · ')}
      </span>
    </div>
  )
}

function LimitsDemandStatus({
  policy,
  busy,
  onSet,
}: {
  policy: WorkbenchPolicy
  busy: boolean
  onSet: (status: 'accepted' | 'rejected') => void
}) {
  const deadline = policy.limitsDemandDeadline ? new Date(policy.limitsDemandDeadline) : null
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null
  const status = policy.limitsDemandStatus || 'sent'
  const tone =
    status === 'accepted'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : status === 'expired' || status === 'rejected'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : daysLeft != null && daysLeft <= 5
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-slate-200 bg-slate-50 text-slate-700'
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${tone}`}>
      <div className="flex items-center gap-2">
        <Gavel className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">Policy-limits demand {status}</span>
          {' · sent '}
          {shortDate(policy.limitsDemandSentAt)}
          {deadline ? ` · deadline ${shortDate(deadline.toISOString())}` : ''}
          {status === 'sent' && daysLeft != null ? ` (${daysLeft > 0 ? `${daysLeft} days left` : 'due today'})` : ''}
          {status === 'expired' ? ' · carrier did not accept in time. Evaluate excess / bad-faith exposure.' : ''}
        </span>
      </div>
      {status === 'sent' ? (
        <div className="flex gap-1.5">
          <button type="button" disabled={busy} onClick={() => onSet('accepted')} className="rounded-lg border border-emerald-200 bg-white px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            Carrier accepted
          </button>
          <button type="button" disabled={busy} onClick={() => onSet('rejected')} className="rounded-lg border border-rose-200 bg-white px-2 py-0.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
            Carrier rejected
          </button>
        </div>
      ) : null}
    </div>
  )
}

function DocumentSlots({
  leadId,
  policyId,
  data,
  busy,
  run,
}: {
  leadId: string
  policyId: string
  data: Workbench
  busy: string | null
  run: (key: string, fn: () => Promise<unknown>, ok?: string) => Promise<void>
}) {
  const [picking, setPicking] = useState<string | null>(null)
  const [files, setFiles] = useState<any[] | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const uploadSlot = useRef<string | null>(null)

  const openPicker = async (slot: string) => {
    setPicking(slot)
    if (!files) {
      const res = await getLeadEvidenceFiles(leadId).catch(() => ({ files: [] as any[] }))
      setFiles(res.files)
    }
  }

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const slot = uploadSlot.current
    e.target.value = ''
    if (!file || !slot) return
    void run(
      `upload:${slot}`,
      async () => {
        const uploaded = await uploadLeadEvidenceOnBehalf(leadId, file, {
          category: slot === 'dec_page' ? 'dec_page' : 'insurance_letters',
          description: data.slots.find((s) => s.key === slot)?.label,
        })
        const id = uploaded?.id || uploaded?.file?.id || uploaded?.evidenceFile?.id
        if (!id) throw new Error('The file uploaded, but could not be filed to this policy. Attach it from case files.')
        await attachPolicyDocument(leadId, policyId, slot, id)
        setFiles(null)
      },
      'Document filed. Fields found by OCR will be offered for auto-fill once processing finishes.',
    )
  }

  return (
    <div className="space-y-1.5">
      <input ref={fileInput} type="file" className="hidden" onChange={onUpload} />
      {data.slots.map((slot) => {
        const docs = data.documents.filter((d) => d.docType === slot.key)
        return (
          <div key={slot.key} className="rounded-lg border border-slate-100 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {docs.length ? <Check className="h-4 w-4 text-emerald-600" /> : <FileText className="h-4 w-4 text-slate-300" />}
                <span className="text-sm font-medium text-slate-800">{slot.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={busy === `upload:${slot.key}`}
                  onClick={() => {
                    uploadSlot.current = slot.key
                    fileInput.current?.click()
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <Upload className="h-3.5 w-3.5" /> {busy === `upload:${slot.key}` ? 'Uploading…' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => void openPicker(slot.key)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <Plus className="h-3.5 w-3.5" /> From case files
                </button>
              </div>
            </div>
            {docs.map((d) => (
              <div key={d.id} className="mt-1.5 flex items-center justify-between gap-2 pl-6 text-xs text-slate-600">
                <span className="truncate">
                  {d.originalName}
                  <span className="text-slate-400">
                    {' · '}
                    {d.source === 'adjuster' ? `uploaded by ${d.uploadedByName || 'adjuster'}` : 'case file'} · {shortDate(d.createdAt)}
                    {d.processing ? ' · reading…' : ''}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={async () => saveBlob(await downloadPolicyDocument(leadId, policyId, d.id), d.originalName)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy === d.id}
                    onClick={() => run(d.id, () => removePolicyDocument(leadId, policyId, d.id))}
                    className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                    title="Remove from slot (keeps the case file)"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
            {picking === slot.key ? (
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                {!files ? <p className="text-xs text-slate-400">Loading case files…</p> : null}
                {files && !files.length ? <p className="text-xs text-slate-500">No files on this case yet.</p> : null}
                {(files || []).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setPicking(null)
                      void run(`pick:${f.id}`, () => attachPolicyDocument(leadId, policyId, slot.key, f.id), `Filed under ${slot.label}.`)
                    }}
                    className="block w-full truncate rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-white"
                  >
                    {f.originalName} <span className="text-slate-400">· {f.category}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setPicking(null)} className="mt-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function followUpDraft(policy: WorkbenchPolicy) {
  const ref = policy.claimNumber ? ` (claim ${policy.claimNumber})` : ''
  return {
    subject: `Follow-up: letter of representation${ref}`,
    body: `Hello ${policy.adjusterName || 'Claims Representative'},\n\nWe sent our letter of representation for this claim${ref} and have not received an acknowledgment. Please confirm receipt, the claim number, and the available coverage limits, and direct all further communication to our office.\n\nThank you.`,
  }
}

function CorrespondenceModal({
  policy,
  onClose,
  onSubmit,
}: {
  policy: WorkbenchPolicy
  onClose: () => void
  onSubmit: (payload: Parameters<typeof logInsuranceCorrespondence>[2]) => Promise<void>
}) {
  const [mode, setMode] = useState<'log' | 'email'>('log')
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('inbound')
  const [channel, setChannel] = useState('call')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [contactName, setContactName] = useState(policy.adjusterName || '')
  const [occurredAt, setOccurredAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16))
  const [recipientEmail, setRecipientEmail] = useState(policy.adjusterEmail || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSubmit(
        mode === 'email'
          ? { direction: 'outbound', channel: 'email', subject, body, sendEmail: true, recipientEmail }
          : { direction, channel, subject, body, contactName, occurredAt: new Date(occurredAt).toISOString() },
      )
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{policy.carrierName}: correspondence</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
          <button type="button" onClick={() => setMode('log')} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${mode === 'log' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>
            <Phone className="h-3.5 w-3.5" /> Log a call, letter or note
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('email')
              if (!subject && !body) {
                const draft = followUpDraft(policy)
                setSubject(draft.subject)
                setBody(draft.body)
              }
            }}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${mode === 'email' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
          >
            <Mail className="h-3.5 w-3.5" /> Email the adjuster
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {mode === 'log' ? (
            <div className="grid grid-cols-2 gap-3">
              <select className={input} value={direction} onChange={(e) => setDirection(e.target.value as 'outbound' | 'inbound')}>
                <option value="inbound">From the carrier</option>
                <option value="outbound">To the carrier</option>
              </select>
              <select className={input} value={channel} onChange={(e) => setChannel(e.target.value)}>
                {['call', 'email', 'letter', 'fax', 'note'].map((c) => (
                  <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
                ))}
              </select>
              <input className={input} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" />
              <input className={input} type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </div>
          ) : (
            <input className={input} type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="Adjuster email" />
          )}
          <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={mode === 'email' ? 'Subject' : 'Summary (e.g. Adjuster confirmed 100/300 limits)'} />
          <textarea className={`${input} min-h-[120px]`} value={body} onChange={(e) => setBody(e.target.value)} placeholder={mode === 'email' ? 'Message' : 'Details'} />
          {mode === 'email' ? <p className="text-xs text-slate-500">Replies go to the assigned attorney's inbox. Log them here when they arrive.</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || (mode === 'email' ? !subject.trim() || !body.trim() || !recipientEmail.trim() : !subject.trim() && !body.trim())}
            className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'email' ? 'Send email' : 'Log entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RequestDocsModal({
  policy,
  options,
  onClose,
  onSubmit,
}: {
  policy: WorkbenchPolicy
  options: { key: string; label: string }[]
  onClose: () => void
  onSubmit: (docs: string[], message: string) => Promise<void>
}) {
  const [docs, setDocs] = useState<string[]>(['dec_page'])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toggle = (k: string) => setDocs((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Request documents from {policy.carrierName}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {policy.adjusterEmail} gets a secure upload link. No account needed. Uploads land in this policy's document slots.
        </p>
        <div className="mt-3 space-y-1.5">
          {options.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={docs.includes(o.key)} onChange={() => toggle(o.key)} />
              {o.label}
            </label>
          ))}
        </div>
        <textarea
          className="mt-3 min-h-[72px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message to the adjuster"
        />
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !docs.length}
            onClick={async () => {
              setSaving(true)
              setError(null)
              try {
                await onSubmit(docs, message)
              } catch (err: any) {
                setError(err?.response?.data?.error || 'Could not send the request.')
              } finally {
                setSaving(false)
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" /> {saving ? 'Sending…' : 'Send secure link'}
          </button>
        </div>
      </div>
    </div>
  )
}
