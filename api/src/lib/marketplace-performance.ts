/**
 * Marketplace Performance analytics — the "P&L of the acquisition channel".
 *
 * Shared by the attorney dashboard (mine scope) and the firm dashboard (firm
 * scope). Given a set of attorney ids (for platform spend) and a lead-universe
 * filter (for funnel + retained outcomes), it returns the KPI tiles, the
 * acquisition funnel, and a spend-vs-return monthly series that the
 * MarketplacePerformancePage renders directly.
 *
 * Everything is computed live from the database — nothing hardcoded.
 */

// Attorneys work on contingency; retained "value" is the expected fee share of
// the case, matching how the attorney dashboard already reports retainedValue.
const CONTINGENCY_RATE = 0.33

const ACCEPTED_STATUSES = ['contacted', 'consulted', 'retained']
const SETTLED_STATUSES = ['closed', 'settled']

function parseMedian(pred: any): number {
  const bandsRaw = pred?.bands
  if (!bandsRaw) return 0
  try {
    const b = typeof bandsRaw === 'string' ? JSON.parse(bandsRaw) : bandsRaw
    const v = b?.median ?? b?.p50 ?? (b?.low != null && b?.high != null ? (Number(b.low) + Number(b.high)) / 2 : 0)
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function inMonth(value: any, start: Date, end: Date): boolean {
  if (!value) return false
  const t = new Date(value).getTime()
  return t >= start.getTime() && t < end.getTime()
}

export interface MarketplaceFunnelRow {
  stage: string
  count: number
  /** Conversion from the previous stage (0-1). Null for the first stage. */
  stepConversion: number | null
  note: string
}

export interface MarketplaceMonthlyRow {
  key: string
  label: string
  spend: number
  retainedValue: number
  cases: number
  /** Fees collected ÷ spend for the month. */
  roi: number
}

export interface MarketplacePerformance {
  routingSpend: number
  retainedValue: number
  feesCollected: number
  /** Fees collected ÷ routing spend. */
  returnOnSpend: number
  /** Routing spend ÷ retained cases. */
  costPerRetained: number
  casesRetained: number
  funnel: MarketplaceFunnelRow[]
  /** Same funnel, recomputed for the 7 / 30 / 90 day routing windows. */
  funnelByWindow: Record<'7' | '30' | '90', MarketplaceFunnelRow[]>
  /**
   * Lightweight lead list (routed within the last 90 days) so the client can
   * recompute the funnel for any custom day window (e.g. a 1–90 day slider).
   */
  funnelLeads: Array<{ submittedAt: string; status: string }>
  /** Forward-looking pipeline economics: value in flight + spend recovery. */
  pipeline: {
    /** Expected fee value of accepted-but-not-yet-retained matters. */
    valueAtRisk: number
    /** Number of accepted-not-retained matters backing valueAtRisk. */
    valueAtRiskCases: number
    /** feesCollected − routingSpend (negative = not yet recovered). */
    netReturn: number
    /** True once fees collected have covered routing spend. */
    recovered: boolean
    /** feesCollected ÷ routingSpend (0–1+ ; 1 = fully paid back). */
    progressPct: number
  }
  monthly: MarketplaceMonthlyRow[]
}

export interface MarketplaceAttorneyRow {
  attorneyId: string
  name: string
  routingSpend: number
  casesRetained: number
  retainedValue: number
  feesCollected: number
  /** Fees collected ÷ routing spend. */
  returnOnSpend: number
  /** Routing spend ÷ retained cases. */
  costPerRetained: number
}

export async function computeMarketplacePerformance(
  prisma: any,
  params: { attorneyIds: string[]; leadWhere: any },
): Promise<MarketplacePerformance> {
  const { attorneyIds, leadWhere } = params

  // Platform spend — billable routing/subscription payments (skip the
  // "skipped_*" records where the fee was bypassed).
  const platformPayments = attorneyIds.length
    ? await prisma.platformPayment.findMany({
        where: { attorneyId: { in: attorneyIds } },
        select: { amount: true, status: true, createdAt: true },
      })
    : []
  const billablePayments = platformPayments.filter((p: any) => !String(p.status || '').startsWith('skipped'))
  const routingSpend = billablePayments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)

  // Lead universe — powers the funnel and retained value/outcomes.
  const leads = await prisma.leadSubmission.findMany({
    where: leadWhere,
    select: {
      status: true,
      submittedAt: true,
      updatedAt: true,
      assessmentId: true,
      assessment: {
        select: {
          predictions: {
            orderBy: { createdAt: 'desc' as const },
            take: 1,
            select: { bands: true },
          },
        },
      },
    },
  })

  const matchedCount = leads.length
  const acceptedCount = leads.filter((l: any) => ACCEPTED_STATUSES.includes(String(l.status || ''))).length
  const retainedLeads = leads.filter((l: any) => String(l.status || '') === 'retained')
  const casesRetained = retainedLeads.length
  const settledCount = leads.filter((l: any) => SETTLED_STATUSES.includes(String(l.status || ''))).length
  const retainedValue = retainedLeads.reduce(
    (s: number, l: any) => s + parseMedian(l.assessment?.predictions?.[0]) * CONTINGENCY_RATE,
    0,
  )

  // Fees collected on retained cases (real client payments).
  const retainedAssessmentIds = retainedLeads.map((l: any) => l.assessmentId).filter(Boolean)
  const billing = retainedAssessmentIds.length
    ? await prisma.billingPayment.findMany({
        where: { assessmentId: { in: retainedAssessmentIds } },
        select: { amount: true, createdAt: true },
      })
    : []
  const feesCollected = billing.reduce((s: number, b: any) => s + Number(b.amount ?? 0), 0)

  const returnOnSpend = routingSpend > 0 ? feesCollected / routingSpend : 0
  const costPerRetained = casesRetained > 0 ? routingSpend / casesRetained : 0

  // Builds the routed → accepted → retained → settled funnel for a lead cohort.
  const buildFunnel = (cohort: any[]): MarketplaceFunnelRow[] => {
    const matched = cohort.length
    const accepted = cohort.filter((l: any) => ACCEPTED_STATUSES.includes(String(l.status || ''))).length
    const retained = cohort.filter((l: any) => String(l.status || '') === 'retained').length
    const settled = cohort.filter((l: any) => SETTLED_STATUSES.includes(String(l.status || ''))).length
    return [
      { stage: 'Matches routed', count: matched, stepConversion: null, note: 'Pushed by SMS + app' },
      { stage: 'Accepted', count: accepted, stepConversion: matched ? accepted / matched : 0, note: 'Fee charged on accept' },
      { stage: 'Retained', count: retained, stepConversion: accepted ? retained / accepted : 0, note: 'Signed retainer' },
      { stage: 'Settled / resolved', count: settled, stepConversion: retained ? settled / retained : 0, note: 'Outcome in Case Mgmt' },
    ]
  }

  const funnel = buildFunnel(leads)

  // Windowed funnels keyed by routing recency (lead.submittedAt within N days).
  const nowMs = Date.now()
  const leadsWithin = (days: number) => {
    const cutoff = nowMs - days * 24 * 60 * 60 * 1000
    return leads.filter((l: any) => {
      const ts = new Date(l.submittedAt || l.updatedAt || 0).getTime()
      return Number.isFinite(ts) && ts >= cutoff
    })
  }
  const funnelByWindow: Record<'7' | '30' | '90', MarketplaceFunnelRow[]> = {
    '7': buildFunnel(leadsWithin(7)),
    '30': buildFunnel(leadsWithin(30)),
    '90': buildFunnel(leadsWithin(90)),
  }
  const funnelLeads = leadsWithin(90).map((l: any) => ({
    submittedAt: new Date(l.submittedAt || l.updatedAt || Date.now()).toISOString(),
    status: String(l.status || ''),
  }))

  // Pipeline economics — value still in flight (accepted, not yet retained) and
  // how far collected fees have gone toward recovering routing spend.
  const acceptedNotRetained = leads.filter((l: any) =>
    ['contacted', 'consulted'].includes(String(l.status || '')),
  )
  const valueAtRisk = acceptedNotRetained.reduce(
    (s: number, l: any) => s + parseMedian(l.assessment?.predictions?.[0]) * CONTINGENCY_RATE,
    0,
  )
  const netReturn = feesCollected - routingSpend
  const pipeline = {
    valueAtRisk,
    valueAtRiskCases: acceptedNotRetained.length,
    netReturn,
    recovered: routingSpend > 0 ? feesCollected >= routingSpend : feesCollected > 0,
    progressPct: routingSpend > 0 ? feesCollected / routingSpend : feesCollected > 0 ? 1 : 0,
  }

  // Spend vs. return over the last 6 calendar months. Only months with activity
  // are surfaced so demo books don't show a wall of empty rows.
  const now = new Date()
  const monthly: MarketplaceMonthlyRow[] = []
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    const spend = billablePayments
      .filter((p: any) => inMonth(p.createdAt, start, end))
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)
    const monthRetained = retainedLeads.filter((l: any) => inMonth(l.updatedAt, start, end))
    const rv = monthRetained.reduce(
      (s: number, l: any) => s + parseMedian(l.assessment?.predictions?.[0]) * CONTINGENCY_RATE,
      0,
    )
    const fees = billing.filter((b: any) => inMonth(b.createdAt, start, end)).reduce((s: number, b: any) => s + Number(b.amount ?? 0), 0)
    if (spend <= 0 && rv <= 0 && monthRetained.length === 0) continue
    monthly.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleString('en-US', { month: 'short' }),
      spend,
      retainedValue: rv,
      cases: monthRetained.length,
      roi: spend > 0 ? fees / spend : 0,
    })
  }

  return {
    routingSpend,
    retainedValue,
    feesCollected,
    returnOnSpend,
    costPerRetained,
    casesRetained,
    funnel,
    funnelByWindow,
    funnelLeads,
    pipeline,
    monthly,
  }
}

/**
 * Per-attorney Marketplace Performance rows for the firm view. Each attorney is
 * scored on the same lead universe they'd see on their own dashboard (leads
 * assigned to them or where they hold an introduction), so the firm breakdown
 * reconciles with each attorney's individual "My performance" tab.
 */
export async function computeMarketplacePerformanceByAttorney(
  prisma: any,
  attorneys: { id: string; name?: string | null }[],
): Promise<MarketplaceAttorneyRow[]> {
  const rows = await Promise.all(
    attorneys
      .filter((a) => a?.id)
      .map(async (a) => {
        const leadWhere = {
          OR: [
            { assignedAttorneyId: a.id },
            { assessment: { introductions: { some: { attorneyId: a.id } } } },
          ],
        }
        const perf = await computeMarketplacePerformance(prisma, { attorneyIds: [a.id], leadWhere })
        return {
          attorneyId: a.id,
          name: a.name || 'Attorney',
          routingSpend: perf.routingSpend,
          casesRetained: perf.casesRetained,
          retainedValue: perf.retainedValue,
          feesCollected: perf.feesCollected,
          returnOnSpend: perf.returnOnSpend,
          costPerRetained: perf.costPerRetained,
        }
      }),
  )
  // Highest retained value first — the managing partner's headline sort.
  return rows.sort((a, b) => b.retainedValue - a.retainedValue)
}
