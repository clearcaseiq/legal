/**
 * Wire the retainer send → sign → auto-complete path for Sarah Johnson /
 * reed v. Test: enable firm auto-send, ensure Send + Confirm tasks exist.
 *
 * Usage: pnpm exec tsx scripts/setup-reed-retainer-flow.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: false })
const prisma = new PrismaClient()

const AUTO_SEND_KEY = 'autoSendRetainerOnAcquire'
const SEND_TITLE = 'Send retainer to client'
const CONFIRM_TITLE = 'Confirm signed representation agreement'

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

async function ensureTask(
  assessmentId: string,
  title: string,
  opts: { dueInDays: number; notes: string; assigneeName?: string | null; assigneeUserId?: string | null },
) {
  const existing = await prisma.caseTask.findFirst({
    where: {
      assessmentId,
      mergedIntoId: null,
      title: { equals: title, mode: 'insensitive' },
    },
    select: { id: true, status: true },
  })
  if (existing) return { status: 'exists' as const, id: existing.id, taskStatus: existing.status }

  const dueDate = addDays(new Date(), opts.dueInDays)
  const created = await prisma.caseTask.create({
    data: {
      assessmentId,
      title,
      taskType: 'milestone',
      milestoneType: 'case_opening',
      dueDate,
      reminderAt: dueDate,
      priority: 'high',
      escalationLevel: 'warning',
      status: 'open',
      assignedRole: 'attorney',
      assignedTo: opts.assigneeName || null,
      assignedUserId: opts.assigneeUserId || null,
      notes: opts.notes,
      createdByName: 'ClearCaseIQ setup',
    },
  })
  return { status: 'created' as const, id: created.id, taskStatus: created.status }
}

async function main() {
  const attorney = await prisma.attorney.findFirst({
    where: { name: { contains: 'Sarah Johnson', mode: 'insensitive' } },
    include: { lawFirm: true },
  })
  if (!attorney?.lawFirmId) throw new Error('Sarah Johnson (with law firm) not found')

  const assessment = await prisma.assessment.findFirst({
    where: { caseName: { equals: 'reed v. Test', mode: 'insensitive' } },
    include: {
      leadSubmission: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  if (!assessment?.leadSubmission) throw new Error('Case "reed v. Test" not found')

  const lead = assessment.leadSubmission
  const encoded = JSON.stringify(true)
  await (prisma as any).firmSetting.upsert({
    where: { lawFirmId_key: { lawFirmId: attorney.lawFirmId, key: AUTO_SEND_KEY } },
    update: { value: encoded },
    create: { lawFirmId: attorney.lawFirmId, key: AUTO_SEND_KEY, value: encoded },
  })

  // Prefer assigning to Sarah's user account when present.
  const user = attorney.email
    ? await prisma.user.findUnique({ where: { email: attorney.email }, select: { id: true } })
    : null

  const send = await ensureTask(assessment.id, SEND_TITLE, {
    dueInDays: 1,
    assigneeName: attorney.name,
    assigneeUserId: user?.id || null,
    notes:
      'Send the contingency-fee retainer to the client for e-signature (Signatures tab or Firm Templates). Completes when the envelope is sent; Confirm signed completes when the client signs.',
  })
  const confirm = await ensureTask(assessment.id, CONFIRM_TITLE, {
    dueInDays: 2,
    assigneeName: attorney.name,
    assigneeUserId: user?.id || null,
    notes:
      'Auto-completes when the client signs the retainer via e-sign. Complete manually only if the retainer was signed outside ClearCaseIQ.',
  })

  // Also accept the older opening-checklist title if present.
  const altConfirm = await prisma.caseTask.findFirst({
    where: {
      assessmentId: assessment.id,
      mergedIntoId: null,
      title: { equals: 'Confirm signed retainer agreement', mode: 'insensitive' },
    },
    select: { id: true, status: true },
  })

  const templates = await (prisma as any).firmTemplate.findMany({
    where: {
      lawFirmId: attorney.lawFirmId,
      name: { contains: 'Retainer', mode: 'insensitive' },
      isActive: true,
    },
    select: { id: true, name: true, fileName: true, fileMime: true },
  })

  const hasDropbox = Boolean(process.env.DROPBOX_SIGN_API_KEY)
  const hasDocumenso = Boolean(process.env.DOCUMENSO_API_KEY || process.env.DOCUMENSO_API_TOKEN)

  console.log(
    JSON.stringify(
      {
        attorney: { id: attorney.id, name: attorney.name, lawFirmId: attorney.lawFirmId },
        case: {
          assessmentId: assessment.id,
          caseName: assessment.caseName,
          leadId: lead.id,
          status: lead.status,
          client: assessment.user
            ? `${assessment.user.firstName} ${assessment.user.lastName} <${assessment.user.email}>`
            : null,
        },
        firmSetting: { [AUTO_SEND_KEY]: true },
        tasks: { send, confirm, altConfirm },
        retainerTemplates: templates,
        esignConfigured: hasDropbox || hasDocumenso,
        nextStep: hasDropbox || hasDocumenso
          ? 'Open reed v. Test → Signatures → Retainer → Send (or Firm Templates → Contingency Fee / Retainer → Send for signature). When the client signs, Confirm signed auto-completes and the lead becomes retained.'
          : 'Connect Dropbox Sign under Firm Settings → Integrations (set DROPBOX_SIGN_API_KEY), restart API, then send the retainer from Signatures or Firm Templates.',
      },
      null,
      2,
    ),
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
