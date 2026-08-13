/**
 * Propose follow-up CaseTasks from Intelligent Question answers.
 *
 * Rules-first (no LLM on answer save). Proposals are stored as CaseTasks with
 * taskType='proposed' + reviewStatus='pending' until the attorney Accepts
 * (promotes to a live general task) or Declines.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { AI_AUTHOR_NAME } from './ai-author'
import { normalizeTaskTitle, taskWorkAlreadyCovered } from './task-identity'
import {
  applySoleAttorneyAssignee,
  findSoleAttorneyForAssessment,
} from './sole-firm-attorney'

export const QUESTION_PROPOSAL_PREFIX = 'qpropose:'
export const PROPOSED_TASK_TYPE = 'proposed'

const MAX_PENDING_PROPOSALS = 6

export type AnswerCtx = {
  questionKey: string
  questionText: string
  answer: string
  section: string | null
  source: string | null
}

export type TaskProposalView = {
  id: string
  title: string
  notes: string | null
  priority: string
  assignedRole: string | null
  questionKey: string | null
  reason: string | null
  reviewStatus: string | null
  createdAt: string
}

type ProposalDraft = {
  ruleId: string
  questionKey: string
  title: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  assignedRole: string | null
  notes: string
}

function proposalSourceKey(ruleId: string, questionKey: string): string {
  return `${QUESTION_PROPOSAL_PREFIX}${ruleId}:${questionKey}`
}

export function parseProposalQuestionKey(sourceTemplateStepId: string | null | undefined): string | null {
  if (!sourceTemplateStepId?.startsWith(QUESTION_PROPOSAL_PREFIX)) return null
  const rest = sourceTemplateStepId.slice(QUESTION_PROPOSAL_PREFIX.length)
  const colon = rest.indexOf(':')
  if (colon < 0) return null
  return rest.slice(colon + 1) || null
}

function bankIdFromKey(questionKey: string): string {
  // base:<id> or ai:<hash>
  if (questionKey.startsWith('base:')) return questionKey.slice(5)
  return questionKey
}

function yesAnswer(answer: string): boolean {
  return /^(yes|y|yeah|yep|yea|affirmative|correct|true)\b/i.test(answer.trim())
}

function noAnswer(answer: string): boolean {
  return /^(no|n|nope|nah|negative|false|none|n\/a)\b/i.test(answer.trim()) ||
    /\b(don'?t know|do not know|unknown|not sure|unsure|no idea)\b/i.test(answer.trim())
}

function mentions(text: string, re: RegExp): boolean {
  return re.test(text)
}

type Rule = {
  id: string
  match: (ctx: AnswerCtx) => boolean
  title: (ctx: AnswerCtx) => string
  reason: (ctx: AnswerCtx) => string
  priority?: 'high' | 'medium' | 'low'
  assignedRole?: string | null
}

const RULES: Rule[] = [
  {
    id: 'police_report',
    match: (ctx) =>
      mentions(ctx.questionText, /police|incident report|traffic (collision )?report|animal control/i) &&
      (noAnswer(ctx.answer) || mentions(ctx.answer, /\b(no report|not yet|haven'?t|did not|never)\b/i)),
    title: () => 'Request police / incident report',
    reason: () => 'Answer indicates no report is on hand yet.',
    priority: 'high',
    assignedRole: 'paralegal',
  },
  {
    id: 'citation_docs',
    match: (ctx) =>
      (bankIdFromKey(ctx.questionKey).includes('cited') ||
        mentions(ctx.questionText, /\bcited\b|\bticket(ed)?\b/i)) &&
      yesAnswer(ctx.answer),
    title: () => 'Obtain citation / ticket documentation',
    reason: () => 'Plaintiff indicated someone was cited at the scene.',
    priority: 'high',
  },
  {
    id: 'witness_contacts',
    match: (ctx) =>
      mentions(ctx.questionText, /witness|passenger/i) &&
      yesAnswer(ctx.answer),
    title: () => 'Collect witness / passenger contact information',
    reason: () => 'Plaintiff indicated witnesses or passengers were present.',
    priority: 'high',
    assignedRole: 'paralegal',
  },
  {
    id: 'defendant_carrier',
    match: (ctx) =>
      (bankIdFromKey(ctx.questionKey).includes('ins_carrier') ||
        mentions(ctx.questionText, /insurance carrier|claim number|at-fault.*insur/i)) &&
      (noAnswer(ctx.answer) || mentions(ctx.answer, /\b(unknown|not sure|don'?t know)\b/i)),
    title: () => 'Investigate at-fault insurance carrier and claim number',
    reason: () => 'Defendant coverage details are still unknown.',
    priority: 'high',
    assignedRole: 'paralegal',
  },
  {
    id: 'policy_limits',
    match: (ctx) =>
      (bankIdFromKey(ctx.questionKey).includes('ins_limits') ||
        mentions(ctx.questionText, /policy limits/i)) &&
      (noAnswer(ctx.answer) || mentions(ctx.answer, /\b(unknown|not sure|don'?t know|request)\b/i)),
    title: () => 'Request defendant policy limits disclosure',
    reason: () => 'Policy limits are needed to shape demand strategy.',
    priority: 'high',
  },
  {
    id: 'recorded_statement',
    match: (ctx) =>
      mentions(ctx.questionText, /recorded statement|adjuster contacted/i) &&
      yesAnswer(ctx.answer),
    title: () => 'Obtain recorded statement and send insurer cease-contact letter',
    reason: () => 'An adjuster contact / recorded statement was reported.',
    priority: 'high',
  },
  {
    id: 'um_uim_dec_page',
    match: (ctx) =>
      (bankIdFromKey(ctx.questionKey).includes('ins_um') ||
        bankIdFromKey(ctx.questionKey).includes('ins_medpay') ||
        bankIdFromKey(ctx.questionKey).includes('ins_own_declarations') ||
        mentions(ctx.questionText, /UM\/UIM|MedPay|PIP|declarations page/i)) &&
      (yesAnswer(ctx.answer) || mentions(ctx.answer, /\b(yes|can send|have it|attached)\b/i)),
    title: () => 'Collect client auto policy declarations page',
    reason: () => 'First-party coverage / declarations page should be on file.',
    priority: 'medium',
    assignedRole: 'paralegal',
  },
  {
    id: 'mri_followup',
    match: (ctx) =>
      mentions(ctx.questionText, /\bMRI\b|imaging/i) && yesAnswer(ctx.answer),
    title: () => 'Follow up on MRI / imaging and collect results',
    reason: () => 'A doctor recommended or ordered an MRI.',
    priority: 'high',
    assignedRole: 'paralegal',
  },
  {
    id: 'treatment_gap_note',
    match: (ctx) =>
      mentions(ctx.questionText, /gaps in treatment/i) &&
      (yesAnswer(ctx.answer) || mentions(ctx.answer, /\bgap|missed|stopped|paused|broke\b/i)),
    title: () => 'Document treatment gap explanation in medical chronology',
    reason: () => 'Plaintiff reported a treatment gap that defense may attack.',
    priority: 'medium',
  },
  {
    id: 'wage_loss_docs',
    match: (ctx) =>
      mentions(ctx.questionText, /missed work|wage|vacation|sick days|promotions|bonuses/i) &&
      yesAnswer(ctx.answer),
    title: () => 'Request wage-loss documentation from client / employer',
    reason: () => 'Plaintiff reported missed work or related economic loss.',
    priority: 'high',
    assignedRole: 'paralegal',
  },
  {
    id: 'social_media_preserve',
    match: (ctx) =>
      mentions(ctx.questionText, /social media/i) && yesAnswer(ctx.answer),
    title: () => 'Preserve and review plaintiff social media posts about the incident',
    reason: () => 'Plaintiff indicated posts about the incident or injuries.',
    priority: 'medium',
  },
  {
    id: 'prior_counsel',
    match: (ctx) =>
      mentions(ctx.questionText, /other attorney|hired any other attorney|prior attorney/i) &&
      yesAnswer(ctx.answer),
    title: () => 'Obtain prior counsel file and confirm fee / conflict status',
    reason: () => 'Plaintiff spoke with or hired another attorney about this matter.',
    priority: 'high',
  },
  {
    id: 'prior_claims',
    match: (ctx) =>
      mentions(ctx.questionText, /prior accidents|prior injury claims|prior injuries/i) &&
      yesAnswer(ctx.answer),
    title: () => 'Collect prior accident / injury claim history details',
    reason: () => 'Prior claims or injuries were disclosed — document for causation defense.',
    priority: 'medium',
  },
  {
    id: 'bankruptcy',
    match: (ctx) =>
      mentions(ctx.questionText, /bankruptcy/i) && yesAnswer(ctx.answer),
    title: () => 'Confirm bankruptcy status and trustee notice requirements',
    reason: () => 'Bankruptcy may make the claim an estate asset.',
    priority: 'high',
  },
  {
    id: 'surveillance_video',
    match: (ctx) =>
      mentions(ctx.questionText, /surveillance video|incident report from the property/i) &&
      (yesAnswer(ctx.answer) || mentions(ctx.answer, /\b(video|camera|footage|report)\b/i)),
    title: () => 'Send preservation letter for surveillance video / incident report',
    reason: () => 'Property video or report may exist and can be overwritten quickly.',
    priority: 'high',
  },
  {
    id: 'fault_admission',
    match: (ctx) =>
      mentions(ctx.questionText, /admit fault|apologize/i) && yesAnswer(ctx.answer),
    title: () => 'Memorialize at-scene fault admission in liability file',
    reason: () => 'Plaintiff reported an admission or apology at the scene.',
    priority: 'medium',
  },
]

/** Exported for unit tests. */
export function buildProposalDraftsFromAnswers(answers: AnswerCtx[]): ProposalDraft[] {
  const drafts: ProposalDraft[] = []
  const seen = new Set<string>()

  for (const ctx of answers) {
    const answer = String(ctx.answer || '').trim()
    if (!answer) continue
    for (const rule of RULES) {
      if (!rule.match(ctx)) continue
      const sourceKey = proposalSourceKey(rule.id, ctx.questionKey)
      if (seen.has(sourceKey)) continue
      seen.add(sourceKey)
      const title = rule.title(ctx)
      const reason = rule.reason(ctx)
      drafts.push({
        ruleId: rule.id,
        questionKey: ctx.questionKey,
        title,
        reason,
        priority: rule.priority || 'medium',
        assignedRole: rule.assignedRole ?? 'attorney',
        notes: [
          `Suggested from Intelligent Questions.`,
          `Why: ${reason}`,
          `Q: ${ctx.questionText}`,
          `A: ${answer.slice(0, 500)}`,
        ].join('\n'),
      })
    }
  }

  // Prefer high priority, then first-seen order; cap pending creations.
  drafts.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 }
    return rank[a.priority] - rank[b.priority]
  })
  return drafts
}

function toView(row: {
  id: string
  title: string
  notes: string | null
  priority: string
  assignedRole: string | null
  sourceTemplateStepId: string | null
  reviewStatus: string | null
  createdAt: Date
}): TaskProposalView {
  const reasonMatch = String(row.notes || '').match(/^Why:\s*(.+)$/m)
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    priority: row.priority,
    assignedRole: row.assignedRole,
    questionKey: parseProposalQuestionKey(row.sourceTemplateStepId),
    reason: reasonMatch?.[1] || null,
    reviewStatus: row.reviewStatus,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listQuestionTaskProposals(
  assessmentId: string,
  opts?: { includeDeclined?: boolean },
): Promise<TaskProposalView[]> {
  if (!assessmentId) return []
  const rows = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      taskType: PROPOSED_TASK_TYPE,
      sourceTemplateStepId: { startsWith: QUESTION_PROPOSAL_PREFIX },
      ...(opts?.includeDeclined
        ? {}
        : { reviewStatus: 'pending', status: 'open' }),
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      notes: true,
      priority: true,
      assignedRole: true,
      sourceTemplateStepId: true,
      reviewStatus: true,
      createdAt: true,
    },
  })
  // Sort high → medium → low in JS (priority is a string column).
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 }
  rows.sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9))
  return rows
    .filter((r) => opts?.includeDeclined || r.reviewStatus === 'pending')
    .map(toView)
}

/**
 * Idempotently create pending proposal tasks from all saved answers.
 * Skips rules that already have a proposal (any status) or an equivalent open task.
 */
export async function syncQuestionTaskProposals(assessmentId: string): Promise<{
  created: number
  pending: TaskProposalView[]
}> {
  if (!assessmentId) return { created: 0, pending: [] }

  const answers = await prisma.caseQuestionAnswer.findMany({
    where: { assessmentId },
    select: {
      questionKey: true,
      questionText: true,
      answer: true,
      section: true,
      source: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  const ctxs: AnswerCtx[] = answers.map((a) => ({
    questionKey: a.questionKey,
    questionText: a.questionText,
    answer: a.answer,
    section: a.section,
    source: a.source,
  }))

  const drafts = buildProposalDraftsFromAnswers(ctxs)
  if (!drafts.length) {
    return { created: 0, pending: await listQuestionTaskProposals(assessmentId) }
  }

  const existingProposals = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      sourceTemplateStepId: { startsWith: QUESTION_PROPOSAL_PREFIX },
    },
    select: { sourceTemplateStepId: true, reviewStatus: true, status: true, title: true },
  })
  const existingKeys = new Set(
    existingProposals.map((t) => t.sourceTemplateStepId).filter(Boolean) as string[],
  )
  // Declined proposals stay declined — do not recreate.
  const declinedKeys = new Set(
    existingProposals
      .filter((t) => t.reviewStatus === 'declined')
      .map((t) => t.sourceTemplateStepId)
      .filter(Boolean) as string[],
  )

  const openPeers = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      status: { in: ['open', 'in_progress'] },
      NOT: { taskType: PROPOSED_TASK_TYPE, reviewStatus: 'declined' },
    },
    select: { title: true, notes: true, status: true, sourceTemplateStepId: true },
  })

  const pendingCount = existingProposals.filter(
    (t) => t.reviewStatus === 'pending' && t.status === 'open',
  ).length
  let created = 0
  let slots = Math.max(0, MAX_PENDING_PROPOSALS - pendingCount)

  for (const draft of drafts) {
    if (slots <= 0) break
    const key = proposalSourceKey(draft.ruleId, draft.questionKey)
    if (existingKeys.has(key) || declinedKeys.has(key)) continue
    if (
      taskWorkAlreadyCovered(openPeers, {
        title: draft.title,
        notes: draft.notes,
      })
    ) {
      continue
    }
    // Also skip if an accepted/live task already has the same normalized title.
    const titleNorm = normalizeTaskTitle(draft.title)
    if (openPeers.some((p) => normalizeTaskTitle(p.title) === titleNorm)) continue

    await prisma.caseTask.create({
      data: {
        assessmentId,
        title: draft.title,
        taskType: PROPOSED_TASK_TYPE,
        priority: draft.priority,
        status: 'open',
        reviewStatus: 'pending',
        assignedRole: draft.assignedRole,
        assignedTo: null,
        assignedUserId: null,
        notes: draft.notes,
        sourceTemplateStepId: key,
        createdById: null,
        createdByName: AI_AUTHOR_NAME,
        escalationLevel: 'none',
      },
    })
    existingKeys.add(key)
    created++
    slots--
  }

  if (created) {
    logger.info('Created question-answer task proposals', { assessmentId, created })
  }

  return { created, pending: await listQuestionTaskProposals(assessmentId) }
}

export async function acceptQuestionTaskProposal(params: {
  assessmentId: string
  taskId: string
  actor?: { id?: string | null; name?: string | null }
}): Promise<TaskProposalView | null> {
  const task = await prisma.caseTask.findFirst({
    where: {
      id: params.taskId,
      assessmentId: params.assessmentId,
      taskType: PROPOSED_TASK_TYPE,
      reviewStatus: 'pending',
      mergedIntoId: null,
    },
  })
  if (!task) return null

  const sole = await findSoleAttorneyForAssessment(params.assessmentId)
  const assignee = applySoleAttorneyAssignee(
    {
      assignedRole: task.assignedRole || 'attorney',
      assignedTo: null,
      assignedUserId: null,
    },
    sole,
  )

  const updated = await prisma.caseTask.update({
    where: { id: task.id },
    data: {
      taskType: 'general',
      reviewStatus: 'approved',
      reviewedAt: new Date(),
      reviewedById: params.actor?.id || null,
      reviewedByName: params.actor?.name || null,
      assignedRole: assignee.assignedRole,
      assignedTo: assignee.assignedTo,
      assignedUserId: assignee.assignedUserId,
      // Keep source key for idempotency / provenance.
    },
    select: {
      id: true,
      title: true,
      notes: true,
      priority: true,
      assignedRole: true,
      sourceTemplateStepId: true,
      reviewStatus: true,
      createdAt: true,
    },
  })

  return toView(updated)
}

export async function declineQuestionTaskProposal(params: {
  assessmentId: string
  taskId: string
  actor?: { id?: string | null; name?: string | null }
}): Promise<TaskProposalView | null> {
  const task = await prisma.caseTask.findFirst({
    where: {
      id: params.taskId,
      assessmentId: params.assessmentId,
      taskType: PROPOSED_TASK_TYPE,
      reviewStatus: 'pending',
      mergedIntoId: null,
    },
  })
  if (!task) return null

  const updated = await prisma.caseTask.update({
    where: { id: task.id },
    data: {
      reviewStatus: 'declined',
      status: 'done',
      completedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: params.actor?.id || null,
      reviewedByName: params.actor?.name || null,
    },
    select: {
      id: true,
      title: true,
      notes: true,
      priority: true,
      assignedRole: true,
      sourceTemplateStepId: true,
      reviewStatus: true,
      createdAt: true,
    },
  })

  return toView(updated)
}

/** Hide pending/declined proposals from the normal Tasks work queue. */
export function isHiddenQuestionProposal(task: {
  taskType?: string | null
  reviewStatus?: string | null
  sourceTemplateStepId?: string | null
}): boolean {
  if (task.taskType !== PROPOSED_TASK_TYPE) return false
  if (!String(task.sourceTemplateStepId || '').startsWith(QUESTION_PROPOSAL_PREFIX)) return false
  return task.reviewStatus === 'pending' || task.reviewStatus === 'declined'
}
