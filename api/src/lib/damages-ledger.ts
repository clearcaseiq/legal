/**
 * Structured damages ledger — rollups + write-through.
 *
 * `DamageItem` rows are the auditable source of truth for the plaintiff's
 * economic picture. To avoid rewiring the valuation, demand, and settlement
 * engines (which all read `facts.damages.{medical,lostWages,other}`), we WRITE
 * THROUGH the ledger rollups into `facts.damages` on every change. The ledger,
 * when it has items, is authoritative for those fields.
 */
import { prisma } from './prisma'
import { tryUpdateCaseFacts } from './case-facts'

export const DAMAGE_CATEGORIES = [
  'medical',
  'future_medical',
  'lost_wages',
  'lost_earning_capacity',
  'property_damage',
  'out_of_pocket',
  'future_cost',
  'other',
] as const
export type DamageCategory = (typeof DAMAGE_CATEGORIES)[number]

export const MEDICAL_BILLING_STATUSES = ['billed', 'paid', 'outstanding', 'reduced', 'written_off'] as const
export const MEDICAL_PAYERS = ['health_insurance', 'medpay', 'medicare', 'medicaid', 'patient', 'lien', 'other'] as const

/**
 * How past medical specials are measured in the case totals and the demand.
 * `billed` claims the full charges. `paid_or_owed` claims what was paid plus
 * what is still owed, the measure California (Howell v. Hamilton Meats) and a
 * number of other states apply to past medical expenses.
 */
export const MEDICAL_SPECIALS_MEASURES = ['billed', 'paid_or_owed'] as const
export type MedicalSpecialsMeasure = (typeof MEDICAL_SPECIALS_MEASURES)[number]

export function medicalMeasureOf(facts: any): MedicalSpecialsMeasure {
  return facts?.damages?.medicalSpecialsMeasure === 'paid_or_owed' ? 'paid_or_owed' : 'billed'
}

export interface ChargeBreakdown {
  billed: number
  paid: number
  adjusted: number
  balance: number
  paidOrOwed: number
}

/**
 * One medical charge broken down. Lines entered before payments were tracked
 * only have a status, so a "paid" line counts as paid in full and anything
 * else as still owed.
 */
export function chargeBreakdown(item: {
  amount?: unknown
  paidAmount?: unknown
  adjustedAmount?: unknown
  billingStatus?: string | null
}): ChargeBreakdown {
  const billed = Math.max(0, n(item.amount))
  const status = String(item.billingStatus || '').toLowerCase()
  const paid = item.paidAmount != null ? Math.max(0, n(item.paidAmount)) : status === 'paid' ? billed : 0
  const adjusted = Math.max(0, n(item.adjustedAmount))
  const balance = Math.max(0, billed - paid - adjusted)
  return { billed, paid, adjusted, balance, paidOrOwed: Math.min(billed, paid + balance) }
}

/** The figure a medical charge contributes to the claim under the case's measure. */
export function claimedChargeAmount(item: Parameters<typeof chargeBreakdown>[0], measure: MedicalSpecialsMeasure): number {
  const b = chargeBreakdown(item)
  return measure === 'paid_or_owed' ? b.paidOrOwed : b.billed
}

export interface DamagesSummary {
  medical: {
    billed: number
    paid: number
    outstanding: number
    incurred: number
    adjusted: number
    paidOrOwed: number
    /** What the case claims for past medical under `measure`. */
    claimed: number
  }
  measure: MedicalSpecialsMeasure
  futureMedical: number
  lostWages: number
  lostEarningCapacity: number
  propertyDamage: number
  outOfPocket: number
  futureCost: number
  other: number
  totals: { specials: number; future: number; grand: number }
  // How the rollup maps onto the legacy facts.damages fields the engines read.
  factsDamages: { medical: number; futureMedical: number; lostWages: number; other: number }
  itemCount: number
}

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function emptySummary(measure: MedicalSpecialsMeasure = 'billed'): DamagesSummary {
  return {
    medical: { billed: 0, paid: 0, outstanding: 0, incurred: 0, adjusted: 0, paidOrOwed: 0, claimed: 0 },
    measure,
    futureMedical: 0,
    lostWages: 0,
    lostEarningCapacity: 0,
    propertyDamage: 0,
    outOfPocket: 0,
    futureCost: 0,
    other: 0,
    totals: { specials: 0, future: 0, grand: 0 },
    factsDamages: { medical: 0, futureMedical: 0, lostWages: 0, other: 0 },
    itemCount: 0,
  }
}

/** The measure the case has chosen for past medical specials. */
export async function caseMedicalMeasure(assessmentId: string): Promise<MedicalSpecialsMeasure> {
  const row = await prisma.assessment
    .findUnique({ where: { id: assessmentId }, select: { facts: true } })
    .catch(() => null)
  if (!row?.facts) return 'billed'
  try {
    return medicalMeasureOf(typeof row.facts === 'string' ? JSON.parse(row.facts) : row.facts)
  } catch {
    return 'billed'
  }
}

/** Aggregate the ledger for one case. */
export async function summarizeDamages(assessmentId: string): Promise<DamagesSummary> {
  const [items, measure] = await Promise.all([
    (prisma as any).damageItem.findMany({ where: { assessmentId } }).catch(() => [] as any[]),
    caseMedicalMeasure(assessmentId),
  ])
  return summarizeDamageItems(items as any[], measure)
}

export function summarizeDamageItems(items: any[], measure: MedicalSpecialsMeasure = 'billed'): DamagesSummary {
  const s = emptySummary(measure)
  s.itemCount = items.length
  if (items.length === 0) return s

  for (const it of items) {
    const amt = n(it.amount)
    switch (it.category) {
      case 'medical': {
        const b = chargeBreakdown(it)
        s.medical.incurred += b.billed
        s.medical.billed += b.billed
        s.medical.paid += b.paid
        s.medical.adjusted += b.adjusted
        s.medical.outstanding += b.balance
        s.medical.paidOrOwed += b.paidOrOwed
        break
      }
      case 'future_medical':
        s.futureMedical += amt
        break
      case 'lost_wages':
        s.lostWages += amt
        break
      case 'lost_earning_capacity':
        s.lostEarningCapacity += amt
        break
      case 'property_damage':
        s.propertyDamage += amt
        break
      case 'out_of_pocket':
        s.outOfPocket += amt
        break
      case 'future_cost':
        s.futureCost += amt
        break
      default:
        s.other += amt
        break
    }
  }

  s.medical.claimed = measure === 'paid_or_owed' ? s.medical.paidOrOwed : s.medical.billed
  const specials = s.medical.claimed + s.lostWages + s.propertyDamage + s.outOfPocket + s.other
  const future = s.futureMedical + s.lostEarningCapacity + s.futureCost
  s.totals = { specials, future, grand: specials + future }

  // Legacy engine mapping: medical specials, future medical, wage loss, and a
  // catch-all "other" that bundles property, OOP, future costs, earning capacity.
  s.factsDamages = {
    medical: s.medical.claimed,
    futureMedical: s.futureMedical,
    lostWages: s.lostWages,
    other: s.propertyDamage + s.outOfPocket + s.futureCost + s.lostEarningCapacity + s.other,
  }
  return s
}

/**
 * Recompute the ledger and write the rollups through to `facts.damages` so the
 * valuation / demand / settlement engines see the structured numbers. No-op on
 * facts when the ledger is empty (never clobbers manually-entered facts with
 * zeros). Records a change-feed event. Returns the summary. Never throws.
 */
export async function writeThroughDamages(
  assessmentId: string,
  opts?: { source?: 'attorney' | 'rose_ai' | 'system'; actorId?: string | null },
): Promise<DamagesSummary> {
  const summary = await summarizeDamages(assessmentId)
  if (summary.itemCount === 0) return summary

  await tryUpdateCaseFacts({
    assessmentId,
    source: opts?.source ?? 'attorney',
    action: 'damages_updated',
    entityType: 'damages',
    summary: `Damages ledger updated (specials ${Math.round(summary.totals.specials)}, future ${Math.round(summary.totals.future)})`,
    actor: { type: opts?.source === 'rose_ai' ? 'ai' : 'user', id: opts?.actorId ?? null },
    mutate: (facts) => {
      const existingDamages = facts.damages && typeof facts.damages === 'object' ? facts.damages : {}
      return {
        ...facts,
        damages: {
          ...existingDamages,
          medical: summary.factsDamages.medical,
          futureMedical: summary.factsDamages.futureMedical,
          estimated_future_med_charges: summary.factsDamages.futureMedical,
          lostWages: summary.factsDamages.lostWages,
          other: summary.factsDamages.other,
          // Also write the canonical legacy keys the underwriting/valuation engine
          // and the demand-letter assembler read, so the ledger — once it has items
          // — is authoritative for case value everywhere, not just in this module.
          med_charges: summary.factsDamages.medical,
          wage_loss: summary.factsDamages.lostWages,
          future_medical: summary.factsDamages.futureMedical,
        },
        // Keep a structured snapshot alongside the legacy fields for surfaces that
        // want the full breakdown without re-querying the ledger.
        damagesLedger: summary,
      }
    },
  })

  return summary
}

/** Ledger figures whose every change is kept. */
export const TRACKED_DAMAGE_FIELDS = ['amount', 'paidAmount', 'adjustedAmount', 'billingStatus', 'payer'] as const

const asText = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v))

/**
 * Record what changed between two versions of a ledger line. Values compare
 * as text so 100 and 100.0 are the same. Never throws: a lost history row must
 * not undo the edit it describes.
 */
export async function recordDamageItemChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  ctx: { damageItemId: string; assessmentId: string; reason?: string | null; actorId?: string | null; actorName?: string | null },
): Promise<number> {
  const rows = TRACKED_DAMAGE_FIELDS.flatMap((field) => {
    const from = before ? asText(before[field]) : null
    const to = asText(after[field])
    const same = from === to || (from != null && to != null && Number(from) === Number(to) && !Number.isNaN(Number(from)))
    if (same || (before == null && to == null)) return []
    return [
      {
        damageItemId: ctx.damageItemId,
        assessmentId: ctx.assessmentId,
        field,
        fromValue: from,
        toValue: to,
        reason: ctx.reason?.trim() || null,
        actorId: ctx.actorId ?? null,
        actorName: ctx.actorName ?? null,
      },
    ]
  })
  if (!rows.length) return 0
  await (prisma as any).damageItemChange.createMany({ data: rows }).catch(() => undefined)
  return rows.length
}
