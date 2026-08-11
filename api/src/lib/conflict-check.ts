/**
 * Preliminary conflict screen against an attorney's existing platform caseload.
 * Used before and after match acquire; also drives auto-completion of related
 * Case Opening / Workflow conflict tasks.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { getHeuristics } from './heuristics-config'
import { syncWorkflowItemFromTask } from './workflow-step-tasks'

export type ConflictPhase = 'pre_acquire' | 'post_acquire'

export type ConflictScreenResult = {
  conflictType: string
  riskLevel: 'low' | 'medium' | 'high'
  details: {
    conflicts: Array<{ type: string; description: string; severity: string }>
    scope: string
    casesScreened: number
    checkedAt: string
    attorneyId: string
    phase: ConflictPhase
  }
}

const CONFLICT_TASK_TITLE_MATCHERS = [
  /complete conflict check/i,
  /open matter.*conflict check/i,
  /^run conflict check$/i,
]

const normalizeName = (value: unknown) => String(value || '').trim().toLowerCase()
const normalizePhone = (value: unknown) => String(value || '').replace(/\D/g, '')

export function extractParties(facts: any) {
  return {
    plaintiffName: normalizeName(facts?.contact?.name || facts?.plaintiff?.name || facts?.name),
    plaintiffEmail: normalizeName(facts?.contact?.email || facts?.email),
    plaintiffPhone: normalizePhone(facts?.contact?.phone || facts?.phone),
    opposingParty: normalizeName(facts?.opposingParty || facts?.defendant?.name || facts?.defendant),
  }
}

export function conflictNeedsAcknowledgment(check: {
  riskLevel?: string | null
  conflictType?: string | null
  acknowledgedAt?: Date | null
  isResolved?: boolean | null
}): boolean {
  if (check.isResolved) return false
  if (check.acknowledgedAt) return false
  const risk = String(check.riskLevel || 'low').toLowerCase()
  const type = String(check.conflictType || 'none').toLowerCase()
  if (type === 'none' || risk === 'low') return false
  return risk === 'medium' || risk === 'high'
}

export async function screenAttorneyConflicts(
  attorneyId: string,
  leadId: string,
  facts: any,
  phase: ConflictPhase = 'pre_acquire',
): Promise<ConflictScreenResult> {
  const conflicts: Array<{ type: string; description: string; severity: string }> = []
  let conflictType = 'none'
  let riskLevel: 'low' | 'medium' | 'high' = 'low'

  const incoming = extractParties(facts)
  const heuristics = await getHeuristics()
  const otherLeads = await prisma.leadSubmission.findMany({
    where: {
      assignedAttorneyId: attorneyId,
      id: { not: leadId },
    },
    include: { assessment: true },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, heuristics.conflictCheck.lookbackCases),
  })

  for (const other of otherLeads) {
    let otherFacts: any = {}
    try {
      otherFacts = JSON.parse(other.assessment?.facts || '{}')
    } catch {
      continue
    }
    const existing = extractParties(otherFacts)

    if (incoming.opposingParty && existing.plaintiffName && incoming.opposingParty === existing.plaintiffName) {
      conflicts.push({
        type: 'opposing_party',
        description: `Opposing party "${facts?.opposingParty || facts?.defendant?.name || facts?.defendant}" matches an existing client on another matter`,
        severity: 'high',
      })
      conflictType = 'adverse'
      riskLevel = 'high'
    }

    const sameEmail = incoming.plaintiffEmail && incoming.plaintiffEmail === existing.plaintiffEmail
    const samePhone = incoming.plaintiffPhone && incoming.plaintiffPhone === existing.plaintiffPhone
    if (sameEmail || samePhone) {
      conflicts.push({
        type: 'duplicate_party',
        description: 'This plaintiff already has another matter assigned to you on the platform',
        severity: 'medium',
      })
      if (conflictType === 'none') {
        conflictType = 'duplicate_party'
        riskLevel = 'medium'
      }
    }
  }

  return {
    conflictType,
    riskLevel,
    details: {
      conflicts,
      scope:
        "Preliminary automated screen against your leads on this platform only. Run your firm's full conflict check before engagement.",
      casesScreened: otherLeads.length,
      checkedAt: new Date().toISOString(),
      attorneyId,
      phase,
    },
  }
}

export async function runAndPersistConflictCheck(params: {
  attorneyId: string
  leadId: string
  phase: ConflictPhase
  facts?: any
}): Promise<{ saved: any; details: ConflictScreenResult }> {
  let facts = params.facts
  if (!facts) {
    const lead = await prisma.leadSubmission.findUnique({
      where: { id: params.leadId },
      include: { assessment: { select: { facts: true } } },
    })
    try {
      facts = JSON.parse(lead?.assessment?.facts || '{}')
    } catch {
      facts = {}
    }
  }

  const details = await screenAttorneyConflicts(params.attorneyId, params.leadId, facts, params.phase)
  const saved = await prisma.conflictCheck.create({
    data: {
      attorneyId: params.attorneyId,
      leadId: params.leadId,
      conflictType: details.conflictType,
      conflictDetails: JSON.stringify(details.details),
      riskLevel: details.riskLevel,
      phase: params.phase,
    },
  })

  // Clear conflict tasks once a screen has run:
  // - post_acquire: always (firm still reviews flagged hits; step = "we ran the screen")
  // - pre_acquire clear: immediately; flagged waits for ack/resolve
  const shouldCompleteTasks =
    params.phase === 'post_acquire' || !conflictNeedsAcknowledgment(saved)
  if (shouldCompleteTasks) {
    const lead = await prisma.leadSubmission.findUnique({
      where: { id: params.leadId },
      select: { assessmentId: true },
    })
    if (lead?.assessmentId) {
      await completeConflictRelatedTasks(lead.assessmentId).catch((e: any) =>
        logger.warn('Failed to complete conflict tasks after screen', { error: e?.message }),
      )
    }
  }

  return { saved, details }
}

export async function acknowledgeConflictCheck(checkId: string): Promise<any> {
  return prisma.conflictCheck.update({
    where: { id: checkId },
    data: { acknowledgedAt: new Date() },
  })
}

export async function getLatestConflictCheck(
  attorneyId: string,
  leadId: string,
  phase?: ConflictPhase,
) {
  return prisma.conflictCheck.findFirst({
    where: {
      attorneyId,
      leadId,
      ...(phase ? { phase } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Mark conflict-related CaseTasks done and mirror onto workflow items.
 */
export async function completeConflictRelatedTasks(assessmentId: string): Promise<number> {
  if (!assessmentId) return 0
  const open = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      status: { in: ['open', 'in_progress'] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      assessmentId: true,
      sourceTemplateStepId: true,
      completedAt: true,
    },
  })

  let completed = 0
  for (const task of open) {
    const title = String(task.title || '')
    if (!CONFLICT_TASK_TITLE_MATCHERS.some((re) => re.test(title))) continue
    const updated = await prisma.caseTask.update({
      where: { id: task.id },
      data: { status: 'done', completedAt: new Date() },
    })
    await syncWorkflowItemFromTask(updated).catch(() => undefined)
    completed += 1
  }
  if (completed) {
    logger.info('Completed conflict-related tasks', { assessmentId, completed })
  }
  return completed
}

export async function resolveConflictCheckAndCompleteTasks(params: {
  checkId: string
  attorneyId: string
  resolutionNotes?: string | null
}) {
  const conflictCheck = await prisma.conflictCheck.findFirst({
    where: { id: params.checkId, attorneyId: params.attorneyId },
  })
  if (!conflictCheck) return null

  const updated = await prisma.conflictCheck.update({
    where: { id: params.checkId },
    data: {
      isResolved: true,
      resolutionNotes: params.resolutionNotes || null,
      resolvedAt: new Date(),
      acknowledgedAt: conflictCheck.acknowledgedAt || new Date(),
    },
  })

  const lead = await prisma.leadSubmission.findUnique({
    where: { id: conflictCheck.leadId },
    select: { assessmentId: true },
  })
  if (lead?.assessmentId) {
    await completeConflictRelatedTasks(lead.assessmentId)
  }
  return updated
}
