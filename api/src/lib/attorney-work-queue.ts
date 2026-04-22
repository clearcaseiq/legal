type Severity = 'high' | 'medium' | 'low'
type ActionType =
  | 'request_documents'
  | 'send_message'
  | 'schedule_consult'
  | 'open_demand'
  | 'open_negotiation'
  | 'review_task'
  | 'open_lead'

export type LeadDemandReadinessBlocker = {
  key: string
  title: string
  detail: string
  severity: Severity
}

export type LeadDemandReadinessSummary = {
  leadId: string
  assessmentId: string
  score: number
  label: string
  isDemandReady: boolean
  blockerCount: number
  blockers: LeadDemandReadinessBlocker[]
  nextAction: {
    actionType: ActionType
    title: string
    detail: string
    targetSection?: string
    requestedDocs?: string[]
    customMessage?: string
    messageDraft?: string
  }
  overdueTaskCount: number
  dueTodayTaskCount: number
}

export type AttorneyQueueItem = {
  id: string
  leadId: string
  assessmentId: string
  plaintiffName: string
  claimType: string
  title: string
  detail: string
  severity: Severity
  dueAt?: string
  actionType: ActionType
  actionLabel: string
  targetSection?: string
  requestedDocs?: string[]
  customMessage?: string
  messageDraft?: string
  readinessScore: number
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') {
    return (value as T) ?? fallback
  }
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function severityRank(severity: Severity) {
  if (severity === 'high') return 0
  if (severity === 'medium') return 1
  return 2
}

function hoursAgo(date?: Date | string | null) {
  if (!date) return null
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return null
  return Math.floor((Date.now() - value.getTime()) / (1000 * 60 * 60))
}

function daysAgo(date?: Date | string | null) {
  const hours = hoursAgo(date)
  return hours == null ? null : Math.floor(hours / 24)
}

function getTreatmentGapDays(facts: Record<string, any>) {
  const treatment = Array.isArray(facts?.treatment) ? facts.treatment : []
  const sortedDates = treatment
    .map((item: any) => item?.date)
    .filter((value: unknown): value is string => typeof value === 'string' && !Number.isNaN(new Date(value).getTime()))
    .sort()

  let largestGapDays = 0
  for (let index = 1; index < sortedDates.length; index += 1) {
    const previous = new Date(sortedDates[index - 1]).getTime()
    const current = new Date(sortedDates[index]).getTime()
    const gap = Math.floor((current - previous) / (1000 * 60 * 60 * 24))
    largestGapDays = Math.max(largestGapDays, gap)
  }
  return largestGapDays
}

function getPlaintiffName(lead: any) {
  const first = lead?.assessment?.user?.firstName || ''
  const last = lead?.assessment?.user?.lastName || ''
  return `${first} ${last}`.trim() || 'Plaintiff'
}

function buildMissingDocMessage(docLabels: string[]) {
  return `To keep your case moving, please upload ${docLabels.join(', ')}. These items will help us keep reviewing your case and push the next step forward.`
}

export async function buildAttorneyWorkQueue(params: {
  attorneyId: string
  leads: any[]
  upcomingConsults: Array<{ leadId?: string; scheduledAt: string; type: string }>
  messagingByAssessmentId: Record<string, { unreadCount: number; totalCount: number; lastMessageAt?: Date; awaitingReply: boolean }>
  prisma: any
}) {
  const leadIds = params.leads.map((lead) => lead.id)
  const assessmentIds = params.leads.map((lead) => lead.assessmentId).filter(Boolean)

  const [openTasks, pendingDocumentRequests, latestContacts, demandLetters, negotiationEvents] = await Promise.all([
    assessmentIds.length > 0
      ? params.prisma.caseTask.findMany({
          where: {
            assessmentId: { in: assessmentIds },
            status: { not: 'done' },
          },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            assessmentId: true,
            title: true,
            dueDate: true,
            priority: true,
            taskType: true,
            deadlineType: true,
            reminderAt: true,
          },
        })
      : Promise.resolve([]),
    leadIds.length > 0
      ? params.prisma.documentRequest.findMany({
          where: {
            leadId: { in: leadIds },
            attorneyId: params.attorneyId,
            status: 'pending',
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            leadId: true,
            createdAt: true,
            lastNudgeAt: true,
            requestedDocs: true,
            customMessage: true,
          },
        })
      : Promise.resolve([]),
    leadIds.length > 0
      ? params.prisma.leadContact.findMany({
          where: {
            leadId: { in: leadIds },
            attorneyId: params.attorneyId,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            leadId: true,
            createdAt: true,
            completedAt: true,
            contactType: true,
          },
        })
      : Promise.resolve([]),
    assessmentIds.length > 0
      ? params.prisma.demandLetter.findMany({
          where: { assessmentId: { in: assessmentIds } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            assessmentId: true,
            status: true,
            sentAt: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    assessmentIds.length > 0
      ? params.prisma.negotiationEvent.findMany({
          where: { assessmentId: { in: assessmentIds } },
          orderBy: { eventDate: 'desc' },
          select: {
            id: true,
            assessmentId: true,
            eventType: true,
            eventDate: true,
            status: true,
            amount: true,
          },
        })
      : Promise.resolve([]),
  ])

  const tasksByAssessmentId: Record<string, any[]> = {}
  for (const task of openTasks as any[]) {
    tasksByAssessmentId[task.assessmentId] = tasksByAssessmentId[task.assessmentId] || []
    tasksByAssessmentId[task.assessmentId].push(task)
  }

  const latestContactByLeadId: Record<string, any> = {}
  for (const contact of latestContacts as any[]) {
    if (!latestContactByLeadId[contact.leadId]) {
      latestContactByLeadId[contact.leadId] = contact
    }
  }

  const pendingRequestByLeadId: Record<string, any> = {}
  for (const request of pendingDocumentRequests as any[]) {
    if (!pendingRequestByLeadId[request.leadId]) {
      pendingRequestByLeadId[request.leadId] = request
    }
  }

  const latestDemandByAssessmentId: Record<string, any> = {}
  for (const demand of demandLetters as any[]) {
    if (!latestDemandByAssessmentId[demand.assessmentId]) {
      latestDemandByAssessmentId[demand.assessmentId] = demand
    }
  }

  const latestNegotiationByAssessmentId: Record<string, any> = {}
  for (const item of negotiationEvents as any[]) {
    if (!latestNegotiationByAssessmentId[item.assessmentId]) {
      latestNegotiationByAssessmentId[item.assessmentId] = item
    }
  }

  const upcomingConsultByLeadId: Record<string, any> = {}
  for (const consult of params.upcomingConsults as any[]) {
    if (consult.leadId && !upcomingConsultByLeadId[consult.leadId]) {
      upcomingConsultByLeadId[consult.leadId] = consult
    }
  }

  const leadsWithReadiness = params.leads.map((lead) => {
    const facts = parseJson<Record<string, any>>(lead?.assessment?.facts, {})
    const evidenceCategories = new Set(
      ((lead?.assessment?.evidenceFiles as any[]) || []).map((file) => file?.category).filter(Boolean),
    )
    const claimType = String(lead?.assessment?.claimType || '')
    const treatmentGapDays = getTreatmentGapDays(facts)
    const blockers: LeadDemandReadinessBlocker[] = []
    const addBlocker = (blocker: LeadDemandReadinessBlocker) => blockers.push(blocker)

    if (!evidenceCategories.has('medical_records')) {
      addBlocker({
        key: 'medical_records',
        title: 'Medical records missing',
        detail: 'The file still needs medical records before demand posture will feel credible.',
        severity: 'high',
      })
    }
    if (!evidenceCategories.has('bills')) {
      addBlocker({
        key: 'bills',
        title: 'Medical bills missing',
        detail: 'Bills are still missing, which weakens the specials and value story.',
        severity: 'medium',
      })
    }
    if ((claimType === 'auto' || claimType === 'slip_and_fall') && !evidenceCategories.has('police_report')) {
      addBlocker({
        key: 'police_report',
        title: 'Incident report missing',
        detail: 'A police or incident report would strengthen early liability framing.',
        severity: 'high',
      })
    }
    if (!evidenceCategories.has('injury_photos') && !evidenceCategories.has('photos')) {
      addBlocker({
        key: 'injury_photos',
        title: 'Injury photos missing',
        detail: 'Current damages proof would be stronger with injury or damage photos.',
        severity: 'medium',
      })
    }

    const treatment = Array.isArray(facts?.treatment) ? facts.treatment : []
    if (treatment.length === 0) {
      addBlocker({
        key: 'treatment',
        title: 'No treatment documented',
        detail: 'There is no treatment history on file yet, which weakens damages and timeline clarity.',
        severity: 'high',
      })
    } else if (treatmentGapDays >= 45) {
      addBlocker({
        key: 'treatment_gap',
        title: `${treatmentGapDays}-day treatment gap`,
        detail: 'A meaningful treatment gap may become a defense talking point unless it is explained.',
        severity: 'high',
      })
    } else if (treatmentGapDays >= 30) {
      addBlocker({
        key: 'treatment_gap',
        title: `${treatmentGapDays}-day treatment gap`,
        detail: 'A treatment gap is starting to weaken continuity and should be reviewed.',
        severity: 'medium',
      })
    }

    const latestContact = latestContactByLeadId[lead.id]
    const latestContactHours = hoursAgo(latestContact?.completedAt || latestContact?.createdAt)
    const staleContact =
      ['contacted', 'consulted', 'retained'].includes(lead.status || '') &&
      (latestContactHours == null || latestContactHours >= 72)
    if (staleContact) {
      addBlocker({
        key: 'stale_contact',
        title: 'Plaintiff follow-up is stale',
        detail: 'There has not been a recent completed touchpoint on this file, so momentum may be slipping.',
        severity: latestContactHours == null || latestContactHours >= 120 ? 'high' : 'medium',
      })
    }

    const consult = upcomingConsultByLeadId[lead.id]
    if ((lead.status || '') === 'contacted' && !consult) {
      addBlocker({
        key: 'consult',
        title: 'Consultation not scheduled',
        detail: 'The case has been accepted but the next attorney conversation is not on the calendar.',
        severity: 'high',
      })
    }

    const pendingRequest = pendingRequestByLeadId[lead.id]
    const pendingRequestDays = daysAgo(pendingRequest?.lastNudgeAt || pendingRequest?.createdAt)
    if (pendingRequest && pendingRequestDays != null && pendingRequestDays >= 3) {
      addBlocker({
        key: 'pending_doc_request',
        title: 'Document request is still outstanding',
        detail: 'A plaintiff-facing document request has been pending for multiple days and likely needs a nudge.',
        severity: pendingRequestDays >= 7 ? 'high' : 'medium',
      })
    }

    const openTasksForAssessment = tasksByAssessmentId[lead.assessmentId] || []
    const overdueTasks = openTasksForAssessment.filter((task: any) => task.dueDate && new Date(task.dueDate) < new Date())
    const todayTasks = openTasksForAssessment.filter((task: any) => {
      if (!task.dueDate) return false
      const due = new Date(task.dueDate)
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return due >= start && due < end
    })
    if (overdueTasks.length > 0) {
      addBlocker({
        key: 'overdue_task',
        title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`,
        detail: 'This file already has overdue work tracked against it and should be reviewed before new work is added.',
        severity: 'high',
      })
    }

    const demand = latestDemandByAssessmentId[lead.assessmentId]
    const negotiation = latestNegotiationByAssessmentId[lead.assessmentId]
    const hasDemand = Boolean(demand)
    const negotiationAgingDays = daysAgo(negotiation?.eventDate)

    let score = 100
    score -= blockers.reduce((total, blocker) => total + (blocker.severity === 'high' ? 18 : blocker.severity === 'medium' ? 10 : 5), 0)
    score -= overdueTasks.length * 10
    score -= todayTasks.length * 4
    if (hasDemand) score += 6
    if (negotiation) score += 4
    score = clamp(score, 5, 100)

    let label = 'Early file'
    if (score >= 85) label = 'Demand-ready'
    else if (score >= 70) label = 'Nearly demand-ready'
    else if (score >= 50) label = 'File strengthening'

    const sortedBlockers = blockers.sort((left, right) => severityRank(left.severity) - severityRank(right.severity))
    const missingDocKeys = sortedBlockers
      .filter((item) => ['medical_records', 'bills', 'police_report', 'injury_photos'].includes(item.key))
      .map((item) => item.key)

    const docLabels = sortedBlockers
      .filter((item) => ['medical_records', 'bills', 'police_report', 'injury_photos'].includes(item.key))
      .map((item) => item.title.replace(' missing', '').replace('Incident report', 'police report').toLowerCase())

    let nextAction: LeadDemandReadinessSummary['nextAction']
    if (overdueTasks.length > 0) {
      nextAction = {
        actionType: 'review_task',
        title: 'Clear overdue tasks',
        detail: `This file has ${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'} that should be handled first.`,
        targetSection: 'tasks',
      }
    } else if ((lead.status || '') === 'contacted' && !consult) {
      nextAction = {
        actionType: 'schedule_consult',
        title: 'Get the consultation scheduled',
        detail: 'The case has been accepted, but the consult is still not booked.',
        targetSection: 'overview',
      }
    } else if (missingDocKeys.length > 0) {
      nextAction = {
        actionType: 'request_documents',
        title: 'Request the highest-impact documents',
        detail: `The fastest way to strengthen this file is to collect ${docLabels.slice(0, 3).join(', ')}.`,
        targetSection: 'evidence',
        requestedDocs: missingDocKeys.slice(0, 3),
        customMessage: buildMissingDocMessage(docLabels.slice(0, 3)),
      }
    } else if ((params.messagingByAssessmentId[lead.assessmentId]?.awaitingReply || false) === true) {
      nextAction = {
        actionType: 'send_message',
        title: 'Reply to plaintiff update',
        detail: 'There is a plaintiff message awaiting an attorney response.',
        targetSection: 'overview',
        messageDraft: 'Thanks for the update. I reviewed your message and will use it as we move the case to the next step. I will reach out if we need anything else right away.',
      }
    } else if (staleContact) {
      nextAction = {
        actionType: 'send_message',
        title: 'Send a plaintiff follow-up',
        detail: 'A short status update should keep the file moving and reduce drift.',
        targetSection: 'overview',
        messageDraft: 'Just checking in on your case. We are still moving through the next review step, and I wanted to make sure you know what we still need and what comes next.',
      }
    } else if (score >= 75 && ['consulted', 'retained'].includes(lead.status || '') && !hasDemand) {
      nextAction = {
        actionType: 'open_demand',
        title: 'Move this file into demand drafting',
        detail: 'The file is strong enough that the next leverage move is demand preparation.',
        targetSection: 'demand',
      }
    } else if (negotiation && negotiationAgingDays != null && negotiationAgingDays >= 7) {
      nextAction = {
        actionType: 'open_negotiation',
        title: 'Review negotiation follow-up',
        detail: 'There is negotiation activity on file that may need a fresh response.',
        targetSection: 'negotiation',
      }
    } else {
      nextAction = {
        actionType: 'open_lead',
        title: 'Review case workspace',
        detail: 'Open the lead and advance the next case step.',
        targetSection: 'overview',
      }
    }

    const summary: LeadDemandReadinessSummary = {
      leadId: lead.id,
      assessmentId: lead.assessmentId,
      score,
      label,
      isDemandReady: score >= 85 && !hasDemand,
      blockerCount: sortedBlockers.length,
      blockers: sortedBlockers.slice(0, 4),
      nextAction,
      overdueTaskCount: overdueTasks.length,
      dueTodayTaskCount: todayTasks.length,
    }

    return { ...lead, demandReadiness: summary, _pendingRequest: pendingRequest, _consult: consult, _negotiation: negotiation }
  })

  const needsActionToday: AttorneyQueueItem[] = leadsWithReadiness
    .map((lead: any) => {
      const summary = lead.demandReadiness as LeadDemandReadinessSummary
      const plaintiffName = getPlaintiffName(lead)
      const claimType = String(lead?.assessment?.claimType || 'case').replace(/_/g, ' ')
      const consult = lead._consult
      const pendingRequest = lead._pendingRequest
      const negotiation = lead._negotiation
      const hasUnreadReply = params.messagingByAssessmentId[lead.assessmentId]?.awaitingReply

      if (consult) {
        return {
          id: `consult-${lead.id}`,
          leadId: lead.id,
          assessmentId: lead.assessmentId,
          plaintiffName,
          claimType,
          title: 'Consultation scheduled',
          detail: `${plaintiffName} has a ${consult.type} consultation that needs review or prep.`,
          severity: 'high' as Severity,
          dueAt: consult.scheduledAt,
          actionType: 'schedule_consult' as ActionType,
          actionLabel: 'Open consult case',
          targetSection: 'overview',
          readinessScore: summary.score,
        }
      }

      if (summary.overdueTaskCount > 0) {
        return {
          id: `task-${lead.id}`,
          leadId: lead.id,
          assessmentId: lead.assessmentId,
          plaintiffName,
          claimType,
          title: 'Overdue case work',
          detail: `${summary.overdueTaskCount} overdue task${summary.overdueTaskCount === 1 ? '' : 's'} need attention on this file.`,
          severity: 'high' as Severity,
          actionType: 'review_task' as ActionType,
          actionLabel: 'Review tasks',
          targetSection: 'tasks',
          readinessScore: summary.score,
        }
      }

      if (hasUnreadReply) {
        return {
          id: `reply-${lead.id}`,
          leadId: lead.id,
          assessmentId: lead.assessmentId,
          plaintiffName,
          claimType,
          title: 'Plaintiff replied',
          detail: `${plaintiffName} has sent a message that likely needs an attorney response.`,
          severity: 'high' as Severity,
          actionType: 'send_message' as ActionType,
          actionLabel: 'Reply now',
          targetSection: 'overview',
          messageDraft: summary.nextAction.messageDraft,
          readinessScore: summary.score,
        }
      }

      if (summary.nextAction.actionType === 'request_documents') {
        return {
          id: `docs-${lead.id}`,
          leadId: lead.id,
          assessmentId: lead.assessmentId,
          plaintiffName,
          claimType,
          title: 'File is blocked on documents',
          detail: summary.nextAction.detail,
          severity: 'high' as Severity,
          actionType: 'request_documents' as ActionType,
          actionLabel: 'Request docs',
          targetSection: 'evidence',
          requestedDocs: summary.nextAction.requestedDocs,
          customMessage: summary.nextAction.customMessage,
          readinessScore: summary.score,
        }
      }

      if (pendingRequest) {
        return {
          id: `pending-request-${lead.id}`,
          leadId: lead.id,
          assessmentId: lead.assessmentId,
          plaintiffName,
          claimType,
          title: 'Outstanding document request',
          detail: 'A request is still pending and may need a plaintiff follow-up.',
          severity: 'medium' as Severity,
          dueAt: pendingRequest.lastNudgeAt || pendingRequest.createdAt,
          actionType: 'send_message' as ActionType,
          actionLabel: 'Send reminder',
          targetSection: 'overview',
          messageDraft: 'Just following up on the documents we requested. Once they are in, we can keep moving your case to the next step.',
          readinessScore: summary.score,
        }
      }

      if (summary.nextAction.actionType === 'open_demand') {
        return {
          id: `demand-${lead.id}`,
          leadId: lead.id,
          assessmentId: lead.assessmentId,
          plaintiffName,
          claimType,
          title: 'Demand-ready file',
          detail: 'This case looks organized enough to move into demand drafting.',
          severity: 'medium' as Severity,
          actionType: 'open_demand' as ActionType,
          actionLabel: 'Open demand',
          targetSection: 'demand',
          readinessScore: summary.score,
        }
      }

      if (summary.nextAction.actionType === 'open_negotiation' && negotiation) {
        return {
          id: `negotiation-${lead.id}`,
          leadId: lead.id,
          assessmentId: lead.assessmentId,
          plaintiffName,
          claimType,
          title: 'Negotiation follow-up due',
          detail: 'Recent negotiation activity should be reviewed before the file goes stale.',
          severity: 'medium' as Severity,
          dueAt: negotiation.eventDate,
          actionType: 'open_negotiation' as ActionType,
          actionLabel: 'Review negotiation',
          targetSection: 'negotiation',
          readinessScore: summary.score,
        }
      }

      if (summary.nextAction.actionType === 'send_message') {
        return {
          id: `message-${lead.id}`,
          leadId: lead.id,
          assessmentId: lead.assessmentId,
          plaintiffName,
          claimType,
          title: 'Plaintiff follow-up recommended',
          detail: summary.nextAction.detail,
          severity: 'medium' as Severity,
          actionType: 'send_message' as ActionType,
          actionLabel: 'Draft message',
          targetSection: 'overview',
          messageDraft: summary.nextAction.messageDraft,
          readinessScore: summary.score,
        }
      }

      return null
    })
    .filter(Boolean)
    .sort((left: any, right: any) => {
      const severityDelta = severityRank(left.severity) - severityRank(right.severity)
      if (severityDelta !== 0) return severityDelta
      return left.readinessScore - right.readinessScore
    })
    .slice(0, 12) as AttorneyQueueItem[]

  const dailyQueueSummary = {
    total: needsActionToday.length,
    highSeverity: needsActionToday.filter((item) => item.severity === 'high').length,
    mediumSeverity: needsActionToday.filter((item) => item.severity === 'medium').length,
    demandReady: leadsWithReadiness.filter((lead: any) => lead.demandReadiness?.isDemandReady).length,
  }

  return {
    leadsWithReadiness: leadsWithReadiness.map(({ _pendingRequest, _consult, _negotiation, ...lead }) => lead),
    needsActionToday,
    dailyQueueSummary,
  }
}
