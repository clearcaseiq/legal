/**
 * AI Case Coach engine (Phase 2) — the "next best action" spine.
 *
 * Continuously analyzes a retained case and produces a RANKED feed of the
 * highest-value actions the attorney should take next, each with:
 *   - what to do (imperative title)
 *   - why it matters (grounded rationale)
 *   - how much it moves the case (impact)
 *   - one-click actions (reuse the Case Intelligence task primitive)
 *
 * Like Phase 0, every signal here is DETERMINISTIC — derived from the Case
 * Intelligence registry, the underwriting engine, and the raw facts. The
 * optional LLM layer (case-coach-narrator.ts) only rewrites the copy; it never
 * invents actions, numbers, or deadlines.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { buildCaseIntelligence, type CaseGap, type GapAction, type GapCategory, type ValueImpact } from './case-intelligence'
import { deriveTreatmentPosture, evaluateDemandGate, hasTreatmentCompletionSignal } from './demand-readiness'

export type CoachPriority = 'critical' | 'high' | 'medium' | 'low'
export type CoachCategory = GapCategory | 'deadline' | 'strategy'

export interface CoachInsight {
  key: string
  /** Imperative next-best action, e.g. "Send a policy-limits demand to the carrier". */
  title: string
  category: CoachCategory
  priority: CoachPriority
  /** Internal ranking score (higher = do sooner). */
  priorityScore: number
  /** Why this matters for THIS case. */
  why: string
  /** Plain-language impact, e.g. "SOL expires in 58 days" or "Can raise value 20–30%". */
  impact: string
  valueImpact: ValueImpact
  /** One-click remediation actions (reuse the gap-action task primitive). */
  actions: GapAction[]
  /** Set when the coach auto-generated (or found an existing) task for this action. */
  autoTaskId?: string
  autoTaskCreated?: boolean
}

export interface CaseCoachResult {
  assessmentId: string
  generatedAt: string
  modelVersion: string
  /** One-line summary of the single most important thing to do next. */
  headline: string
  insights: CoachInsight[]
}

function parseFacts(raw: unknown): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, any>
  try {
    return JSON.parse(String(raw)) as Record<string, any>
  } catch {
    return {}
  }
}

const PRIORITY_FROM_SCORE = (score: number): CoachPriority =>
  score >= 90 ? 'critical' : score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low'

const IMPACT_RANK: Record<ValueImpact, number> = { high: 3, medium: 2, low: 1 }

function formatMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0'
  if (value >= 1000) return `$${Math.round(value / 1000)}k`
  return `$${Math.round(value)}`
}

/** Detect a plaintiff-side government/health payer that creates a lien/subrogation exposure. */
function lienExposure(facts: Record<string, any>, insuranceDetails: Array<any>): boolean {
  const ins = facts?.insurance || {}
  const flags = [
    ins.medicare, ins.medicaid, ins.health_insurance, ins.plaintiff_health,
    ins.va, ins.workers_comp, ins.workersComp,
  ]
  if (flags.some((v) => v === true || String(v || '').toLowerCase() === 'yes')) return true
  const blob = JSON.stringify(ins || {}).toLowerCase()
  if (/medicare|medicaid|tricare|va\b|health insurance|group health/.test(blob)) return true
  return insuranceDetails.some((d) => {
    const party = String(d?.insuredParty || '').toLowerCase()
    const type = String(d?.coverageType || d?.type || '').toLowerCase()
    return party === 'plaintiff' && /health|medicare|medicaid|med\s?pay/.test(type)
  })
}

/** Gap key for the client's own first-party coverage; scored on its own clock. */
const FIRST_PARTY_COVERAGE_GAP_KEY = 'first_party_coverage'

/** Coach action set for a gap, folded down to the universal task primitives. */
function gapToInsight(gap: CaseGap): CoachInsight {
  const title =
    gap.category === 'liability' ? `Secure ${gap.label.toLowerCase()}` :
    gap.category === 'insurance' ? `Confirm ${gap.label.toLowerCase()}` :
    gap.category === 'medical' ? `Obtain ${gap.label.toLowerCase()}` :
    `Collect ${gap.label.toLowerCase()}`
  // Gap severity (1-5) drives the base score; high value-impact bumps it.
  const score = gap.severity * 15 + IMPACT_RANK[gap.valueImpact] * 4
  return {
    key: `gap_${gap.key}`,
    title,
    category: gap.category,
    priority: PRIORITY_FROM_SCORE(score),
    priorityScore: score,
    why: gap.rationale,
    impact: gap.valueImpact === 'high' ? 'High impact on case value' : gap.valueImpact === 'medium' ? 'Moderate impact on case value' : 'Supports the file',
    valueImpact: gap.valueImpact,
    actions: gap.actions,
  }
}

export async function buildCaseCoach(assessmentId: string): Promise<CaseCoachResult | null> {
  const intel = await buildCaseIntelligence(assessmentId)
  if (!intel) return null

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { insuranceDetails: true },
  })
  const facts = parseFacts((assessment as any)?.facts)
  const insuranceDetails = (assessment as any)?.insuranceDetails || []

  // Suppress insights that already have an open task so the coach stays "fresh".
  const openTasks = await prisma.caseTask.findMany({
    where: { assessmentId, status: { in: ['open', 'in_progress'] } },
    select: { title: true },
  }).catch(() => [] as Array<{ title: string }>)
  const openTaskText = openTasks.map((t) => String(t.title || '').toLowerCase())
  const hasOpenTaskFor = (needle: string) => openTaskText.some((t) => t.includes(needle.toLowerCase()))

  // Where the client sits in their course of care. Drives both the treatment-gap
  // action and the demand gate, so the two can no longer contradict each other.
  const treatmentPosture = deriveTreatmentPosture({
    facts,
    completionSignal: await hasTreatmentCompletionSignal(prisma, assessmentId),
  })

  const insights: CoachInsight[] = []
  const s = intel.summary

  // 1) SOL urgency — the highest-stakes clock on the case.
  if (s.sol.daysRemaining != null) {
    const d = s.sol.daysRemaining
    const expiresOn = s.sol.expiresAt ? new Date(s.sol.expiresAt).toLocaleDateString() : null
    if (d < 0) {
      // Already lapsed. Counting down past zero would render as "leaves -412 days",
      // which reads as a distant deadline rather than the emergency it is.
      const elapsed = Math.abs(d)
      insights.push({
        key: 'sol_expired',
        title: 'Filing deadline has passed. Confirm status immediately',
        category: 'deadline',
        priority: PRIORITY_FROM_SCORE(100),
        priorityScore: 100,
        why: `The statute of limitations ran ${elapsed} day${elapsed === 1 ? '' : 's'} ago${expiresOn ? ` (${expiresOn})` : ''}. Confirm whether suit was filed, or whether a tolling or delayed-discovery argument applies, before any further work or client communication.`,
        impact: 'Claim is time-barred unless suit was already filed or the period is tolled',
        valueImpact: 'high',
        actions: ['schedule_followup', 'assign_paralegal'],
      })
    } else if (d <= 365) {
      const score = d <= 30 ? 100 : d <= 90 ? 92 : d <= 180 ? 78 : 60
      insights.push({
        key: 'sol_urgency',
        title: d <= 90 ? 'Protect the filing deadline now' : 'Calendar and monitor the filing deadline',
        category: 'deadline',
        priority: PRIORITY_FROM_SCORE(score),
        priorityScore: score,
        why: `The statute of limitations leaves ${d} day${d === 1 ? '' : 's'}. Missing it forfeits the entire claim regardless of merits.`,
        impact: `SOL expires in ${d} days${expiresOn ? ` (${expiresOn})` : ''}`,
        valueImpact: 'high',
        actions: d <= 90 ? ['schedule_followup', 'assign_paralegal'] : ['schedule_followup'],
      })
    }
  }

  // 2) Top gaps → coach actions (deduped against open tasks).
  for (const gap of intel.gaps) {
    if (gap.severity < 3) continue
    if (gap.key === FIRST_PARTY_COVERAGE_GAP_KEY) continue // handled below, on its own clock
    if (hasOpenTaskFor(gap.label.split('(')[0].trim())) continue
    insights.push(gapToInsight(gap))
  }

  // 2b) The client's own coverage. Scored above the routine document gaps rather
  // than alongside them, because it is the one investigation item on a day-one
  // file that can be forfeited by waiting: UM/UIM and MedPay/PIP policies
  // condition coverage on prompt notice to the client's own carrier. Records and
  // bills can be chased in any order; a blown notice window cannot be reopened.
  // Only the auto-generated task's position changes — the gap itself still
  // appears in the Missing Information registry either way.
  const coverageGap = intel.gaps.find((g) => g.key === FIRST_PARTY_COVERAGE_GAP_KEY)
  if (coverageGap && !hasOpenTaskFor('own coverage') && !hasOpenTaskFor('um/uim')) {
    const score = coverageGap.severity >= 5 ? 94 : 88
    insights.push({
      key: 'first_party_coverage',
      title: "Confirm the client's own coverage (UM/UIM, PIP/MedPay)",
      category: 'insurance',
      priority: PRIORITY_FROM_SCORE(score),
      priorityScore: score,
      why: `${coverageGap.rationale} Most first-party policies require prompt notice as a condition of coverage, so this is a day-one item rather than something to pick up at demand time.`,
      impact: 'Preserves a recovery source that can exceed the defendant’s limits',
      valueImpact: 'high',
      actions: ['assign_paralegal', 'generate_doc_request', 'request_from_client'],
    })
  }

  // 3) Treatment gap — a classic value-killer if left unexplained.
  const gapDays = treatmentPosture.daysSinceLastTreatment
  if (gapDays != null) {
    if (gapDays >= 30 && !hasOpenTaskFor('treatment')) {
      const score = gapDays >= 60 ? 74 : 58
      insights.push({
        key: 'treatment_gap',
        title: 'Contact the client about the treatment gap',
        category: 'medical',
        priority: PRIORITY_FROM_SCORE(score),
        priorityScore: score,
        why: `No treatment recorded for ${gapDays} days. Insurers argue a gap means the client recovered. Confirm whether treatment ended or lapsed and document the reason.`,
        impact: 'Prevents a common value-reduction argument',
        valueImpact: 'medium',
        actions: ['schedule_followup', 'request_from_client'],
      })
    }
  }

  // 4) Lien / subrogation investigation — start early or it delays disbursement.
  if (lienExposure(facts, insuranceDetails) && !hasOpenTaskFor('lien')) {
    insights.push({
      key: 'lien_investigation',
      title: 'Open the lien / subrogation investigation',
      category: 'strategy',
      priority: 'medium',
      priorityScore: 56,
      why: 'A government or health-plan payer appears involved. Identifying and negotiating liens early avoids a stalled disbursement and protects the client’s net recovery.',
      impact: 'Protects net recovery at settlement',
      valueImpact: 'medium',
      actions: ['assign_paralegal', 'schedule_followup'],
    })
  }

  // 5) Future-care documentation — comparable cases settle materially higher.
  if (s.economic.futureMedical <= 0 && s.estimatedValue.expected >= 25000 && !hasOpenTaskFor('future')) {
    insights.push({
      key: 'future_care',
      title: 'Document future treatment / life-care costs',
      category: 'damages',
      priority: 'high',
      priorityScore: 72,
      why: 'No future medical costs are documented yet. A treating-physician estimate of future care is often the single largest lever on general damages.',
      impact: 'Comparable cases settle 20–30% higher with documented future care',
      valueImpact: 'high',
      actions: ['schedule_followup', 'assign_paralegal'],
    })
  }

  // 6) Demand readiness — only once the file is strong enough AND treatment has
  // finished. The documentation score alone used to be enough, which meant a
  // well-organized file with a live treatment gap was told to draft a demand
  // while the specials were still moving. A demand cannot be withdrawn once it
  // is with the carrier, so the gate is deliberately conservative; when it fails
  // the coach raises the thing that would unblock it instead.
  const highGapsRemaining = intel.gaps.filter((g) => g.severity >= 4).length
  const fileIsOtherwiseStrong = s.documentation.score >= 60 && highGapsRemaining === 0
  if (fileIsOtherwiseStrong) {
    const demandGate = evaluateDemandGate({
      treatment: treatmentPosture,
      documentedMedicalBills: s.economic.medicalBills,
      hasMedicalRecords: !intel.gaps.some((g) => g.key === 'medical_records'),
    })

    if (demandGate.ready && !hasOpenTaskFor('demand')) {
      insights.push({
        key: 'demand_ready',
        title: 'Move toward the demand package',
        category: 'strategy',
        priority: 'high',
        priorityScore: 70,
        why: `Documentation is ${s.documentation.grade.toLowerCase()} (${s.documentation.score}/100) with no critical gaps outstanding, and treatment is complete. The file is ready to assemble the demand.`,
        impact: `Targets settlement around ${formatMoney(s.estimatedValue.expected)}`,
        valueImpact: 'high',
        actions: ['assign_paralegal', 'schedule_followup'],
      })
    } else if (!demandGate.ready && treatmentPosture.posture !== 'complete' && !hasOpenTaskFor('treatment status')) {
      // The file is organized enough that demand work would otherwise start, so
      // the binding constraint is documenting where care ended.
      insights.push({
        key: 'confirm_treatment_status',
        title: 'Confirm treatment status and obtain the discharge / MMI note',
        category: 'medical',
        priority: 'high',
        priorityScore: 76,
        why: `${treatmentPosture.detail} The rest of the file is organized enough for demand work, so this is the one thing holding the demand back. Demanding before maximum medical improvement locks in a number while the specials are still growing.`,
        impact: 'Unblocks the demand and prevents under-valuing the claim',
        valueImpact: 'high',
        actions: ['request_from_client', 'assign_paralegal'],
      })
    }
  }

  // Rank: priorityScore desc, then value-impact.
  insights.sort((a, b) => b.priorityScore - a.priorityScore || IMPACT_RANK[b.valueImpact] - IMPACT_RANK[a.valueImpact])
  const ranked = insights.slice(0, 6)

  const headline = ranked.length
    ? ranked[0].title
    : 'No urgent actions. The file is on track.'

  logger.info('Built case coach', { assessmentId, insights: ranked.length })

  return {
    assessmentId,
    generatedAt: new Date().toISOString(),
    modelVersion: 'case-coach-v1',
    headline,
    insights: ranked,
  }
}
