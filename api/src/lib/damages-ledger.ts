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

export interface DamagesSummary {
  medical: { billed: number; paid: number; outstanding: number; incurred: number }
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

function emptySummary(): DamagesSummary {
  return {
    medical: { billed: 0, paid: 0, outstanding: 0, incurred: 0 },
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

/** Aggregate the ledger for one case. */
export async function summarizeDamages(assessmentId: string): Promise<DamagesSummary> {
  const items = await (prisma as any).damageItem
    .findMany({ where: { assessmentId } })
    .catch(() => [] as any[])
  const s = emptySummary()
  s.itemCount = items.length
  if (items.length === 0) return s

  for (const it of items as any[]) {
    const amt = n(it.amount)
    switch (it.category) {
      case 'medical': {
        s.medical.incurred += amt
        const status = String(it.billingStatus || '').toLowerCase()
        if (status === 'paid') s.medical.paid += amt
        else if (status === 'outstanding') s.medical.outstanding += amt
        // 'billed' is the gross; incurred already captures it.
        s.medical.billed += amt
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

  const specials = s.medical.incurred + s.lostWages + s.propertyDamage + s.outOfPocket + s.other
  const future = s.futureMedical + s.lostEarningCapacity + s.futureCost
  s.totals = { specials, future, grand: specials + future }

  // Legacy engine mapping: medical specials, future medical, wage loss, and a
  // catch-all "other" that bundles property, OOP, future costs, earning capacity.
  s.factsDamages = {
    medical: s.medical.incurred,
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
