/**
 * Create a plaintiff-facing DocumentRequest and notify the client.
 *
 * Used by the dedicated document-request endpoint and by Case Coach /
 * Case Intelligence "request from client" / "document request" actions so
 * those buttons land in the plaintiff's Requested Documents section instead
 * of only creating an internal CaseTask.
 */
import crypto from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { webUrl } from './app-url'
import { notifyPlaintiffInApp } from './case-notifications'
import { deliverDirectNotification } from './platform-notifications'
import {
  DOCUMENT_REQUEST_LABELS,
  normalizeRequestedDocKeys,
  parseRequestedDocs,
} from './document-request-status'

export type DocumentRequestAttorney = {
  id: string
  name?: string | null
  email?: string | null
}

export type CreatePlaintiffDocumentRequestResult = {
  docRequest: {
    id: string
    leadId: string
    requestedDocs: string
    customMessage: string | null
    uploadLink: string
    status: string
    createdAt: Date
  }
  created: boolean
  docs: string[]
  alreadyRequested: string[]
}

/**
 * Create (or no-op on full overlap) a plaintiff DocumentRequest and notify.
 * Returns `created: false` when every requested key is already in an open request.
 */
export async function createAndNotifyPlaintiffDocumentRequest(params: {
  leadId: string
  assessmentId: string
  attorney: DocumentRequestAttorney
  requestedDocs: string[]
  customMessage?: string | null
  sendUploadLinkOnly?: boolean
  /**
   * Send the plaintiff email/in-app notification. Defaults to true. Set false
   * for silent data migrations (e.g. reconciling orphan tasks on a portal read),
   * where notifying would email the plaintiff about work they've already seen.
   */
  notify?: boolean
}): Promise<CreatePlaintiffDocumentRequestResult> {
  const { leadId, assessmentId, attorney, customMessage, sendUploadLinkOnly, notify } = params
  let docs = sendUploadLinkOnly ? [] : normalizeRequestedDocKeys(params.requestedDocs)
  const alreadyRequested: string[] = []

  if (docs.length) {
    const openRequests = await prisma.documentRequest.findMany({
      where: {
        leadId,
        targetType: 'plaintiff',
        status: { not: 'completed' },
      },
      select: { requestedDocs: true },
    })
    const alreadyOpen = new Set<string>()
    for (const row of openRequests) {
      for (const key of parseRequestedDocs(row.requestedDocs)) alreadyOpen.add(key)
    }
    const fresh = docs.filter((d) => !alreadyOpen.has(d))
    alreadyRequested.push(...docs.filter((d) => alreadyOpen.has(d)))
    docs = fresh
    if (!fresh.length && !sendUploadLinkOnly) {
      // Surface the most recent open request so callers can still link the UI.
      const existing = await prisma.documentRequest.findFirst({
        where: { leadId, targetType: 'plaintiff', status: { not: 'completed' } },
        orderBy: { createdAt: 'desc' },
      })
      if (existing) {
        return {
          docRequest: existing,
          created: false,
          docs: parseRequestedDocs(existing.requestedDocs),
          alreadyRequested,
        }
      }
    }
  }

  const secureToken = crypto.randomUUID()
  const uploadLink = webUrl(`/evidence-upload/${assessmentId}?token=${secureToken}`)

  const docRequest = await prisma.documentRequest.create({
    data: {
      leadId,
      attorneyId: attorney.id,
      requestedDocs: JSON.stringify(docs),
      customMessage: customMessage || null,
      secureToken,
      uploadLink,
      status: 'pending',
      targetType: 'plaintiff',
    },
  })

  await prisma.leadSubmission
    .update({
      where: { id: leadId },
      data: { lastContactAt: new Date() },
    })
    .catch(() => undefined)

  if (notify !== false) {
    await notifyPlaintiffAboutDocumentRequest({
      leadId,
      assessmentId,
      attorney,
      docRequestId: docRequest.id,
      docs,
      customMessage: customMessage || null,
      uploadLink,
    }).catch((error: any) => {
      logger.warn('Document request notify failed', {
        leadId,
        documentRequestId: docRequest.id,
        error: error?.message,
      })
    })
  }

  // A new medical/treatment records request re-opens the Treatment stage: the
  // plaintiff pipeline should move back from Demand to Treatment. Document-request
  // creation otherwise never triggers a stage re-evaluation. Fire-and-forget; the
  // engine only pulls back a not-yet-demanded case (never after a demand is sent).
  const MEDICAL_DOC_KEYS = ['medical_records', 'bills', 'medical_bills', 'medical', 'prior_treatment', 'prior_medical', 'prior_records']
  if (docs.some((d) => MEDICAL_DOC_KEYS.includes(String(d).toLowerCase()))) {
    void import('./case-stage')
      .then(({ syncCaseStage }) => syncCaseStage(assessmentId, { source: 'attorney' }))
      .catch((error: any) =>
        logger.warn('syncCaseStage after medical doc request failed', { assessmentId, error: error?.message }),
      )
  }

  return { docRequest, created: true, docs, alreadyRequested }
}

async function notifyPlaintiffAboutDocumentRequest(params: {
  leadId: string
  assessmentId: string
  attorney: DocumentRequestAttorney
  docRequestId: string
  docs: string[]
  customMessage: string | null
  uploadLink: string
}): Promise<void> {
  const { leadId, assessmentId, attorney, docRequestId, docs, customMessage, uploadLink } = params

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      userId: true,
      facts: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  })

  let plaintiffEmail = assessment?.user?.email || undefined
  if (!plaintiffEmail && assessment?.facts) {
    try {
      const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts
      plaintiffEmail = (facts.plaintiffContext as any)?.email
    } catch {
      /* ignore */
    }
  }

  const attorneyName = attorney.name || 'Your attorney'
  const plaintiffName = assessment?.user?.firstName
    ? `${assessment.user.firstName} ${assessment.user.lastName || ''}`.trim()
    : 'there'
  const docList =
    docs.length > 0
      ? docs.map((d) => `• ${DOCUMENT_REQUEST_LABELS[d] || d.replace(/_/g, ' ')}`).join('\n')
      : '• Any documents you have'
  const inAppMsg = `${attorneyName} has requested the following documents:\n\n${docList}${
    customMessage ? `\n\nMessage from your attorney: ${customMessage}` : ''
  }\n\nUpload here: ${uploadLink}`

  if (assessment?.userId) {
    try {
      let chatRoom = await prisma.chatRoom.findUnique({
        where: {
          userId_attorneyId: { userId: assessment.userId, attorneyId: attorney.id },
        },
        select: { id: true },
      })
      if (!chatRoom) {
        chatRoom = await prisma.chatRoom.create({
          data: {
            userId: assessment.userId,
            attorneyId: attorney.id,
            assessmentId,
          },
          select: { id: true },
        })
      }
      await prisma.message.create({
        data: {
          chatRoomId: chatRoom.id,
          senderId: attorney.id,
          senderType: 'attorney',
          content: inAppMsg,
          messageType: 'text',
        },
      })
      await prisma.chatRoom.update({
        where: { id: chatRoom.id },
        data: { lastMessageAt: new Date() },
      })
    } catch (chatErr: any) {
      logger.error('Failed to create in-app document request message', {
        error: (chatErr as Error).message,
      })
    }

    await notifyPlaintiffInApp({
      userId: assessment.userId,
      recipientEmail: plaintiffEmail,
      attorneyId: attorney.id,
      assessmentId,
      eventType: 'documents_requested',
      subject: `${attorneyName} requested documents`,
      body: docList,
      link: '/dashboard?tab=tasks',
      payload: { leadId, documentRequestId: docRequestId },
    })
  }

  if (plaintiffEmail) {
    const subject = 'Your attorney requested additional documents'
    const message = `Hi ${plaintiffName},\n\n${attorneyName} has requested the following documents to strengthen your case:\n\n${docList}\n\n${
      customMessage ? `Message from your attorney: ${customMessage}\n\n` : ''
    }Best regards,\nClearCaseIQ`
    await deliverDirectNotification({
      type: 'email',
      recipient: plaintiffEmail,
      subject,
      message,
      cta: { label: 'Upload your documents', url: uploadLink },
      userId: assessment?.userId || null,
      assessmentId,
      role: 'plaintiff',
      replyTo: attorney.email || null,
      fromName: attorney.name || null,
      metadata: {
        eventType: 'document_request',
        leadId,
        assessmentId,
        documentRequestId: docRequestId,
        uploadLink,
      },
    })
  }
}

const ORPHAN_DOC_TASK_PREFIXES = ['Request from client:', 'Send document request:'] as const

/** Titles created by Phase-0 coach/gap actions that never opened a DocumentRequest. */
export function isOrphanDocumentRequestTaskTitle(title: string): boolean {
  const t = (title || '').trim()
  return ORPHAN_DOC_TASK_PREFIXES.some((prefix) => t.startsWith(prefix))
}

export function labelFromOrphanDocumentRequestTaskTitle(title: string): string {
  const t = (title || '').trim()
  for (const prefix of ORPHAN_DOC_TASK_PREFIXES) {
    if (t.startsWith(prefix)) return t.slice(prefix.length).trim()
  }
  return t
}

/**
 * Turn leftover client CaseTasks ("Request from client: …") into real
 * DocumentRequests so they appear under Requested Documents. Marks those
 * tasks done so they no longer crowd Your next steps.
 */
export async function reconcileOrphanClientDocumentTasks(params: {
  assessmentId: string
  leadId: string
  attorneyId: string | null
}): Promise<number> {
  const { assessmentId, leadId, attorneyId } = params
  if (!attorneyId) return 0

  const orphanTasks = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      status: 'open',
      assignedRole: { in: ['client', 'plaintiff'] },
      OR: ORPHAN_DOC_TASK_PREFIXES.map((prefix) => ({
        title: { startsWith: prefix },
      })),
    },
    select: { id: true, title: true, notes: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!orphanTasks.length) return 0

  const attorney = await prisma.attorney.findUnique({
    where: { id: attorneyId },
    select: { id: true, name: true, email: true },
  })
  if (!attorney) return 0

  let processed = 0
  for (const task of orphanTasks) {
    const label = labelFromOrphanDocumentRequestTaskTitle(task.title)
    const keys = normalizeRequestedDocKeys([label])
    const requestedDocs = keys.length ? keys : ['other']
    const customMessage =
      keys.length && keys[0] !== 'other'
        ? null
        : `Please provide: ${label}`

    try {
      const result = await createAndNotifyPlaintiffDocumentRequest({
        leadId,
        assessmentId,
        attorney,
        requestedDocs,
        customMessage,
        // Silent migration: these tasks were already visible to the plaintiff, and
        // this runs on their own portal read — don't email them about it.
        notify: false,
      })
      await prisma.caseTask.update({
        where: { id: task.id },
        data: {
          status: 'done',
          completedAt: new Date(),
          notes: [task.notes, `Moved to Requested Documents (${result.docRequest.id}).`]
            .filter(Boolean)
            .join('\n'),
        },
      })
      processed += 1
    } catch (error: any) {
      logger.warn('Failed to reconcile orphan document-request task', {
        taskId: task.id,
        assessmentId,
        error: error?.message,
      })
    }
  }
  return processed
}
