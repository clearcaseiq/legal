/**
 * Lightweight audit log for LLM calls (planning, writing, extraction, etc.).
 * Stores compact summaries — never full PHI dumps or raw prompts with PII.
 */
import { prisma } from './prisma'
import { logger } from './logger'

export type AiRunStatus = 'ok' | 'error' | 'skipped'

export type AiRunKind =
  | 'workflow_adapt'
  | 'coach_narrate'
  | 'intelligent_questions'
  | 'demand_draft'
  | 'other'

export interface RecordAiRunInput {
  kind: AiRunKind | string
  assessmentId?: string | null
  provider?: string | null
  model?: string | null
  status: AiRunStatus
  inputSummary?: Record<string, unknown> | null
  outputSummary?: Record<string, unknown> | null
  error?: string | null
  latencyMs?: number | null
  tokenUsage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  } | null
}

export async function recordAiRun(input: RecordAiRunInput): Promise<string | null> {
  try {
    const row = await (prisma as any).aiRun.create({
      data: {
        kind: String(input.kind),
        assessmentId: input.assessmentId || null,
        provider: input.provider || null,
        model: input.model || null,
        status: input.status,
        inputSummary: input.inputSummary ?? undefined,
        outputSummary: input.outputSummary ?? undefined,
        error: input.error ? String(input.error).slice(0, 4000) : null,
        latencyMs: typeof input.latencyMs === 'number' ? input.latencyMs : null,
        tokenUsage: input.tokenUsage ?? undefined,
      },
      select: { id: true },
    })
    return row.id as string
  } catch (error: any) {
    logger.warn('Failed to record AiRun', {
      kind: input.kind,
      assessmentId: input.assessmentId,
      error: error?.message || String(error),
    })
    return null
  }
}
