/**
 * Default "out-of-the-box" firm workflow blueprint.
 *
 * Firms that never authored a workflow in Firm Dashboard → Workflow used to see an
 * empty Workflow tab on every case (the retention-time `applyFirmWorkflowToCase`
 * no-ops without a firm default). This module ships a sensible standard Personal
 * Injury pipeline and provisions it as the firm's default the first time a case
 * needs one, so the stage-by-stage view is populated automatically. Firm admins
 * can freely edit or replace it afterwards — it's a normal FirmWorkflow row.
 *
 * ai_milestone steps use the real signal keys from workflow-signals.ts
 * (documents_complete | treatment_complete | demand_sent | offer_received |
 * settled); their completion is derived read-only from case data.
 */
import { prisma } from './prisma'
import { logger } from './logger'

type BlueprintStep = {
  title: string
  description?: string
  stepType: 'task' | 'milestone' | 'checkpoint' | 'deadline' | 'document' | 'ai_milestone'
  aiSignal?: string
  assigneeRole?: string
  dueOffsetDays?: number | null
  required?: boolean
}

type BlueprintStage = { name: string; steps: BlueprintStep[] }
type BlueprintPhase = { name: string; key: string; stages: BlueprintStage[] }

export const DEFAULT_PI_WORKFLOW: {
  name: string
  description: string
  practiceArea: string
  phases: BlueprintPhase[]
} = {
  name: 'Standard Personal Injury Workflow',
  description:
    'A firm-standard PI lifecycle from intake through settlement. Auto-provisioned so every retained case has a tracked, stage-by-stage pipeline. Edit or replace it anytime from Firm Dashboard → Workflow.',
  practiceArea: 'Personal Injury',
  phases: [
    {
      name: 'Intake & Setup',
      key: 'intake',
      stages: [
        {
          name: 'Case Opening',
          steps: [
            { title: 'Open matter & run conflict check', stepType: 'task', assigneeRole: 'case_manager', dueOffsetDays: 0, required: true },
            { title: 'Send retainer to client', stepType: 'document', assigneeRole: 'attorney', dueOffsetDays: 1, required: true },
            { title: 'Confirm signed representation agreement', stepType: 'document', assigneeRole: 'attorney', dueOffsetDays: 2, required: true },
            { title: 'Send client welcome packet', stepType: 'task', assigneeRole: 'intake_specialist', dueOffsetDays: 3 },
          ],
        },
        {
          name: 'Records & Claims',
          steps: [
            { title: 'Request police / incident report', stepType: 'task', assigneeRole: 'paralegal', dueOffsetDays: 3 },
            { title: 'Send letters of representation to providers', stepType: 'task', assigneeRole: 'paralegal', dueOffsetDays: 5 },
            { title: 'Open insurance claims (liability + UM/UIM)', stepType: 'task', assigneeRole: 'case_manager', dueOffsetDays: 5, required: true },
          ],
        },
      ],
    },
    {
      name: 'Treatment & Investigation',
      key: 'treatment',
      stages: [
        {
          name: 'Medical Treatment',
          steps: [
            { title: 'Monitor ongoing treatment', stepType: 'checkpoint', assigneeRole: 'case_manager', dueOffsetDays: 30 },
            { title: 'Treatment complete / MMI reached', stepType: 'ai_milestone', aiSignal: 'treatment_complete', dueOffsetDays: null },
          ],
        },
        {
          name: 'Evidence & Records',
          steps: [
            { title: 'Gather photos, witness statements & scene evidence', stepType: 'task', assigneeRole: 'paralegal', dueOffsetDays: 14 },
            { title: 'All medical records & bills received', stepType: 'ai_milestone', aiSignal: 'documents_complete', dueOffsetDays: null },
          ],
        },
      ],
    },
    {
      name: 'Demand Preparation',
      key: 'demand',
      stages: [
        {
          name: 'Demand Package',
          steps: [
            { title: 'Compile special damages summary', stepType: 'task', assigneeRole: 'paralegal', dueOffsetDays: 55 },
            { title: 'Draft demand letter', stepType: 'task', assigneeRole: 'attorney', dueOffsetDays: 60, required: true },
            { title: 'Attorney review & approve demand', stepType: 'milestone', assigneeRole: 'attorney', dueOffsetDays: 63, required: true },
            { title: 'Demand sent to carrier', stepType: 'ai_milestone', aiSignal: 'demand_sent', dueOffsetDays: null },
          ],
        },
      ],
    },
    {
      name: 'Negotiation',
      key: 'negotiation',
      stages: [
        {
          name: 'Negotiation',
          steps: [
            { title: 'Adjuster offer received', stepType: 'ai_milestone', aiSignal: 'offer_received', dueOffsetDays: null },
            { title: 'Evaluate offer vs. case value', stepType: 'task', assigneeRole: 'attorney', dueOffsetDays: 75 },
            { title: 'Counter & negotiate', stepType: 'task', assigneeRole: 'attorney', dueOffsetDays: 80 },
            { title: 'Client approval of settlement terms', stepType: 'milestone', assigneeRole: 'case_manager', dueOffsetDays: 85, required: true },
          ],
        },
      ],
    },
    {
      name: 'Settlement & Closing',
      key: 'settlement',
      stages: [
        {
          name: 'Settlement',
          steps: [
            { title: 'Settlement reached', stepType: 'ai_milestone', aiSignal: 'settled', dueOffsetDays: null },
            { title: 'Execute release & settlement documents', stepType: 'document', assigneeRole: 'paralegal', dueOffsetDays: 95, required: true },
            { title: 'Resolve medical liens', stepType: 'task', assigneeRole: 'case_manager', dueOffsetDays: 105 },
            { title: 'Disburse & send client closing statement', stepType: 'task', assigneeRole: 'case_manager', dueOffsetDays: 115, required: true },
            { title: 'Close matter', stepType: 'milestone', assigneeRole: 'case_manager', dueOffsetDays: 120 },
          ],
        },
      ],
    },
  ],
}

/**
 * Ensure the firm has a default workflow, creating the standard PI blueprint if it
 * doesn't. Returns the default workflow's id (existing or newly created), or null
 * on failure. Idempotent: if a default already exists it is returned unchanged.
 */
export async function ensureDefaultFirmWorkflow(
  lawFirmId: string,
  createdById?: string | null,
): Promise<string | null> {
  if (!lawFirmId) return null

  const existing = await (prisma as any).firmWorkflow
    .findFirst({ where: { lawFirmId, isDefault: true }, select: { id: true } })
    .catch(() => null)
  if (existing) return existing.id

  try {
    const wf = await (prisma as any).firmWorkflow.create({
      data: {
        lawFirmId,
        name: DEFAULT_PI_WORKFLOW.name,
        description: DEFAULT_PI_WORKFLOW.description,
        practiceArea: DEFAULT_PI_WORKFLOW.practiceArea,
        isDefault: true,
        isActive: true,
        createdById: createdById || null,
      },
    })

    // Stages carry a required workflowId plus an optional phaseId, so create the
    // phase first, then its stages (+ nested steps) referencing both.
    for (const [pi, phase] of DEFAULT_PI_WORKFLOW.phases.entries()) {
      const ph = await (prisma as any).firmWorkflowPhase.create({
        data: { workflowId: wf.id, name: phase.name, key: phase.key, sortOrder: pi },
      })
      for (const [si, stage] of phase.stages.entries()) {
        await (prisma as any).firmWorkflowStage.create({
          data: {
            workflowId: wf.id,
            phaseId: ph.id,
            name: stage.name,
            sortOrder: si,
            steps: {
              create: stage.steps.map((step, ti) => ({
                title: step.title,
                description: step.description || null,
                stepType: step.stepType,
                aiSignal: step.aiSignal || null,
                assigneeRole: step.assigneeRole || null,
                dueOffsetDays: step.dueOffsetDays ?? null,
                required: Boolean(step.required),
                sortOrder: ti,
              })),
            },
          },
        })
      }
    }

    logger.info('Provisioned default PI firm workflow', { lawFirmId, workflowId: wf.id })
    return wf.id
  } catch (error: any) {
    // Unique/race safety: fall back to whatever default now exists.
    const now = await (prisma as any).firmWorkflow
      .findFirst({ where: { lawFirmId, isDefault: true }, select: { id: true } })
      .catch(() => null)
    if (now) return now.id
    logger.warn('Failed to provision default firm workflow', { lawFirmId, error: error?.message })
    return null
  }
}
