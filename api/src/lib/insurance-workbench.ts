/**
 * Insurance workbench: everything the Insurance tab does beyond storing a
 * policy record.
 *
 * - Claim milestones with SLA targets, derived from stamps on the policy, the
 *   letters sent, and the correspondence thread.
 * - Follow-up cadences (unacknowledged LOR, outstanding dec page, policy-limits
 *   demand deadline) that put a task on the board when a carrier goes quiet.
 * - Coverage stacking against the damages ledger, flagging underinsured cases.
 * - Per-policy document slots, including files adjusters upload through the
 *   secure portal, and field auto-fill from OCR text.
 * - The time-limited policy-limits demand letter.
 * - A firm-wide adjuster directory with response-time and outcome stats.
 */
import fs from 'fs'
import { prisma } from './prisma'
import { logger } from './logger'
import { summarizeDamages } from './damages-ledger'
import { ensureCaseOwnerUserId } from './case-owner'
import { fanOutCaseUpdates, fileClaimantEvidence } from './evidence-intake'
import { sendTransactionalEmail } from './claims'
import { BLANK, renderLetterPdf, type LetterContext } from './representation-letters'

const DAY_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Document slots and carrier portal requests
// ---------------------------------------------------------------------------

export const POLICY_DOC_SLOTS = [
  { key: 'dec_page', label: 'Declarations page' },
  { key: 'lor_ack', label: 'LOR / claim acknowledgment' },
  { key: 'reservation_of_rights', label: 'Reservation of rights' },
  { key: 'coverage_letter', label: 'Coverage position letter' },
  { key: 'denial_letter', label: 'Denial letter' },
  { key: 'medpay_ledger', label: 'MedPay / PIP payment ledger' },
  { key: 'policy', label: 'Full certified policy' },
  { key: 'recorded_statement', label: 'Recorded statement / transcript' },
  { key: 'property_damage_estimate', label: 'Property damage estimate / photos' },
  { key: 'other', label: 'Other' },
] as const

export type PolicyDocType = (typeof POLICY_DOC_SLOTS)[number]['key']

export const POLICY_DOC_LABELS: Record<string, string> = Object.fromEntries(
  POLICY_DOC_SLOTS.map((s) => [s.key, s.label]),
)

/** Keys an adjuster can be asked to upload through the secure portal. */
export const CARRIER_REQUEST_DOCS = POLICY_DOC_SLOTS.filter((s) => s.key !== 'lor_ack').map((s) => s.key) as string[]

export function isPolicyDocType(value: unknown): value is PolicyDocType {
  return typeof value === 'string' && value in POLICY_DOC_LABELS
}

function evidenceCategoryForPolicyDoc(docType: string | null): string {
  if (docType === 'dec_page') return 'dec_page'
  if (docType === 'property_damage_estimate') return 'property_damage'
  return 'insurance_letters'
}

export function parseIdList(raw: unknown): string[] {
  if (!raw) return []
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * File an adjuster's portal upload into the policy it was requested for: copy
 * it into case evidence (so OCR runs and auto-fill has text to read), slot it,
 * log it on the thread as an inbound response, and put a review task up.
 */
export async function fileCarrierPortalUpload(input: {
  insuranceDetailId: string
  externalUploadId: string
  docType: string | null
  filePath: string
  originalName: string
  mimeType: string | null
  uploadedByName: string | null
}): Promise<void> {
  const insurance = await prisma.insuranceDetail.findUnique({
    where: { id: input.insuranceDetailId },
    select: { id: true, assessmentId: true, carrierName: true, adjusterName: true },
  })
  if (!insurance) return
  const docType = isPolicyDocType(input.docType) ? input.docType : 'other'
  const label = POLICY_DOC_LABELS[docType]

  let evidenceFileId: string | null = null
  try {
    const ownerUserId = await ensureCaseOwnerUserId(insurance.assessmentId)
    if (ownerUserId && fs.existsSync(input.filePath)) {
      const result = await fileClaimantEvidence({
        assessmentId: insurance.assessmentId,
        ownerUserId,
        buffer: fs.readFileSync(input.filePath),
        contentType: input.mimeType || 'application/octet-stream',
        originalName: input.originalName,
        category: evidenceCategoryForPolicyDoc(docType),
        uploadMethod: 'upload_link',
        provenanceSource: `carrier_portal:${insurance.id}`,
        provenanceActor: 'insurer',
        provenanceNotes: `Uploaded by ${input.uploadedByName || insurance.carrierName} through the secure carrier portal.`,
      })
      if (result.status === 'filed') {
        evidenceFileId = result.evidenceFileId
        fanOutCaseUpdates(insurance.assessmentId, [result.filed])
      }
    }
  } catch (error: any) {
    logger.warn('Carrier upload could not be copied to evidence', { error: error?.message, insuranceDetailId: insurance.id })
  }

  await prisma.insuranceDocument.create({
    data: {
      insuranceDetailId: insurance.id,
      assessmentId: insurance.assessmentId,
      docType,
      externalUploadId: input.externalUploadId,
      evidenceFileId,
    },
  })
  await prisma.insuranceCorrespondence.create({
    data: {
      insuranceDetailId: insurance.id,
      assessmentId: insurance.assessmentId,
      direction: 'inbound',
      channel: 'portal',
      subject: `${label} uploaded`,
      body: `${input.originalName}`,
      contactName: input.uploadedByName || insurance.adjusterName || insurance.carrierName,
    },
  })
  if (docType === 'lor_ack') {
    await prisma.insuranceDetail.updateMany({
      where: { id: insurance.id, lorAcknowledgedAt: null },
      data: { lorAcknowledgedAt: new Date() },
    })
  }
  await prisma.caseTask.create({
    data: {
      assessmentId: insurance.assessmentId,
      title: `Review ${label.toLowerCase()} from ${insurance.carrierName}`,
      taskType: 'general',
      assignedRole: 'paralegal',
      priority: docType === 'denial_letter' || docType === 'reservation_of_rights' ? 'high' : 'medium',
      notes: `Uploaded by ${input.uploadedByName || 'the adjuster'} through the secure carrier portal: ${input.originalName}.`,
    },
  })
}

// ---------------------------------------------------------------------------
// OCR auto-fill
// ---------------------------------------------------------------------------

export interface PolicyFieldSuggestion {
  policyNumber?: string
  claimNumber?: string
  policyLimit?: number
  adjusterEmail?: string
  adjusterPhone?: string
  coverageHints?: string[]
}

function parseMoney(raw: string): number | null {
  const s = raw.replace(/[$,\s]/g, '').toLowerCase()
  const m = s.match(/^(\d+(?:\.\d+)?)(k|m)?$/)
  if (!m) return null
  const n = Number(m[1]) * (m[2] === 'k' ? 1000 : m[2] === 'm' ? 1_000_000 : 1)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Pull policy fields out of dec page / carrier letter OCR text. */
export function extractPolicyFields(text: string | null | undefined): PolicyFieldSuggestion {
  const out: PolicyFieldSuggestion = {}
  if (!text) return out
  const t = text.replace(/\r/g, '')

  const policy = t.match(/policy\s*(?:number|no\.?|#)\s*[:#]?\s*([A-Z0-9][A-Z0-9\- ]{4,24}[A-Z0-9])/i)
  if (policy) out.policyNumber = policy[1].trim()
  const claim = t.match(/claim\s*(?:number|no\.?|#)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-]{4,24})/i)
  if (claim) out.claimNumber = claim[1].trim()

  // Bodily injury limits read "$100,000 / $300,000" or "100/300": the first
  // figure is the per-person limit, which is what caps one claimant.
  const bi = t.match(/bodily\s+injury[^\n$\d]{0,40}\$?\s*([\d,]+(?:\.\d+)?\s*[km]?)\s*(?:\/|each person|per person)/i)
  const split = t.match(/\$?\s*(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*\/\s*(\d{1,3}))?\b/)
  if (bi) {
    const n = parseMoney(bi[1])
    if (n) out.policyLimit = n < 1000 ? n * 1000 : n
  } else if (split) {
    out.policyLimit = Number(split[1]) * 1000
  }

  const email = t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (email) out.adjusterEmail = email[0]
  const phone = t.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)
  if (phone) out.adjusterPhone = phone[0].trim()

  const hints: string[] = []
  if (/uninsured\s+motorist|\bUM\b/i.test(t)) hints.push('um')
  if (/underinsured\s+motorist|\bUIM\b/i.test(t)) hints.push('uim')
  if (/medical\s+payments|med\s*pay/i.test(t)) hints.push('medpay')
  if (/personal\s+injury\s+protection|\bPIP\b/.test(t)) hints.push('pip')
  if (hints.length) out.coverageHints = hints
  return out
}

// ---------------------------------------------------------------------------
// Claim milestones
// ---------------------------------------------------------------------------

export type MilestoneStatus = 'done' | 'overdue' | 'due_soon' | 'pending' | 'not_applicable'

export interface ClaimMilestone {
  key: string
  label: string
  at: string | null
  dueAt: string | null
  status: MilestoneStatus
  detail?: string
}

function iso(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null
}

function addDays(d: Date | null | undefined, days: number): Date | null {
  return d ? new Date(new Date(d).getTime() + days * DAY_MS) : null
}

function statusFor(at: Date | null | undefined, dueAt: Date | null, now: Date): MilestoneStatus {
  if (at) return 'done'
  if (!dueAt) return 'pending'
  const ms = dueAt.getTime() - now.getTime()
  if (ms < 0) return 'overdue'
  if (ms < 3 * DAY_MS) return 'due_soon'
  return 'pending'
}

export function buildClaimMilestones(input: {
  insurance: any
  lorSentAt: Date | null
  decRequestedAt: Date | null
  decReceivedAt: Date | null
  now?: Date
}): ClaimMilestone[] {
  const { insurance: ins, lorSentAt, decRequestedAt, decReceivedAt } = input
  const now = input.now ?? new Date()
  const start = ins.createdAt ? new Date(ins.createdAt) : now
  const claimNumberAt: Date | null = ins.claimNumberAt || (ins.claimNumber ? ins.claimOpenedAt || ins.updatedAt : null)

  const milestones: ClaimMilestone[] = []
  const push = (key: string, label: string, at: Date | null, dueAt: Date | null, detail?: string) =>
    milestones.push({ key, label, at: iso(at), dueAt: iso(dueAt), status: statusFor(at, dueAt, now), detail })

  push('lor_sent', 'Letter of representation sent', lorSentAt, addDays(start, 3))
  push('lor_ack', 'Carrier acknowledged representation', ins.lorAcknowledgedAt, addDays(lorSentAt, 14))
  push('claim_number', 'Claim number received', claimNumberAt, addDays(lorSentAt ?? start, 14), ins.claimNumber || undefined)
  push(
    'dec_page',
    'Declarations page received',
    decReceivedAt,
    decRequestedAt ? addDays(decRequestedAt, 30) : null,
    decRequestedAt ? undefined : 'Not requested yet',
  )
  push('coverage_confirmed', 'Coverage limits confirmed', ins.coverageConfirmed ? ins.coverageConfirmedAt || decReceivedAt || ins.updatedAt : null, null)
  push(
    'liability_decision',
    'Liability decision',
    ins.liabilityDecisionAt,
    ins.insuredParty === 'client' ? null : addDays(claimNumberAt ?? lorSentAt, 40),
    ins.liabilityDecision ? `Liability ${ins.liabilityDecision}` : undefined,
  )
  if (ins.limitsDemandSentAt) {
    const resolved = ins.limitsDemandStatus && ins.limitsDemandStatus !== 'sent'
    milestones.push({
      key: 'limits_demand',
      label: 'Policy-limits demand response',
      at: resolved ? iso(ins.updatedAt) : null,
      dueAt: iso(ins.limitsDemandDeadline),
      status: resolved
        ? ins.limitsDemandStatus === 'expired'
          ? 'overdue'
          : 'done'
        : statusFor(null, ins.limitsDemandDeadline ? new Date(ins.limitsDemandDeadline) : null, now),
      detail: ins.limitsDemandStatus ? `Demand ${ins.limitsDemandStatus}` : undefined,
    })
  }
  return milestones
}

/** Load everything the milestone builder needs for one policy. */
export async function loadPolicyMilestones(insurance: any): Promise<ClaimMilestone[]> {
  const [lor, decRequest, decDoc] = await Promise.all([
    prisma.caseLetter.findFirst({
      where: { insuranceDetailId: insurance.id, kind: 'carrier_lor' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    insurance.decPageRequestId
      ? prisma.documentRequest.findUnique({ where: { id: insurance.decPageRequestId }, select: { createdAt: true } })
      : null,
    prisma.insuranceDocument.findFirst({
      where: { insuranceDetailId: insurance.id, docType: 'dec_page' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ])
  return buildClaimMilestones({
    insurance,
    lorSentAt: lor?.createdAt ?? null,
    decRequestedAt: decRequest?.createdAt ?? null,
    decReceivedAt: decDoc?.createdAt ?? null,
  })
}

// ---------------------------------------------------------------------------
// Follow-up cadences
// ---------------------------------------------------------------------------

const FOLLOW_UP_KEY = (insuranceId: string, kind: string) => `insurance-followup:${insuranceId}:${kind}`

async function ensureFollowUpTask(input: {
  assessmentId: string
  insuranceId: string
  kind: string
  title: string
  notes: string
  priority?: 'medium' | 'high'
  dueDate?: Date | null
}): Promise<boolean> {
  const sourceTemplateStepId = FOLLOW_UP_KEY(input.insuranceId, input.kind)
  const exists = await prisma.caseTask.findFirst({
    where: { assessmentId: input.assessmentId, sourceTemplateStepId },
    select: { id: true },
  })
  if (exists) return false
  await prisma.caseTask.create({
    data: {
      assessmentId: input.assessmentId,
      title: input.title,
      taskType: input.kind.startsWith('limits') ? 'demand_deadline' : 'general',
      deadlineType: input.kind.startsWith('limits') ? 'demand' : null,
      assignedRole: 'paralegal',
      priority: input.priority ?? 'high',
      notes: input.notes,
      dueDate: input.dueDate ?? new Date(),
      sourceTemplateId: 'insurance-followup',
      sourceTemplateStepId,
    },
  })
  return true
}

/**
 * Raise any follow-up the carrier's silence calls for, for one case (or all
 * open policies when no case is given). Idempotent: each cadence step creates
 * its task once, keyed on the policy.
 */
export async function runInsuranceFollowUps(opts: { assessmentId?: string; now?: Date } = {}) {
  const now = opts.now ?? new Date()
  const policies = await prisma.insuranceDetail.findMany({
    where: {
      ...(opts.assessmentId ? { assessmentId: opts.assessmentId } : {}),
      claimStatus: { not: 'closed' },
    },
    take: opts.assessmentId ? undefined : 5000,
  })
  if (!policies.length) return { policies: 0, created: 0, expired: 0 }

  const ids = policies.map((p) => p.id)
  const [letters, inbound, decRequests, decDocs] = await Promise.all([
    prisma.caseLetter.findMany({
      where: { insuranceDetailId: { in: ids }, kind: 'carrier_lor' },
      orderBy: { createdAt: 'asc' },
      select: { insuranceDetailId: true, createdAt: true },
    }),
    prisma.insuranceCorrespondence.findMany({
      where: { insuranceDetailId: { in: ids }, direction: 'inbound' },
      select: { insuranceDetailId: true, occurredAt: true },
    }),
    prisma.documentRequest.findMany({
      where: { id: { in: policies.map((p) => p.decPageRequestId).filter((x): x is string => Boolean(x)) } },
      select: { id: true, createdAt: true, status: true },
    }),
    prisma.insuranceDocument.findMany({
      where: { insuranceDetailId: { in: ids }, docType: 'dec_page' },
      select: { insuranceDetailId: true },
    }),
  ])
  const firstLor = new Map<string, Date>()
  for (const l of letters) if (l.insuranceDetailId && !firstLor.has(l.insuranceDetailId)) firstLor.set(l.insuranceDetailId, l.createdAt)
  const decById = new Map(decRequests.map((r) => [r.id, r]))
  const hasDec = new Set(decDocs.map((d) => d.insuranceDetailId))

  let created = 0
  let expired = 0
  for (const p of policies) {
    const who = p.adjusterName ? `${p.adjusterName} at ${p.carrierName}` : p.carrierName

    const lorAt = firstLor.get(p.id)
    const heardBack = inbound.some((c) => c.insuranceDetailId === p.id && lorAt && c.occurredAt > lorAt)
    if (lorAt && !p.lorAcknowledgedAt && !heardBack) {
      const days = Math.floor((now.getTime() - lorAt.getTime()) / DAY_MS)
      for (const step of [14, 7]) {
        if (days < step) continue
        const made = await ensureFollowUpTask({
          assessmentId: p.assessmentId,
          insuranceId: p.id,
          kind: `lor_ack_${step}d`,
          title: `Follow up with ${who}: letter of representation unacknowledged (${step} days)`,
          notes: `The letter of representation went out ${lorAt.toLocaleDateString('en-US')} and the carrier has not acknowledged it. Call or email the adjuster, and log the contact on the policy's correspondence thread.`,
          priority: step >= 14 ? 'high' : 'medium',
        })
        if (made) created += 1
        break
      }
    }

    const dec = p.decPageRequestId ? decById.get(p.decPageRequestId) : null
    if (dec && dec.status !== 'completed' && !hasDec.has(p.id)) {
      const days = Math.floor((now.getTime() - dec.createdAt.getTime()) / DAY_MS)
      for (const step of [30, 14]) {
        if (days < step) continue
        const made = await ensureFollowUpTask({
          assessmentId: p.assessmentId,
          insuranceId: p.id,
          kind: `dec_page_${step}d`,
          title: `Declarations page from ${p.carrierName} is overdue (${step} days)`,
          notes: `Requested ${dec.createdAt.toLocaleDateString('en-US')}. Resend the secure upload link or escalate to the adjuster's supervisor.`,
          priority: step >= 30 ? 'high' : 'medium',
        })
        if (made) created += 1
        break
      }
    }

    if (p.limitsDemandStatus === 'sent' && p.limitsDemandDeadline) {
      const deadline = new Date(p.limitsDemandDeadline)
      const msLeft = deadline.getTime() - now.getTime()
      if (msLeft < 0) {
        await prisma.insuranceDetail.update({ where: { id: p.id }, data: { limitsDemandStatus: 'expired' } })
        expired += 1
        const made = await ensureFollowUpTask({
          assessmentId: p.assessmentId,
          insuranceId: p.id,
          kind: 'limits_expired',
          title: `Policy-limits demand to ${p.carrierName} expired without acceptance`,
          notes: `The deadline was ${deadline.toLocaleDateString('en-US')}. Document the carrier's failure to tender within the time limit and evaluate an excess / bad-faith claim before the next step.`,
        })
        if (made) created += 1
      } else if (msLeft < 5 * DAY_MS) {
        const made = await ensureFollowUpTask({
          assessmentId: p.assessmentId,
          insuranceId: p.id,
          kind: 'limits_due_soon',
          title: `Policy-limits demand to ${p.carrierName} expires ${deadline.toLocaleDateString('en-US')}`,
          notes: 'Confirm the carrier received the demand and calendar the exact expiry. Do not extend the deadline without a written request from the carrier.',
          dueDate: deadline,
        })
        if (made) created += 1
      }
    }
  }
  return { policies: policies.length, created, expired }
}

// ---------------------------------------------------------------------------
// Coverage stacking vs damages
// ---------------------------------------------------------------------------

export interface CoverageStack {
  liability: number
  umUim: number
  medpay: number
  other: number
  total: number
  specials: number
  future: number
  damagesTotal: number
  gap: number
  damagesSource: 'ledger' | 'intake' | 'none'
  flags: { tone: 'warn' | 'info' | 'ok'; text: string }[]
  insuranceCards: { id: string; originalName: string; createdAt: string }[]
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function computeCoverageStack(assessmentId: string): Promise<CoverageStack> {
  const [policies, summary, assessment, cards] = await Promise.all([
    prisma.insuranceDetail.findMany({ where: { assessmentId } }),
    summarizeDamages(assessmentId),
    prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } }),
    prisma.evidenceFile.findMany({
      where: { assessmentId, subcategory: 'insurance_card' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, originalName: true, createdAt: true },
    }),
  ])

  let liability = 0
  let umUim = 0
  let medpay = 0
  let other = 0
  for (const p of policies) {
    const limit = num(p.policyLimit)
    if (!limit) continue
    const type = p.coverageType || (p.insuredParty === 'client' ? 'other' : 'liability')
    if (type === 'liability' || type === 'umbrella') liability += limit
    else if (type === 'um' || type === 'uim') umUim += limit
    else if (type === 'medpay' || type === 'pip') medpay += limit
    else other += limit
  }

  let specials = summary.totals.specials
  let future = summary.totals.future
  let damagesSource: CoverageStack['damagesSource'] = summary.itemCount ? 'ledger' : 'none'
  if (!summary.itemCount) {
    let facts: any = {}
    try {
      facts = assessment?.facts ? JSON.parse(assessment.facts) : {}
    } catch {
      facts = {}
    }
    const d = facts?.damages || {}
    specials = num(d.med_charges ?? d.medical) + num(d.wage_loss ?? d.lostWages) + num(d.other)
    future = num(d.future_medical ?? d.futureMedical)
    if (specials || future) damagesSource = 'intake'
  }

  const total = liability + umUim + medpay + other
  const damagesTotal = specials + future
  const flags: CoverageStack['flags'] = []
  const hasClientPolicy = policies.some((p) => p.insuredParty === 'client')
  const liabilityPolicies = policies.filter((p) => p.insuredParty !== 'client')

  if (!policies.length) {
    flags.push({ tone: 'warn', text: 'No coverage recorded yet. Recovery is capped by policy limits, so find every policy early.' })
  }
  if (liabilityPolicies.some((p) => !p.policyLimit)) {
    flags.push({ tone: 'warn', text: "A liability policy has no limit recorded. Request the declarations page so you know the ceiling." })
  }
  if (liability > 0 && damagesTotal > liability) {
    flags.push({
      tone: 'warn',
      text: `Underinsured: damages of $${Math.round(damagesTotal).toLocaleString()} exceed liability limits of $${Math.round(liability).toLocaleString()} by $${Math.round(damagesTotal - liability).toLocaleString()}. Put the client's UIM carrier on notice and consider a policy-limits demand.`,
    })
  }
  if (!hasClientPolicy) {
    flags.push({
      tone: cards.length ? 'info' : 'warn',
      text: cards.length
        ? `Your client uploaded an insurance card (${cards[0].originalName}). Add their policy to check for UM/UIM and MedPay.`
        : "No client policy on file. The client's own UM/UIM and MedPay often matter more than the defendant's limits.",
    })
  }
  if (medpay > 0 && summary.medical.outstanding > 0) {
    flags.push({
      tone: 'info',
      text: `MedPay/PIP of $${Math.round(medpay).toLocaleString()} is available and $${Math.round(summary.medical.outstanding).toLocaleString()} in medical bills are outstanding. Submit bills to the MedPay carrier.`,
    })
  }
  if (liability > 0 && damagesTotal >= liability * 0.8 && liabilityPolicies.some((p) => p.liabilityDecision === 'accepted' && !p.limitsDemandSentAt)) {
    flags.push({ tone: 'info', text: 'Liability is accepted and damages are near or above the limits. This is a strong candidate for a time-limited policy-limits demand.' })
  }
  if (!flags.length) flags.push({ tone: 'ok', text: 'Documented coverage exceeds the damages on file.' })

  return {
    liability,
    umUim,
    medpay,
    other,
    total,
    specials,
    future,
    damagesTotal,
    gap: Math.max(0, damagesTotal - total),
    damagesSource,
    flags,
    insuranceCards: cards.map((c) => ({ id: c.id, originalName: c.originalName, createdAt: c.createdAt.toISOString() })),
  }
}

// ---------------------------------------------------------------------------
// Policy-limits demand
// ---------------------------------------------------------------------------

export function limitsDemandBody(
  ctx: LetterContext,
  ins: { carrierName: string; adjusterName?: string | null; claimNumber?: string | null; policyNumber?: string | null; policyLimit?: number | null },
  opts: { deadline: Date; specials: number },
): string {
  const or = (v: string | null | undefined) => (v && v.trim() ? v.trim() : BLANK)
  const limit = ins.policyLimit ? `$${Math.round(ins.policyLimit).toLocaleString()}` : BLANK
  const deadline = opts.deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return [
    ctx.today,
    '',
    ins.carrierName,
    `Attn: ${ins.adjusterName?.trim() || 'Claims Department'}`,
    '',
    'TIME-LIMITED POLICY LIMITS DEMAND',
    `RE: Our client: ${or(ctx.clientName)}`,
    `Your insured: ${BLANK}`,
    `Claim number: ${or(ins.claimNumber)}`,
    `Policy number: ${or(ins.policyNumber)}`,
    `Date of loss: ${or(ctx.dateOfLoss)}`,
    '',
    `Dear ${ins.adjusterName?.trim() || 'Claims Representative'}:`,
    '',
    `On behalf of ${or(ctx.clientName)}, we demand the full policy limits of ${limit} in exchange for a full release of your insured for all claims arising from the incident on ${or(ctx.dateOfLoss)}.`,
    '',
    `Our client's documented special damages to date total $${Math.round(opts.specials).toLocaleString()}, before general damages for pain, suffering, and loss of enjoyment of life. Those damages exceed the available coverage, and liability is reasonably clear.`,
    '',
    'This offer is conditioned on:',
    `- Written acceptance received by our office no later than 5:00 p.m. on ${deadline}.`,
    '- Payment of the full policy limits within 15 days of acceptance.',
    '- A sworn declaration from your insured confirming there is no other insurance that may cover this loss.',
    '',
    `If this offer is not accepted in writing by ${deadline}, it is withdrawn and will not be renewed, and our client will pursue all available remedies, including recovery in excess of the policy limits.`,
    '',
    'Supporting medical records, bills, and documentation are enclosed or have been provided separately.',
    '',
    'Sincerely,',
    '',
    or(ctx.attorneyName),
    or(ctx.firmName),
  ].join('\n')
}

export async function sendLimitsDemand(input: {
  ctx: LetterContext
  insurance: { id: string; carrierName: string; adjusterName: string | null; claimNumber: string | null; assessmentId: string }
  body: string
  delivery: 'email' | 'download'
  recipientEmail: string | null
  deadline: Date
  sentByEmail: string | null
  createdById: string | null
  createdByName: string | null
}) {
  const { ctx, insurance } = input
  const subject = `Time-Limited Policy Limits Demand — ${ctx.clientName || 'our client'}${insurance.claimNumber ? ` — Claim ${insurance.claimNumber}` : ''}`
  const filePath = await renderLetterPdf(ctx, input.body, 'limits-demand')

  let emailed = false
  if (input.delivery === 'email' && input.recipientEmail) {
    emailed = await sendTransactionalEmail({
      to: input.recipientEmail,
      subject,
      body: `Hello ${insurance.adjusterName?.trim() || 'Claims Representative'},\n\nPlease find attached our time-limited policy limits demand for ${ctx.clientName || 'our client'}. The deadline to accept is stated in the letter.\n\n${ctx.attorneyName}\n${ctx.firmName}`,
      attachments: [{ filename: 'Policy-Limits-Demand.pdf', content: fs.readFileSync(filePath), contentType: 'application/pdf' }],
      replyTo: ctx.attorneyEmail || undefined,
      fromName: [ctx.attorneyName, ctx.firmName].filter(Boolean).join(', ') || undefined,
    })
    if (!emailed) throw new Error('The email could not be sent. Try again, or download the letter to send it by certified mail.')
  }

  const letter = await prisma.caseLetter.create({
    data: {
      leadId: ctx.leadId,
      kind: 'limits_demand',
      insuranceDetailId: insurance.id,
      recipientName: insurance.carrierName,
      recipientEmail: emailed ? input.recipientEmail : null,
      deliveredVia: input.delivery,
      subject,
      body: input.body,
      filePath,
      sentByEmail: input.sentByEmail,
    },
  })
  const updated = await prisma.insuranceDetail.update({
    where: { id: insurance.id },
    data: {
      limitsDemandSentAt: new Date(),
      limitsDemandDeadline: input.deadline,
      limitsDemandStatus: 'sent',
      limitsDemandLetterId: letter.id,
    },
  })
  await prisma.insuranceCorrespondence.create({
    data: {
      insuranceDetailId: insurance.id,
      assessmentId: insurance.assessmentId,
      direction: 'outbound',
      channel: emailed ? 'email' : 'letter',
      subject,
      body: `Policy-limits demand ${emailed ? `emailed to ${input.recipientEmail}` : 'downloaded for mail or fax'}. Deadline ${input.deadline.toLocaleDateString('en-US')}.`,
      emailed,
      createdById: input.createdById,
      createdByName: input.createdByName,
    },
  })
  await prisma.caseTask.create({
    data: {
      assessmentId: insurance.assessmentId,
      title: `Policy-limits demand deadline: ${insurance.carrierName}`,
      taskType: 'demand_deadline',
      deadlineType: 'demand',
      dueDate: input.deadline,
      assignedRole: 'attorney',
      priority: 'high',
      notes: 'Record the carrier\'s response on the policy. If the deadline passes without written acceptance, the demand expires automatically.',
      sourceTemplateId: 'insurance-followup',
      sourceTemplateStepId: `insurance-followup:${insurance.id}:limits_deadline:${letter.id}`,
    },
  })
  return { letter, insurance: updated, emailed }
}

// ---------------------------------------------------------------------------
// Adjuster directory
// ---------------------------------------------------------------------------

export interface AdjusterProfile {
  key: string
  name: string | null
  email: string | null
  phone: string | null
  carriers: string[]
  caseCount: number
  avgResponseDays: number | null
  responsesMeasured: number
  unansweredOutreach: number
  liabilityAccepted: number
  liabilityDenied: number
  limitsAccepted: number
  limitsRejected: number
  lastContactAt: string | null
}

export function adjusterKey(p: { adjusterEmail?: string | null; adjusterName?: string | null; carrierName?: string | null }): string | null {
  const email = p.adjusterEmail?.trim().toLowerCase()
  if (email) return email
  const name = p.adjusterName?.trim().toLowerCase()
  if (!name) return null
  return `${name}|${(p.carrierName || '').trim().toLowerCase()}`
}

/** Adjusters across the given cases, with how they have behaved on them. */
export async function buildAdjusterDirectory(assessmentIds: string[], q?: string): Promise<AdjusterProfile[]> {
  if (!assessmentIds.length) return []
  const policies = await prisma.insuranceDetail.findMany({
    where: {
      assessmentId: { in: assessmentIds },
      OR: [{ adjusterEmail: { not: null } }, { adjusterName: { not: null } }],
    },
    select: {
      id: true,
      assessmentId: true,
      carrierName: true,
      adjusterName: true,
      adjusterEmail: true,
      adjusterPhone: true,
      liabilityDecision: true,
      limitsDemandStatus: true,
      updatedAt: true,
    },
  })
  if (!policies.length) return []
  const [thread, letters] = await Promise.all([
    prisma.insuranceCorrespondence.findMany({
      where: { insuranceDetailId: { in: policies.map((p) => p.id) } },
      orderBy: { occurredAt: 'asc' },
      select: { insuranceDetailId: true, direction: true, occurredAt: true },
    }),
    prisma.caseLetter.findMany({
      where: { insuranceDetailId: { in: policies.map((p) => p.id) } },
      select: { insuranceDetailId: true, createdAt: true },
    }),
  ])

  const byPolicy = new Map<string, { direction: string; at: Date }[]>()
  for (const c of thread) {
    const list = byPolicy.get(c.insuranceDetailId) || []
    list.push({ direction: c.direction, at: c.occurredAt })
    byPolicy.set(c.insuranceDetailId, list)
  }
  for (const l of letters) {
    if (!l.insuranceDetailId) continue
    const list = byPolicy.get(l.insuranceDetailId) || []
    list.push({ direction: 'outbound', at: l.createdAt })
    byPolicy.set(l.insuranceDetailId, list)
  }

  const profiles = new Map<string, AdjusterProfile & { _cases: Set<string>; _carriers: Set<string>; _responseMs: number[] }>()
  for (const p of policies) {
    const key = adjusterKey(p)
    if (!key) continue
    let prof = profiles.get(key)
    if (!prof) {
      prof = {
        key,
        name: p.adjusterName,
        email: p.adjusterEmail,
        phone: p.adjusterPhone,
        carriers: [],
        caseCount: 0,
        avgResponseDays: null,
        responsesMeasured: 0,
        unansweredOutreach: 0,
        liabilityAccepted: 0,
        liabilityDenied: 0,
        limitsAccepted: 0,
        limitsRejected: 0,
        lastContactAt: null,
        _cases: new Set(),
        _carriers: new Set(),
        _responseMs: [],
      }
      profiles.set(key, prof)
    }
    prof.name = prof.name || p.adjusterName
    prof.email = prof.email || p.adjusterEmail
    prof.phone = prof.phone || p.adjusterPhone
    prof._cases.add(p.assessmentId)
    if (p.carrierName) prof._carriers.add(p.carrierName)
    if (p.liabilityDecision === 'accepted') prof.liabilityAccepted += 1
    if (p.liabilityDecision === 'denied') prof.liabilityDenied += 1
    if (p.limitsDemandStatus === 'accepted') prof.limitsAccepted += 1
    if (p.limitsDemandStatus === 'rejected' || p.limitsDemandStatus === 'expired') prof.limitsRejected += 1

    // Response time: each outbound touch paired with the first inbound reply after it.
    const events = (byPolicy.get(p.id) || []).sort((a, b) => a.at.getTime() - b.at.getTime())
    let pendingOut: Date | null = null
    for (const e of events) {
      if (e.direction === 'outbound') {
        if (!pendingOut) pendingOut = e.at
      } else if (pendingOut) {
        prof._responseMs.push(e.at.getTime() - pendingOut.getTime())
        pendingOut = null
      }
      const last = prof.lastContactAt ? new Date(prof.lastContactAt) : null
      if (!last || e.at > last) prof.lastContactAt = e.at.toISOString()
    }
    if (pendingOut) prof.unansweredOutreach += 1
  }

  const needle = q?.trim().toLowerCase()
  return [...profiles.values()]
    .map(({ _cases, _carriers, _responseMs, ...rest }) => ({
      ...rest,
      caseCount: _cases.size,
      carriers: [..._carriers],
      responsesMeasured: _responseMs.length,
      avgResponseDays: _responseMs.length
        ? Math.round((_responseMs.reduce((a, b) => a + b, 0) / _responseMs.length / DAY_MS) * 10) / 10
        : null,
    }))
    .filter((p) =>
      !needle ||
      [p.name, p.email, ...p.carriers].some((v) => (v || '').toLowerCase().includes(needle)),
    )
    .sort((a, b) => b.caseCount - a.caseCount || (a.name || '').localeCompare(b.name || ''))
}
