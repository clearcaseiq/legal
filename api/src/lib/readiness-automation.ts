import type { CaseCommandCenter } from './case-command-center'

export type ReadinessAutomationTaskSuggestion = {
  title: string
  priority: 'high' | 'medium' | 'low'
  notes: string
  taskType: string
  checkpointType: string | null
  escalationLevel: 'none' | 'warning' | 'critical'
  dueInDays: number
  remindInDays: number
}

export type ReadinessAutomationReminderSuggestion = {
  category: 'missing_docs' | 'treatment_gap' | 'demand_ready' | 'negotiation'
  message: string
  dueInDays: number
}

export type ReadinessAutomationPlan = {
  tasks: ReadinessAutomationTaskSuggestion[]
  reminders: ReadinessAutomationReminderSuggestion[]
}

function getTaskTiming(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return { dueInDays: 3, remindInDays: 1, escalationLevel: 'warning' as const }
  if (priority === 'medium') return { dueInDays: 5, remindInDays: 2, escalationLevel: 'warning' as const }
  return { dueInDays: 7, remindInDays: 3, escalationLevel: 'none' as const }
}

export function buildReadinessAutomationPlan(summary: CaseCommandCenter): ReadinessAutomationPlan {
  const tasks: ReadinessAutomationTaskSuggestion[] = []
  const reminders: ReadinessAutomationReminderSuggestion[] = []

  for (const item of summary.missingItems.slice(0, 3)) {
    const timing = getTaskTiming(item.priority)
    tasks.push({
      title: `Collect ${item.label}`,
      priority: item.priority,
      notes: `${item.plaintiffReason} Generated from the attorney readiness engine.`,
      taskType: 'checkpoint',
      checkpointType: item.key,
      escalationLevel: timing.escalationLevel,
      dueInDays: timing.dueInDays,
      remindInDays: timing.remindInDays,
    })
  }

  if (summary.missingItems.length > 0) {
    reminders.push({
      category: 'missing_docs',
      message: `[Readiness][missing_docs] ${summary.nextBestAction.title}: ${summary.nextBestAction.detail}`,
      dueInDays: 0,
    })
  }

  if (summary.treatmentMonitor.largestGapDays >= 45) {
    tasks.push({
      title: 'Resolve treatment continuity gap',
      priority: 'high',
      notes: `${summary.treatmentMonitor.status}. ${summary.treatmentMonitor.recommendedAction}`,
      taskType: 'checkpoint',
      checkpointType: 'treatment_gap',
      escalationLevel: 'warning',
      dueInDays: 2,
      remindInDays: 1,
    })
    reminders.push({
      category: 'treatment_gap',
      message: `[Readiness][treatment_gap] ${summary.treatmentMonitor.status}. ${summary.treatmentMonitor.recommendedAction}`,
      dueInDays: 0,
    })
  }

  if (summary.negotiationSummary.eventCount > 0) {
    tasks.push({
      title: 'Review negotiation posture',
      priority: 'medium',
      notes: `${summary.negotiationSummary.posture} ${summary.negotiationSummary.recommendedMove}`,
      taskType: 'negotiation_deadline',
      checkpointType: null,
      escalationLevel: 'warning',
      dueInDays: 2,
      remindInDays: 1,
    })
    reminders.push({
      category: 'negotiation',
      message: `[Readiness][negotiation] ${summary.negotiationSummary.posture} ${summary.negotiationSummary.recommendedMove}`,
      dueInDays: 0,
    })
  }

  if (summary.readiness.score >= 85 || summary.nextBestAction.actionType === 'prepare_demand') {
    tasks.push({
      title: 'Move file into demand drafting',
      priority: 'medium',
      notes: `${summary.readiness.detail} ${summary.nextBestAction.detail}`,
      taskType: 'demand_deadline',
      checkpointType: null,
      escalationLevel: 'warning',
      dueInDays: 2,
      remindInDays: 1,
    })
    reminders.push({
      category: 'demand_ready',
      message: `[Readiness][demand_ready] ${summary.readiness.label}: ${summary.nextBestAction.detail}`,
      dueInDays: 0,
    })
  }

  return { tasks, reminders }
}
