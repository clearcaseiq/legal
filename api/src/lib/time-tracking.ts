/**
 * Shared helpers for team time tracking / billing rates.
 *
 * Practice model: contingency-focused. Time is logged for internal
 * profitability, fee petitions, and lien/fee-dispute support — not hourly
 * client invoices. Rates resolve as: per-person override → role default → none.
 * The resolved rate is snapshotted onto each TimeEntry so later rate changes
 * never rewrite history.
 */
import { prisma } from './prisma'

export const TIME_ROLES = [
  { value: 'attorney', label: 'Attorney' },
  { value: 'paralegal', label: 'Paralegal' },
  { value: 'case_manager', label: 'Case manager' },
  { value: 'intake_specialist', label: 'Intake specialist' },
  { value: 'legal_assistant', label: 'Legal assistant' },
  { value: 'demand_writer', label: 'Demand writer' },
  { value: 'billing_admin', label: 'Billing' },
  { value: 'firm_admin', label: 'Firm admin' },
]
export const TIME_ROLE_VALUES = TIME_ROLES.map((r) => r.value)

export const ACTIVITY_TYPES = [
  { value: 'intake', label: 'Intake' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'comms', label: 'Client / party comms' },
  { value: 'records', label: 'Records & evidence' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'court', label: 'Court / filing' },
  { value: 'research', label: 'Research' },
  { value: 'travel', label: 'Travel' },
  { value: 'admin', label: 'Admin' },
  { value: 'general', label: 'General' },
]
export const ACTIVITY_TYPE_VALUES = ACTIVITY_TYPES.map((a) => a.value)

export const TIME_ENTRY_STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'invoiced'] as const

/** Resolve the hourly rate for a worker: person override → role default → null. */
export async function resolveHourlyRate(
  lawFirmId: string,
  who: { firmMemberId?: string | null; role?: string | null }
): Promise<number | null> {
  if (who.firmMemberId) {
    const personal = await (prisma as any).billingRate.findFirst({
      where: { lawFirmId, firmMemberId: who.firmMemberId },
    })
    if (personal) return personal.hourlyRate
  }
  if (who.role) {
    const roleRate = await (prisma as any).billingRate.findFirst({
      where: { lawFirmId, role: who.role },
    })
    if (roleRate) return roleRate.hourlyRate
  }
  return null
}

export function computeAmount(minutes: number, hourlyRate: number | null, billable: boolean): number | null {
  if (!billable || hourlyRate == null || !Number.isFinite(hourlyRate)) return null
  return Math.round((minutes / 60) * hourlyRate * 100) / 100
}

export function serializeTimeEntry(e: any, workerName?: string | null, caseLabel?: string | null) {
  return {
    id: e.id,
    assessmentId: e.assessmentId,
    caseLabel: caseLabel ?? null,
    userId: e.userId,
    firmMemberId: e.firmMemberId,
    attorneyId: e.attorneyId,
    role: e.role,
    workerName: workerName ?? null,
    workDate: e.workDate,
    minutes: e.minutes,
    hours: Math.round((e.minutes / 60) * 100) / 100,
    activityType: e.activityType,
    description: e.description,
    billable: e.billable,
    hourlyRate: e.hourlyRate,
    amount: e.amount,
    status: e.status,
    approvedAt: e.approvedAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}
