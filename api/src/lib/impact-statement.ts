import { prisma } from './prisma'
import { logger } from './logger'
import { syncWorkflowItemFromTask } from './workflow-step-tasks'

export type JournalEntry = { date: string; level: number; note: string; days?: number; dailyWage?: number }

export type ImpactStatementView = {
  statement: string
  interviewNotes: string | null
  status: 'draft' | 'approved'
  approvedAt: string | null
  approvedByName: string | null
  updatedByName: string | null
  updatedAt: string
} | null

export class ImpactStatementError extends Error {}

const MAX_STATEMENT = 8000
const MAX_NOTES = 8000
const QUOTES = 3

/** "Prepare daily-impact statement" and its variants. */
const PREPARE_TASK = /\b(prepare|draft|write|finali[sz]e|complete)\b.*impact statement/i
/** "Schedule client interview for daily impact statement" and its variants. */
const INTERVIEW_TASK = /interview.*impact statement|impact statement.*interview/i

function parseFacts(raw: unknown): any {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw && typeof raw === 'object' ? raw : {}
}

function journalOf(facts: any): JournalEntry[] {
  const list = Array.isArray(facts?.painJournal) ? facts.painJournal : []
  return list.filter(
    (e: any) => e && typeof e.note === 'string' && e.note.trim() && Number.isFinite(Number(e.level)),
  )
}

function longDate(raw: string): string {
  const d = new Date(raw)
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function clip(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

/**
 * A first draft from what the client logged and what the attorney noted in the
 * interview. Only restates what is there: averages, the worst days in the
 * client's own words, and missed work. The attorney edits it before approving.
 */
export function buildImpactDraft(input: {
  clientName: string | null
  entries: JournalEntry[]
  interviewNotes?: string | null
}): string | null {
  const entries = [...input.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const notes = input.interviewNotes?.trim() || ''
  if (entries.length === 0 && !notes) return null

  const fullName = input.clientName?.trim() || null
  const first = fullName ? fullName.split(/\s+/)[0] : 'our client'
  const intro = fullName ? `Our client, ${fullName},` : 'Our client'
  const paragraphs: string[] = []

  if (entries.length) {
    const levels = entries.map((e) => Math.max(0, Math.min(10, Number(e.level))))
    const avg = Math.round((levels.reduce((s, n) => s + n, 0) / levels.length) * 10) / 10
    const peak = Math.max(...levels)
    const span =
      entries.length > 1
        ? `${entries.length} entries between ${longDate(entries[0].date)} and ${longDate(entries[entries.length - 1].date)}`
        : `an entry on ${longDate(entries[0].date)}`
    paragraphs.push(
      `${intro} kept a daily journal of how these injuries affect everyday life. Across ${span}, ${first} rated the pain at an average of ${avg} out of 10, reaching ${peak} out of 10 on the worst days.`,
    )

    const worst = [...entries]
      .sort((a, b) => Number(b.level) - Number(a.level) || new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, QUOTES)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    paragraphs.push(
      [`In ${first}'s own words:`, ...worst.map((e) => `- ${longDate(e.date)} (pain ${Number(e.level)}/10): "${clip(e.note, 300)}"`)].join(
        '\n',
      ),
    )

    const missed = entries.reduce((s, e) => s + (Number(e.days) > 0 ? Number(e.days) : 0), 0)
    if (missed > 0) {
      paragraphs.push(`The injuries kept ${first} from work for ${missed} day${missed === 1 ? '' : 's'} logged in the journal.`)
    }
  }

  if (notes) paragraphs.push(notes)
  return paragraphs.join('\n\n')
}

function view(row: any): ImpactStatementView {
  if (!row) return null
  return {
    statement: row.statement,
    interviewNotes: row.interviewNotes ?? null,
    status: row.status === 'approved' ? 'approved' : 'draft',
    approvedAt: row.approvedAt ? new Date(row.approvedAt).toISOString() : null,
    approvedByName: row.approvedByName ?? null,
    updatedByName: row.updatedByName ?? null,
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}

export async function getImpactStatement(assessmentId: string): Promise<ImpactStatementView> {
  return view(await prisma.impactStatement.findUnique({ where: { assessmentId } }))
}

/** The approved statement for the demand, or null while it is a draft. */
export async function approvedImpactStatement(assessmentId: string): Promise<string | null> {
  const row = await prisma.impactStatement.findUnique({
    where: { assessmentId },
    select: { status: true, statement: true },
  })
  return row?.status === 'approved' && row.statement.trim() ? row.statement.trim() : null
}

export async function draftImpactStatement(assessmentId: string, interviewNotes?: string | null): Promise<string> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { facts: true, user: { select: { firstName: true, lastName: true } } },
  })
  if (!assessment) throw new ImpactStatementError('Case not found.')
  const clientName = [assessment.user?.firstName, assessment.user?.lastName].filter(Boolean).join(' ') || null
  const draft = buildImpactDraft({
    clientName,
    entries: journalOf(parseFacts(assessment.facts)),
    interviewNotes: typeof interviewNotes === 'string' ? interviewNotes.slice(0, MAX_NOTES) : null,
  })
  if (!draft) {
    throw new ImpactStatementError(
      'Nothing to draft from yet. Ask the client to log entries in their Journal, or add your interview notes first.',
    )
  }
  return draft
}

async function completeTasks(assessmentId: string, matcher: RegExp, note: string): Promise<number> {
  const open = await prisma.caseTask.findMany({
    where: { assessmentId, mergedIntoId: null, status: { in: ['open', 'in_progress'] } },
  })
  let completed = 0
  for (const task of open) {
    if (!matcher.test(String(task.title || ''))) continue
    const updated = await prisma.caseTask.update({
      where: { id: task.id },
      data: { status: 'done', completedAt: new Date(), notes: `${task.notes || ''}\n${note}`.trim() },
    })
    await syncWorkflowItemFromTask(updated).catch(() => undefined)
    completed += 1
  }
  return completed
}

export async function saveImpactStatement(
  assessmentId: string,
  body: { statement?: unknown; interviewNotes?: unknown; approved?: unknown },
  actorName: string | null,
): Promise<{ statement: ImpactStatementView; tasksCompleted: number }> {
  const statement = typeof body.statement === 'string' ? body.statement.trim() : ''
  if (statement.length > MAX_STATEMENT) {
    throw new ImpactStatementError(`Keep the statement under ${MAX_STATEMENT.toLocaleString('en-US')} characters.`)
  }
  const interviewNotes =
    typeof body.interviewNotes === 'string' && body.interviewNotes.trim()
      ? body.interviewNotes.trim().slice(0, MAX_NOTES)
      : null
  const approved = body.approved === true
  if (approved && !statement) throw new ImpactStatementError('Write the statement before approving it.')

  const existing = await prisma.impactStatement.findUnique({ where: { assessmentId } })
  const becameApproved = approved && existing?.status !== 'approved'
  const approval = approved
    ? {
        status: 'approved',
        approvedAt: becameApproved ? new Date() : existing?.approvedAt ?? new Date(),
        approvedByName: becameApproved ? actorName : existing?.approvedByName ?? actorName,
      }
    : { status: 'draft', approvedAt: null, approvedByName: null }
  const row = await prisma.impactStatement.upsert({
    where: { assessmentId },
    create: { assessmentId, statement, interviewNotes, updatedByName: actorName, ...approval },
    update: { statement, interviewNotes, updatedByName: actorName, ...approval },
  })

  const today = new Date().toLocaleDateString('en-US')
  let tasksCompleted = 0
  if (interviewNotes && !existing?.interviewNotes) {
    tasksCompleted += await completeTasks(assessmentId, INTERVIEW_TASK, `Interview notes recorded on ${today}.`)
  }
  if (becameApproved) {
    tasksCompleted += await completeTasks(
      assessmentId,
      PREPARE_TASK,
      `Daily-impact statement approved${actorName ? ` by ${actorName}` : ''} on ${today}.`,
    )
  }
  if (tasksCompleted) logger.info('Impact statement completed tasks', { assessmentId, tasksCompleted })
  return { statement: view(row), tasksCompleted }
}
