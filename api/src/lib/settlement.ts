import { prisma } from './prisma'

/**
 * Settlement waterfall / net-to-client engine.
 *
 * PI recoveries are gross numbers; what actually matters to the client (and what
 * generates malpractice claims when it goes wrong) is the *net*:
 *
 *   net to client = gross − attorney fee − case costs − (negotiated) medical liens
 *
 * This module persists the inputs (a per-case `SettlementScenario`, `CaseExpense`
 * rows, and lien `finalAmount` reductions on `LienHolder`) and computes the
 * waterfall plus a set of warnings the attorney should not settle without seeing.
 */

export type SettlementWarningLevel = 'danger' | 'warning' | 'info'

export interface SettlementWarning {
  level: SettlementWarningLevel
  message: string
}

export interface SettlementLienLine {
  id: string
  name: string
  type: string | null
  status: string
  /** Asserted / billed lien amount. */
  asserted: number
  /** Amount actually payable at settlement (negotiated where set; 0 if waived). */
  final: number
  /** True when a reduction has been negotiated (finalAmount set or waived). */
  negotiated: boolean
  /** asserted − final (what the reduction saves the client). */
  savings: number
}

export interface SettlementCostLine {
  id: string
  category: string
  description: string
  amount: number
  incurredAt: string | null
}

/** Recoverable staff (paralegal/non-attorney) time available to add to costs. */
export interface StaffTimeSummary {
  /** Total approved billable non-attorney hours logged on the case. */
  hours: number
  /** Dollar value of that time at the snapshotted rates. */
  amount: number
  /** Whether this amount is currently folded into the waterfall costs. */
  included: boolean
}

export interface SettlementResult {
  /** Gross recovery used for the math (attorney override or predicted median). */
  gross: number
  /** True when gross falls back to the model estimate (no attorney override). */
  grossIsEstimate: boolean
  predictedMedian: number
  contingencyPct: number
  feeBasis: 'gross' | 'net_of_costs'
  attorneyFee: number
  costs: number
  /** Portion of `costs` that comes from recoverable staff time (0 if excluded). */
  staffTime: StaffTimeSummary
  costItems: SettlementCostLine[]
  liens: SettlementLienLine[]
  liensAsserted: number
  liensFinal: number
  lienSavings: number
  netToClient: number
  /** netToClient / gross (0..1). */
  netPct: number
  warnings: SettlementWarning[]
  scenario: {
    grossAmount: number | null
    contingencyPct: number
    feeBasis: string
    notes: string | null
  } | null
}

/** Robustly pull a median dollar figure out of the many band JSON shapes we've stored. */
function parsePredictedMedian(bandsRaw: string | null | undefined): number {
  if (!bandsRaw) return 0
  try {
    const bands: any = JSON.parse(bandsRaw)
    if (typeof bands?.median === 'number') return bands.median
    if (typeof bands?.p50 === 'number') return bands.p50
    const mid = bands?.mid
    if (Array.isArray(mid) && mid.length >= 2) return (Number(mid[0]) + Number(mid[1])) / 2
    const low = bands?.low
    const high = bands?.high
    if (Array.isArray(low) && Array.isArray(high)) return (Number(low[0]) + Number(high[1])) / 2
    if (Array.isArray(low) && low.length >= 2) return (Number(low[0]) + Number(low[1])) / 2
  } catch {
    /* ignore malformed bands */
  }
  return 0
}

const round = (n: number) => Math.round(n)

export async function computeSettlement(assessmentId: string): Promise<SettlementResult> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      claimType: true,
      predictions: { orderBy: { createdAt: 'desc' }, take: 1, select: { bands: true } },
      settlementScenario: true,
      lienHolders: { orderBy: { createdAt: 'desc' } },
      caseExpenses: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!assessment) {
    return {
      gross: 0,
      grossIsEstimate: true,
      predictedMedian: 0,
      contingencyPct: 33.33,
      feeBasis: 'gross',
      attorneyFee: 0,
      costs: 0,
      staffTime: { hours: 0, amount: 0, included: false },
      costItems: [],
      liens: [],
      liensAsserted: 0,
      liensFinal: 0,
      lienSavings: 0,
      netToClient: 0,
      netPct: 0,
      warnings: [{ level: 'info', message: 'No case data available yet.' }],
      scenario: null,
    }
  }

  const scenario = assessment.settlementScenario
  const predictedMedian = parsePredictedMedian(assessment.predictions[0]?.bands)

  const grossOverride = scenario?.grossAmount ?? null
  const gross = grossOverride != null && grossOverride > 0 ? grossOverride : predictedMedian
  const grossIsEstimate = !(grossOverride != null && grossOverride > 0)

  const defaultPct = assessment.claimType === 'medmal' ? 40 : 33.33
  const contingencyPct = scenario ? scenario.contingencyPct : defaultPct
  const feeBasis: 'gross' | 'net_of_costs' = scenario?.feeBasis === 'net_of_costs' ? 'net_of_costs' : 'gross'

  const costItems: SettlementCostLine[] = assessment.caseExpenses.map((e) => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amount: Number(e.amount || 0),
    incurredAt: e.incurredAt ? e.incurredAt.toISOString() : null,
  }))
  const expenseCosts = round(costItems.reduce((s, e) => s + e.amount, 0))

  // Recoverable staff time: approved, billable, non-attorney time logged on the
  // case. Attorney time is already covered by the contingency fee, so it's
  // excluded here. Folded into costs only when the scenario opts in.
  const staffEntries = await (prisma as any).timeEntry.findMany({
    where: {
      assessmentId,
      billable: true,
      status: 'approved',
      NOT: { role: 'attorney' },
    },
    select: { minutes: true, amount: true },
  })
  const staffTimeMinutes = staffEntries.reduce((s: number, e: any) => s + (e.minutes || 0), 0)
  const staffTimeAmount = round(staffEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0))
  const includeStaffTime = Boolean((scenario as any)?.includeStaffTime) && staffTimeAmount > 0
  const staffTime = {
    hours: Math.round((staffTimeMinutes / 60) * 100) / 100,
    amount: staffTimeAmount,
    included: includeStaffTime,
  }

  const costs = round(expenseCosts + (includeStaffTime ? staffTimeAmount : 0))

  const liens: SettlementLienLine[] = assessment.lienHolders.map((l) => {
    const asserted = Number(l.amount || 0)
    const waived = l.status === 'waived'
    const negotiated = waived || (l.finalAmount != null && l.finalAmount >= 0)
    const final = waived ? 0 : l.finalAmount != null ? Number(l.finalAmount) : asserted
    return {
      id: l.id,
      name: l.name,
      type: l.type ?? null,
      status: l.status,
      asserted,
      final,
      negotiated,
      savings: Math.max(0, asserted - final),
    }
  })
  const liensAsserted = round(liens.reduce((s, l) => s + l.asserted, 0))
  const liensFinal = round(liens.reduce((s, l) => s + l.final, 0))
  const lienSavings = Math.max(0, liensAsserted - liensFinal)

  const feeBase = feeBasis === 'net_of_costs' ? Math.max(0, gross - costs) : gross
  const attorneyFee = round(feeBase * (contingencyPct / 100))
  const netToClient = round(gross - attorneyFee - costs - liensFinal)
  const netPct = gross > 0 ? netToClient / gross : 0

  // Warnings — the malpractice-grade guardrails.
  const warnings: SettlementWarning[] = []
  if (gross <= 0) {
    warnings.push({
      level: 'info',
      message: 'Add a gross recovery (a settlement offer or demand) to model the client\u2019s net.',
    })
  } else {
    if (netToClient <= 0) {
      warnings.push({
        level: 'danger',
        message:
          'At this recovery the client would net $0 or less after fees, costs, and liens. Do not settle until liens are reduced.',
      })
    } else if (netPct < 0.15) {
      warnings.push({
        level: 'warning',
        message: `Client nets only ${Math.round(netPct * 100)}% of the gross recovery. Negotiate lien reductions before finalizing.`,
      })
    }
    const anyNegotiated = liens.some((l) => l.negotiated)
    if (liensAsserted > 0 && !anyNegotiated && liensAsserted > gross * 0.2) {
      warnings.push({
        level: 'info',
        message:
          'Liens are shown at asserted amounts. Negotiating reductions (common-fund / procurement) could materially increase the client\u2019s net.',
      })
    }
    if (gross > 0 && costs === 0) {
      warnings.push({
        level: 'info',
        message: 'No case costs recorded. Add advanced expenses (filing, experts, records) for an accurate net.',
      })
    }
  }

  return {
    gross,
    grossIsEstimate,
    predictedMedian,
    contingencyPct,
    feeBasis,
    attorneyFee,
    costs,
    staffTime,
    costItems,
    liens,
    liensAsserted,
    liensFinal,
    lienSavings,
    netToClient,
    netPct,
    warnings,
    scenario: scenario
      ? {
          grossAmount: scenario.grossAmount,
          contingencyPct: scenario.contingencyPct,
          feeBasis: scenario.feeBasis,
          notes: scenario.notes,
        }
      : null,
  }
}
