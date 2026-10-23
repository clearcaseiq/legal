/**
 * Letters the firm sends once it takes a case: the letter of representation to
 * an insurance carrier, the medical records and billing request to each
 * treating provider, and (separately, attorney-signed) a letter of protection.
 *
 * The carrier letter directs all contact to the firm and asks the carrier to
 * confirm coverage and preserve evidence. The provider request carries a secure
 * link to the client's signed HIPAA authorization and an upload portal for
 * records and itemized bills; its text comes from lib/records-request, which
 * also holds the pre-send checks. Any letter can go by email (PDF attached) or
 * be downloaded to fax or mail; both count as sent.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import PDFDocument from 'pdfkit'
import { prisma } from './prisma'
import { logger } from './logger'
import { persistUpload, ensureLocalCopy } from './object-storage'
import { sendTransactionalEmail, type EmailAttachment } from './claims'
import { webUrl } from './app-url'
import { syncWorkflowItemFromTask } from './workflow-step-tasks'

const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'case-letters')

export const BLANK = '__________'
export const UPLOAD_LINK_TOKEN = '{{records_upload_link}}'

export type LetterKind = 'carrier_lor' | 'provider_lor' | 'provider_lop'

export interface LetterContext {
  leadId: string
  assessmentId: string
  clientName: string
  dateOfLoss: string
  attorneyName: string
  attorneyEmail: string | null
  attorneyPhone: string | null
  firmName: string
  firmAddressLines: string[]
  firmPhone: string | null
  today: string
}

function longDate(value: unknown): string {
  if (!value) return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

function parseFacts(raw: unknown): any {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw)) || {}
  } catch {
    return {}
  }
}

export async function loadLetterContext(leadId: string): Promise<LetterContext | null> {
  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      assessmentId: true,
      assignedAttorney: {
        select: {
          name: true,
          email: true,
          phone: true,
          lawFirm: { select: { name: true, address: true, city: true, state: true, zip: true, phone: true } },
        },
      },
      assessment: {
        select: { facts: true, user: { select: { firstName: true, lastName: true } } },
      },
    },
  })
  if (!lead?.assessmentId) return null
  const facts = parseFacts(lead.assessment?.facts)
  const user = lead.assessment?.user
  const firm = lead.assignedAttorney?.lawFirm
  const cityLine = [firm?.city, [firm?.state, firm?.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return {
    leadId: lead.id,
    assessmentId: lead.assessmentId,
    clientName: [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
    dateOfLoss: longDate(facts?.incident?.date),
    attorneyName: lead.assignedAttorney?.name || '',
    attorneyEmail: lead.assignedAttorney?.email || null,
    attorneyPhone: lead.assignedAttorney?.phone || null,
    firmName: firm?.name || lead.assignedAttorney?.name || '',
    firmAddressLines: [firm?.address, cityLine].filter((s): s is string => Boolean(s && s.trim())),
    firmPhone: firm?.phone || lead.assignedAttorney?.phone || null,
    today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  }
}

const or = (value: string | null | undefined) => (value && value.trim() ? value.trim() : BLANK)

export interface CarrierLetterInput {
  carrierName: string
  adjusterName?: string | null
  claimNumber?: string | null
  policyNumber?: string | null
  insuredParty?: string | null
}

export function carrierLetterBody(ctx: LetterContext, ins: CarrierLetterInput): string {
  const ownPolicy = ins.insuredParty === 'client'
  const lines = [
    ctx.today,
    '',
    ins.carrierName,
    `Attn: ${ins.adjusterName?.trim() || 'Claims Department'}`,
    '',
    `RE: Our client: ${or(ctx.clientName)}`,
    `Claim number: ${or(ins.claimNumber)}`,
    `Policy number: ${or(ins.policyNumber)}`,
    `Date of loss: ${or(ctx.dateOfLoss)}`,
    '',
    `Dear ${ins.adjusterName?.trim() || 'Claims Representative'}:`,
    '',
    `Please be advised that ${or(ctx.firmName)} represents ${or(ctx.clientName)} for injuries and damages arising from the incident on ${or(ctx.dateOfLoss)}. Please direct all communication about this claim to our office, and do not contact our client directly.`,
    '',
    'Please:',
    ownPolicy
      ? '- Confirm in writing all coverage available to our client under this policy, including uninsured/underinsured motorist, medical payments, and personal injury protection benefits and their limits.'
      : '- Confirm in writing the coverage available for this loss, including all applicable policy limits.',
    '- Preserve all evidence related to this incident, including photographs, recorded statements, vehicle and telematics data, and video.',
    '- Send us a copy of any statement our client has given.',
    '',
    "Our client does not consent to a recorded statement, and no medical information about our client may be obtained except through our office.",
    '',
    'Sincerely,',
    '',
    or(ctx.attorneyName),
    or(ctx.firmName),
  ]
  return lines.join('\n')
}

export function countBlanks(body: string): number {
  return (body.match(/_{4,}/g) || []).length
}

function drawWatermark(doc: InstanceType<typeof PDFDocument>, text: string) {
  const { width, height } = doc.page
  const x = doc.x
  const y = doc.y
  doc.save()
  doc.rotate(-35, { origin: [width / 2, height / 2] })
  doc
    .font('Helvetica-Bold')
    .fontSize(54)
    .fillColor('#dc2626')
    .fillOpacity(0.16)
    .text(text, 0, height / 2 - 30, { width, align: 'center', lineBreak: false })
  doc.restore()
  doc.fillOpacity(1)
  doc.x = x
  doc.y = y
}

export async function renderLetterPdf(
  ctx: LetterContext,
  body: string,
  baseName: string,
  opts: { watermark?: string } = {},
): Promise<string> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const filePath = path.join(OUTPUT_DIR, `${baseName}-${ctx.leadId}-${Date.now()}.pdf`)

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 64 })
    const stream = fs.createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.on('error', reject)
    doc.pipe(stream)
    if (opts.watermark) {
      const mark = opts.watermark
      drawWatermark(doc, mark)
      doc.on('pageAdded', () => drawWatermark(doc, mark))
    }

    doc.font('Helvetica-Bold').fontSize(15).fillColor('#0b1220').text(ctx.firmName || ctx.attorneyName)
    const contact = [...ctx.firmAddressLines, [ctx.firmPhone, ctx.attorneyEmail].filter(Boolean).join('  ·  ')]
      .filter(Boolean)
    doc.font('Helvetica').fontSize(9).fillColor('#475569')
    for (const line of contact) doc.text(line)
    doc.moveDown(0.4)
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.75)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke()
    doc.moveDown(1)

    doc.font('Helvetica').fontSize(10.5).fillColor('#111827')
    for (const raw of body.split('\n')) {
      const line = raw.trimEnd()
      if (!line) {
        doc.moveDown(0.6)
      } else if (line.startsWith('- ')) {
        doc.text(`•  ${line.slice(2)}`, { indent: 14 })
      } else {
        doc.text(line)
      }
    }
    doc.end()
  })

  if (!opts.watermark) await persistUpload(filePath)
  return filePath
}

export async function readLetterPdf(filePath: string): Promise<Buffer | null> {
  if (!(await ensureLocalCopy(filePath))) return null
  return fs.readFileSync(filePath)
}

/** The client's most recent signed HIPAA authorization on this case, if any. */
export async function signedHipaaEnvelope(leadId: string) {
  return prisma.documentEnvelope.findFirst({
    where: { leadId, documentType: 'hipaa_authorization', status: 'signed' },
    orderBy: [{ signedAt: 'desc' }, { updatedAt: 'desc' }],
    select: { id: true, signedAt: true, signedFilePath: true },
  })
}

function safeFileName(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'letter'
}

const CARRIER_TASK = /^send letter of representation|send letter of representation \(lor\)/i
const PROVIDER_TASK = /letters? of representation to (medical )?providers|provider (lor|letters? of representation)/i

/** Close the open case task(s) for this kind of letter. Returns how many closed. */
export async function completeLetterTasks(assessmentId: string, kind: LetterKind, note: string): Promise<number> {
  const matcher = kind === 'carrier_lor' ? CARRIER_TASK : PROVIDER_TASK
  const open = await prisma.caseTask.findMany({
    where: { assessmentId, mergedIntoId: null, status: { in: ['open', 'in_progress'] } },
  })
  let completed = 0
  for (const task of open) {
    if (!matcher.test(String(task.title || ''))) continue
    const updated = await prisma.caseTask.update({
      where: { id: task.id },
      data: {
        status: 'done',
        completedAt: new Date(),
        notes: `${task.notes || ''}\n${note}`.trim(),
      },
    })
    await syncWorkflowItemFromTask(updated).catch(() => undefined)
    completed += 1
  }
  return completed
}

export interface SendLetterResult {
  letter: Awaited<ReturnType<typeof prisma.caseLetter.create>>
  emailed: boolean
  tasksCompleted: number
}

interface DeliveryInput {
  ctx: LetterContext
  body: string
  delivery: 'email' | 'download'
  recipientEmail?: string | null
  sentByEmail?: string | null
  audit?: LetterAudit
}

/** Who approved the letter and what the pre-send checks said, stored with it. */
export interface LetterAudit {
  representationBasis: 'signed_retainer' | 'attested' | 'omitted'
  checks: unknown
  acknowledgedWarnings: boolean
  approvedByRole: 'attorney' | 'staff'
}

function auditColumns(input: DeliveryInput) {
  const a = input.audit
  if (!a) return {}
  return {
    representationBasis: a.representationBasis,
    checks: JSON.stringify(a.checks ?? []),
    acknowledgedWarnings: a.acknowledgedWarnings,
    approvedByEmail: input.sentByEmail || null,
    approvedByRole: a.approvedByRole,
  }
}

/** What the adjuster is asked to upload alongside the letter of representation. */
const CARRIER_LOR_REQUESTED_DOCS = ['dec_page', 'recorded_statement', 'property_damage_estimate', 'other']

export async function sendCarrierLetter(
  input: DeliveryInput & {
    insurance: CarrierLetterInput & { id: string; decPageRequestId?: string | null }
    /** The attorney the upload request belongs to; without one no upload link is offered. */
    attorneyId?: string | null
  },
): Promise<SendLetterResult> {
  const { ctx, insurance } = input
  const subject = [
    `Letter of Representation — ${ctx.clientName || 'our client'}`,
    insurance.claimNumber ? `Claim ${insurance.claimNumber}` : null,
  ]
    .filter(Boolean)
    .join(' — ')
  const filePath = await renderLetterPdf(ctx, input.body, 'lor-carrier')

  let emailed = false
  if (input.delivery === 'email' && input.recipientEmail) {
    const secureToken = crypto.randomUUID()
    const uploadLink = input.attorneyId ? webUrl(`/respond/documents/${secureToken}`) : null
    const request = input.attorneyId
      ? await prisma.documentRequest.create({
          data: {
            leadId: ctx.leadId,
            attorneyId: input.attorneyId,
            requestedDocs: JSON.stringify(CARRIER_LOR_REQUESTED_DOCS),
            customMessage: `Please upload the declarations page and any recorded statements, property damage estimates, photos, or other claim documents for ${ctx.clientName || 'our client'}.`,
            secureToken,
            uploadLink: webUrl(`/respond/documents/${secureToken}`),
            status: 'pending',
            targetType: 'opposing_party',
            recipientName: insurance.adjusterName || insurance.carrierName,
            recipientEmail: input.recipientEmail,
            recipientRole: 'insurer',
            origin: 'attorney',
            insuranceDetailId: insurance.id,
          },
        })
      : null

    const pdf = fs.readFileSync(filePath)
    const claimRef = insurance.claimNumber ? ` (claim ${insurance.claimNumber})` : ''
    const uploadAsk = uploadLink
      ? `\n\nPlease upload the declarations page and any recorded statements, property damage estimates or photos for this claim through the secure link below.`
      : ''
    emailed = await sendTransactionalEmail({
      to: input.recipientEmail,
      subject,
      body: `Hello ${insurance.adjusterName?.trim() || 'Claims Representative'},\n\nPlease find attached our letter of representation for ${ctx.clientName || 'our client'}${claimRef}. Please direct all communication about this claim to our office.${uploadAsk}\n\n${ctx.attorneyName}\n${ctx.firmName}`,
      ...(uploadLink ? { cta: { label: 'Upload documents securely', url: uploadLink } } : {}),
      attachments: [{ filename: `Letter-of-Representation-${safeFileName(ctx.clientName)}.pdf`, content: pdf, contentType: 'application/pdf' }],
      replyTo: ctx.attorneyEmail || undefined,
      fromName: [ctx.attorneyName, ctx.firmName].filter(Boolean).join(', ') || undefined,
      fromEmail: ctx.attorneyEmail || undefined,
    })
    if (!emailed) {
      if (request) await prisma.documentRequest.delete({ where: { id: request.id } }).catch(() => undefined)
      throw new Error('The email could not be sent. Try again, or download the letter to fax it.')
    }
    if (request && !insurance.decPageRequestId) {
      await prisma.insuranceDetail
        .update({ where: { id: insurance.id }, data: { decPageRequestId: request.id } })
        .catch(() => undefined)
    }
  }

  const letter = await prisma.caseLetter.create({
    data: {
      leadId: ctx.leadId,
      kind: 'carrier_lor',
      insuranceDetailId: insurance.id,
      recipientName: insurance.carrierName,
      recipientEmail: emailed ? input.recipientEmail : null,
      deliveredVia: input.delivery,
      subject,
      body: input.body,
      filePath,
      sentByEmail: input.sentByEmail || null,
      ...auditColumns(input),
    },
  })
  const how = emailed ? `emailed to ${input.recipientEmail}` : 'downloaded to fax or mail'
  const tasksCompleted = await completeLetterTasks(
    ctx.assessmentId,
    'carrier_lor',
    `Letter of representation to ${insurance.carrierName} ${how} on ${ctx.today}.`,
  )
  logger.info('Carrier letter of representation sent', { leadId: ctx.leadId, letterId: letter.id, via: input.delivery })
  return { letter, emailed, tasksCompleted }
}

export async function sendProviderLetter(
  input: DeliveryInput & {
    attorneyId: string
    providerName: string
    caseContactId?: string | null
    hipaa: { id: string; signedFilePath: string | null }
    request: {
      type: 'records_and_billing' | 'records' | 'billing'
      recordTypes: string[]
      from: string | null
      to: string | null
      subject: string
    }
    /** Letters are complete once every provider on the case has one. */
    allProviderNames: string[]
  },
): Promise<SendLetterResult> {
  const { ctx } = input
  const wantsRecords = input.request.type !== 'billing'
  const wantsBilling = input.request.type !== 'records'
  const asking = [wantsRecords ? 'the requested medical records' : null, wantsBilling ? 'an itemized billing statement' : null]
    .filter(Boolean)
    .join(' and ')
  const secureToken = crypto.randomUUID()
  const uploadLink = webUrl(`/respond/documents/${secureToken}`)
  const request = await prisma.documentRequest.create({
    data: {
      leadId: ctx.leadId,
      attorneyId: input.attorneyId,
      requestedDocs: JSON.stringify([...(wantsRecords ? ['medical_records'] : []), ...(wantsBilling ? ['medical_bills'] : [])]),
      customMessage: `Please provide ${asking} for ${ctx.clientName || 'the patient'}. The patient's signed HIPAA authorization is viewable through this link.`,
      secureToken,
      uploadLink,
      status: 'pending',
      targetType: 'opposing_party',
      recipientName: input.providerName,
      recipientEmail: input.delivery === 'email' ? input.recipientEmail || null : null,
      recipientRole: 'provider',
      caseContactId: input.caseContactId || null,
      origin: 'attorney',
      documentEnvelopeId: input.hipaa.id,
    },
  })

  const body = input.body.split(UPLOAD_LINK_TOKEN).join(uploadLink)
  const subject = input.request.subject
  const filePath = await renderLetterPdf(ctx, body, 'records-request')
  const represented = input.audit ? input.audit.representationBasis !== 'omitted' : false

  let emailed = false
  if (input.delivery === 'email' && input.recipientEmail) {
    const attachments: EmailAttachment[] = [
      {
        filename: `Records-Request-${safeFileName(ctx.clientName)}.pdf`,
        content: fs.readFileSync(filePath),
        contentType: 'application/pdf',
      },
    ]
    if (input.hipaa.signedFilePath && (await ensureLocalCopy(input.hipaa.signedFilePath))) {
      attachments.push({
        filename: `HIPAA-Authorization-${safeFileName(ctx.clientName)}.pdf`,
        content: fs.readFileSync(input.hipaa.signedFilePath),
        contentType: 'application/pdf',
      })
    }
    emailed = await sendTransactionalEmail({
      to: input.recipientEmail,
      subject,
      body: `To the Custodian of Records,\n\n${represented ? `${ctx.firmName || 'Our office'} represents your patient ${ctx.clientName || ''}. ` : ''}Attached are our request for ${asking} for ${ctx.clientName || 'the patient'} and the patient's signed HIPAA authorization.\n\nPlease upload them through the secure link below.\n\n${ctx.attorneyName}\n${ctx.firmName}`,
      cta: { label: 'Upload records securely', url: uploadLink },
      attachments,
      replyTo: ctx.attorneyEmail || undefined,
      fromName: [ctx.attorneyName, ctx.firmName].filter(Boolean).join(', ') || undefined,
    })
    if (!emailed) {
      await prisma.documentRequest.delete({ where: { id: request.id } }).catch(() => undefined)
      throw new Error('The email could not be sent. Try again, or download the letter to fax it.')
    }
  }

  const letter = await prisma.caseLetter.create({
    data: {
      leadId: ctx.leadId,
      kind: 'provider_lor',
      caseContactId: input.caseContactId || null,
      providerName: input.providerName,
      documentRequestId: request.id,
      recipientName: input.providerName,
      recipientEmail: emailed ? input.recipientEmail : null,
      deliveredVia: input.delivery,
      subject,
      body,
      filePath,
      sentByEmail: input.sentByEmail || null,
      requestType: input.request.type,
      recordTypes: JSON.stringify(input.request.recordTypes),
      recordsFrom: input.request.from ? new Date(`${input.request.from}T00:00:00Z`) : null,
      recordsTo: input.request.to ? new Date(`${input.request.to}T00:00:00Z`) : null,
      ...auditColumns(input),
    },
  })

  let tasksCompleted = 0
  const sent = await prisma.caseLetter.findMany({
    where: { leadId: ctx.leadId, kind: 'provider_lor' },
    select: { providerName: true },
  })
  const covered = new Set(sent.map((l) => providerKey(l.providerName || '')))
  if (input.allProviderNames.every((name) => covered.has(providerKey(name)))) {
    tasksCompleted = await completeLetterTasks(
      ctx.assessmentId,
      'provider_lor',
      `Records requests sent to every listed provider (last: ${input.providerName}, ${ctx.today}).`,
    )
  }
  logger.info('Provider records request sent', { leadId: ctx.leadId, letterId: letter.id, via: input.delivery })
  return { letter, emailed, tasksCompleted }
}

/**
 * Issue a letter of protection the attorney has reviewed and signed. Only now
 * does the provider become a lien holder on the case.
 */
export async function sendLetterOfProtection(
  input: DeliveryInput & {
    providerName: string
    caseContactId?: string | null
    signedByName: string
  },
): Promise<SendLetterResult> {
  const { ctx } = input
  const subject = `Letter of Protection — ${ctx.clientName || 'our client'}`
  const filePath = await renderLetterPdf(ctx, input.body, 'letter-of-protection')

  let emailed = false
  if (input.delivery === 'email' && input.recipientEmail) {
    emailed = await sendTransactionalEmail({
      to: input.recipientEmail,
      subject,
      body: `To the Billing Department,\n\nAttached is our signed letter of protection for your patient ${ctx.clientName || ''}. Please keep it with the patient's account and send itemized bills to our office.\n\n${ctx.attorneyName}\n${ctx.firmName}`,
      attachments: [
        { filename: `Letter-of-Protection-${safeFileName(ctx.clientName)}.pdf`, content: fs.readFileSync(filePath), contentType: 'application/pdf' },
      ],
      replyTo: ctx.attorneyEmail || undefined,
      fromName: [ctx.attorneyName, ctx.firmName].filter(Boolean).join(', ') || undefined,
    })
    if (!emailed) throw new Error('The email could not be sent. Try again, or download the letter to fax it.')
  }

  const existing = await prisma.lienHolder.findFirst({
    where: { assessmentId: ctx.assessmentId, name: { equals: input.providerName, mode: 'insensitive' } },
    select: { id: true },
  })
  const note = `Letter of protection signed by ${input.signedByName} and ${emailed ? `emailed to ${input.recipientEmail}` : 'downloaded to fax or mail'} on ${ctx.today}.`
  const lienHolderId = existing
    ? (await prisma.lienHolder.update({ where: { id: existing.id }, data: { notes: note } })).id
    : (
        await prisma.lienHolder.create({
          data: { assessmentId: ctx.assessmentId, name: input.providerName, type: 'medical_provider', status: 'open', notes: note },
        })
      ).id

  const letter = await prisma.caseLetter.create({
    data: {
      leadId: ctx.leadId,
      kind: 'provider_lop',
      caseContactId: input.caseContactId || null,
      providerName: input.providerName,
      lienHolderId,
      recipientName: input.providerName,
      recipientEmail: emailed ? input.recipientEmail : null,
      deliveredVia: input.delivery,
      includesLop: true,
      subject,
      body: input.body,
      filePath,
      sentByEmail: input.sentByEmail || null,
      signedByName: input.signedByName,
      ...auditColumns(input),
    },
  })
  logger.info('Letter of protection issued', { leadId: ctx.leadId, letterId: letter.id, via: input.delivery })
  return { letter, emailed, tasksCompleted: 0 }
}

/** Remind a provider who has not uploaded yet, with the same secure link. */
export async function sendRecordsFollowUp(params: {
  ctx: LetterContext
  letterId: string
  recipientEmail: string
}): Promise<{ followUpCount: number; lastFollowUpAt: Date }> {
  const { ctx } = params
  const letter = await prisma.caseLetter.findFirst({ where: { id: params.letterId, leadId: ctx.leadId, kind: 'provider_lor' } })
  if (!letter?.documentRequestId) throw Object.assign(new Error('Records request not found'), { status: 404 })
  const request = await prisma.documentRequest.findUnique({ where: { id: letter.documentRequestId } })
  if (!request) throw Object.assign(new Error('Records request not found'), { status: 404 })
  if (request.status === 'completed') throw Object.assign(new Error('The provider has already uploaded everything requested.'), { status: 409 })

  const sentOn = letter.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const emailed = await sendTransactionalEmail({
    to: params.recipientEmail,
    subject: `Follow-up: ${letter.subject}`,
    body: `To the Custodian of Records,\n\nWe sent a request on ${sentOn} for records for your patient ${ctx.clientName || ''} and have not received ${request.status === 'partial' ? 'everything requested' : 'them'} yet. The patient's signed authorization and the secure upload page are at the link below. If the records were sent another way, please let us know.\n\n${ctx.attorneyName}\n${ctx.firmName}${ctx.firmPhone ? `\n${ctx.firmPhone}` : ''}`,
    cta: { label: 'Upload records securely', url: request.uploadLink },
    replyTo: ctx.attorneyEmail || undefined,
    fromName: [ctx.attorneyName, ctx.firmName].filter(Boolean).join(', ') || undefined,
  })
  if (!emailed) throw new Error('The follow-up email could not be sent.')
  const now = new Date()
  const updated = await prisma.caseLetter.update({
    where: { id: letter.id },
    data: { followUpCount: { increment: 1 }, lastFollowUpAt: now },
  })
  await prisma.documentRequest.update({ where: { id: request.id }, data: { lastNudgeAt: now } }).catch(() => undefined)
  return { followUpCount: updated.followUpCount, lastFollowUpAt: now }
}

export function providerKey(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export interface CaseProvider {
  key: string
  name: string
  specialty: string | null
  contactId: string | null
  email: string | null
  fax: string | null
  address: string | null
  sources: Array<'timeline' | 'intake' | 'contact'>
}

/**
 * Every treating provider on the case: the structured medical timeline, the
 * intake treatment answers, and Contacts entries typed "medical provider",
 * merged by name. Only contacts carry an email or fax.
 */
export async function listCaseProviders(leadId: string, assessmentId: string): Promise<CaseProvider[]> {
  const [entries, assessment, contacts] = await Promise.all([
    prisma.medicalTreatmentEntry.findMany({
      where: { assessmentId, isFuture: false },
      select: { provider: true, specialty: true },
    }),
    prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } }),
    prisma.caseContact.findMany({
      where: { leadId, contactType: 'medical_provider' },
      select: { id: true, firstName: true, lastName: true, companyName: true, email: true, fax: true, address: true, title: true },
    }),
  ])

  const byKey = new Map<string, CaseProvider>()
  const add = (name: string, source: CaseProvider['sources'][number], extra: Partial<CaseProvider> = {}) => {
    const clean = String(name || '').trim()
    const key = providerKey(clean)
    if (!key || key === 'unknown provider') return
    const existing = byKey.get(key)
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source)
      existing.specialty = existing.specialty || extra.specialty || null
      existing.contactId = existing.contactId || extra.contactId || null
      existing.email = existing.email || extra.email || null
      existing.fax = existing.fax || extra.fax || null
      existing.address = existing.address || extra.address || null
      return
    }
    byKey.set(key, {
      key,
      name: clean,
      specialty: extra.specialty || null,
      contactId: extra.contactId || null,
      email: extra.email || null,
      fax: extra.fax || null,
      address: extra.address || null,
      sources: [source],
    })
  }

  for (const c of contacts) {
    const name = c.companyName?.trim() || [c.firstName, c.lastName].filter(Boolean).join(' ')
    add(name, 'contact', {
      contactId: c.id,
      email: c.email || null,
      fax: c.fax || null,
      address: c.address || null,
      specialty: c.title || null,
    })
  }
  for (const e of entries) add(e.provider, 'timeline', { specialty: e.specialty || null })
  const facts = parseFacts(assessment?.facts)
  for (const t of Array.isArray(facts?.treatment) ? facts.treatment : []) {
    if (typeof t?.provider === 'string') add(t.provider, 'intake')
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
}
