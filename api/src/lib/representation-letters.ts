/**
 * Letters of representation: the notice a firm sends an insurance carrier, and
 * each treating provider, once it takes a case.
 *
 * The carrier letter directs all contact to the firm and asks the carrier to
 * confirm coverage and preserve evidence. The provider letter does the same for
 * the medical side and doubles as the records request: it carries a secure link
 * to the client's signed HIPAA authorization and an upload portal for records
 * and itemized bills. Either can go by email (PDF attached) or be downloaded to
 * fax or mail; both count as sent and close the matching case task.
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

export type LetterKind = 'carrier_lor' | 'provider_lor'

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

export interface ProviderLetterInput {
  providerName: string
  includeLop?: boolean
}

export function providerLetterBody(ctx: LetterContext, p: ProviderLetterInput): string {
  const lines = [
    ctx.today,
    '',
    p.providerName,
    'Attn: Medical Records and Billing',
    '',
    `RE: Our client / your patient: ${or(ctx.clientName)}`,
    `Date of birth: ${BLANK}`,
    `Date of injury: ${or(ctx.dateOfLoss)}`,
    '',
    'To the Custodian of Records and Billing Department:',
    '',
    `Please be advised that ${or(ctx.firmName)} represents ${or(ctx.clientName)} for injuries sustained on ${or(ctx.dateOfLoss)}. Our client has signed a HIPAA authorization permitting you to release their records to our office. Please provide:`,
    '',
    `- Complete medical records for all treatment from ${or(ctx.dateOfLoss)} to the present.`,
    '- An itemized billing statement showing dates of service, CPT codes, charges, payments, and adjustments.',
    '',
    'You can view the signed authorization and upload the records securely here:',
    UPLOAD_LINK_TOKEN,
    '',
    'Please direct billing questions to our office and do not refer this account to collections while the claim is pending.',
  ]
  if (p.includeLop) {
    lines.push(
      '',
      `LETTER OF PROTECTION: ${or(ctx.firmName)} agrees to protect your reasonable and necessary charges for treatment related to this incident and to pay them from any settlement or judgment, subject to our client's authorization. Please continue treatment and withhold collection activity. This is not a personal guarantee by the firm.`,
    )
  }
  lines.push('', 'Sincerely,', '', or(ctx.attorneyName), or(ctx.firmName))
  return lines.join('\n')
}

export function countBlanks(body: string): number {
  return (body.match(/_{4,}/g) || []).length
}

async function renderLetterPdf(ctx: LetterContext, body: string, baseName: string): Promise<string> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const filePath = path.join(OUTPUT_DIR, `${baseName}-${ctx.leadId}-${Date.now()}.pdf`)

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 64 })
    const stream = fs.createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.on('error', reject)
    doc.pipe(stream)

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

  await persistUpload(filePath)
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
}

export async function sendCarrierLetter(
  input: DeliveryInput & { insurance: CarrierLetterInput & { id: string } },
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
    const pdf = fs.readFileSync(filePath)
    emailed = await sendTransactionalEmail({
      to: input.recipientEmail,
      subject,
      body: `Hello ${insurance.adjusterName?.trim() || 'Claims Representative'},\n\nPlease find attached our letter of representation for ${ctx.clientName || 'our client'}${insurance.claimNumber ? ` (claim ${insurance.claimNumber})` : ''}. Please direct all communication about this claim to our office.\n\n${ctx.attorneyName}\n${ctx.firmName}`,
      attachments: [{ filename: `Letter-of-Representation-${safeFileName(ctx.clientName)}.pdf`, content: pdf, contentType: 'application/pdf' }],
      replyTo: ctx.attorneyEmail || undefined,
      fromName: [ctx.attorneyName, ctx.firmName].filter(Boolean).join(', ') || undefined,
    })
    if (!emailed) throw new Error('The email could not be sent. Try again, or download the letter to fax it.')
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
    includeLop: boolean
    hipaa: { id: string; signedFilePath: string | null }
    /** Letters are complete once every provider on the case has one. */
    allProviderNames: string[]
  },
): Promise<SendLetterResult> {
  const { ctx } = input
  const secureToken = crypto.randomUUID()
  const uploadLink = webUrl(`/respond/documents/${secureToken}`)
  const request = await prisma.documentRequest.create({
    data: {
      leadId: ctx.leadId,
      attorneyId: input.attorneyId,
      requestedDocs: JSON.stringify(['medical_records', 'medical_bills']),
      customMessage: `Please provide ${ctx.clientName || 'the patient'}'s complete medical records and an itemized billing statement. A signed HIPAA authorization is on file and viewable through this link.`,
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
  const subject = `Letter of Representation and Records Request — ${ctx.clientName || 'our client'}`
  const filePath = await renderLetterPdf(ctx, body, 'lor-provider')

  let emailed = false
  if (input.delivery === 'email' && input.recipientEmail) {
    const attachments: EmailAttachment[] = [
      {
        filename: `Letter-of-Representation-${safeFileName(ctx.clientName)}.pdf`,
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
      body: `To the Custodian of Records,\n\n${ctx.firmName || 'Our office'} represents your patient ${ctx.clientName || ''}. Attached are our letter of representation and the patient's signed HIPAA authorization.\n\nPlease upload the complete medical records and an itemized billing statement through the secure link below.\n\n${ctx.attorneyName}\n${ctx.firmName}`,
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

  let lienHolderId: string | null = null
  if (input.includeLop) {
    const existing = await prisma.lienHolder.findFirst({
      where: { assessmentId: ctx.assessmentId, name: { equals: input.providerName, mode: 'insensitive' } },
      select: { id: true },
    })
    lienHolderId =
      existing?.id ??
      (
        await prisma.lienHolder.create({
          data: {
            assessmentId: ctx.assessmentId,
            name: input.providerName,
            type: 'medical_provider',
            status: 'open',
            notes: `Letter of protection issued ${ctx.today}.`,
          },
        })
      ).id
  }

  const letter = await prisma.caseLetter.create({
    data: {
      leadId: ctx.leadId,
      kind: 'provider_lor',
      caseContactId: input.caseContactId || null,
      providerName: input.providerName,
      documentRequestId: request.id,
      lienHolderId,
      recipientName: input.providerName,
      recipientEmail: emailed ? input.recipientEmail : null,
      deliveredVia: input.delivery,
      includesLop: input.includeLop,
      subject,
      body,
      filePath,
      sentByEmail: input.sentByEmail || null,
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
      `Letters of representation sent to every listed provider (last: ${input.providerName}, ${ctx.today}).`,
    )
  }
  logger.info('Provider letter of representation sent', { leadId: ctx.leadId, letterId: letter.id, via: input.delivery })
  return { letter, emailed, tasksCompleted }
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
  sources: Array<'timeline' | 'intake' | 'contact'>
}

/**
 * Every treating provider on the case: the structured medical timeline, the
 * intake treatment answers, and Contacts entries typed "medical provider",
 * merged by name. Only contacts carry an email.
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
      select: { id: true, firstName: true, lastName: true, companyName: true, email: true, title: true },
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
      return
    }
    byKey.set(key, {
      key,
      name: clean,
      specialty: extra.specialty || null,
      contactId: extra.contactId || null,
      email: extra.email || null,
      sources: [source],
    })
  }

  for (const c of contacts) {
    const name = c.companyName?.trim() || [c.firstName, c.lastName].filter(Boolean).join(' ')
    add(name, 'contact', { contactId: c.id, email: c.email || null, specialty: c.title || null })
  }
  for (const e of entries) add(e.provider, 'timeline', { specialty: e.specialty || null })
  const facts = parseFacts(assessment?.facts)
  for (const t of Array.isArray(facts?.treatment) ? facts.treatment : []) {
    if (typeof t?.provider === 'string') add(t.provider, 'intake')
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
}
