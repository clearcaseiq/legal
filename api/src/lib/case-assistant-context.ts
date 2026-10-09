/**
 * Everything on file for one case, as text the case assistant can reason over.
 *
 * The command-center summary the assistant started with is a scorecard
 * (readiness, gaps, risks), so questions like "what did the client say about
 * the MRI?" or "who is the adjuster?" had nothing to be answered from. This
 * pulls the record itself: intake facts, liability, treatment, damages,
 * insurance, liens, negotiation, demand letters, documents, tasks, notes and
 * the client conversation.
 *
 * Medical files and treatment detail are left out until the client has
 * authorized medical sharing, the same rule every attorney-facing screen
 * follows. Each section is capped so a large case cannot crowd the question
 * out of the model's context.
 */
import { prisma } from './prisma'
import { parseCaseFacts } from './case-facts'
import { buildMedicalSharingStatus, isMedicalEvidenceFile } from './medical-sharing'

const TOTAL_LIMIT = 24_000
const FACTS_LIMIT = 6_000
const FILE_SUMMARY_LIMIT = 300

/** Keys in `facts` that are contact details, bookkeeping, or duplicated elsewhere. */
const FACT_KEYS_OMITTED = new Set(['plaintiffContext', 'intakeData', 'consents', 'routing', 'tracking', 'utm'])

const day = (value: Date | string | null | undefined): string => {
  if (!value) return 'undated'
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : 'undated'
}

const money = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(Number(value))
    ? 'amount not recorded'
    : `$${Math.round(Number(value)).toLocaleString('en-US')}`

const clip = (text: string | null | undefined, limit: number): string => {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function section(title: string, lines: Array<string | null | undefined | false>, limit = 3_000): string | null {
  const body = lines.filter((line): line is string => Boolean(line)).join('\n')
  if (!body) return null
  return `${title}\n${body.length > limit ? `${body.slice(0, limit - 1)}…` : body}`
}

function factsForPrompt(facts: Record<string, any>, canShareMedical: boolean): string {
  const kept: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(facts)) {
    if (FACT_KEYS_OMITTED.has(key)) continue
    if (key === 'treatment' && !canShareMedical && Array.isArray(value)) {
      kept[key] = value.filter((item: any) => String(item?.provider || '').toLowerCase() !== 'from uploaded records')
      continue
    }
    kept[key] = value
  }
  const json = JSON.stringify(kept)
  return json.length > FACTS_LIMIT ? `${json.slice(0, FACTS_LIMIT - 1)}…` : json
}

export async function buildCaseAssistantContext(assessmentId: string): Promise<string> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      userId: true,
      claimType: true,
      venueState: true,
      venueCounty: true,
      caseName: true,
      caseStage: true,
      litigationStatus: true,
      createdAt: true,
      facts: true,
    },
  })
  if (!assessment) return ''

  const facts = parseCaseFacts(assessment.facts)

  const [
    liability,
    treatment,
    damages,
    insurance,
    liens,
    negotiation,
    demands,
    evidence,
    tasks,
    notes,
    chatRooms,
    expenses,
  ] = await Promise.all([
    prisma.liabilityRecord.findUnique({ where: { assessmentId } }),
    prisma.medicalTreatmentEntry.findMany({ where: { assessmentId }, orderBy: { startDate: 'asc' }, take: 60 }),
    prisma.damageItem.findMany({ where: { assessmentId }, orderBy: { incurredAt: 'asc' }, take: 80 }),
    prisma.insuranceDetail.findMany({ where: { assessmentId } }),
    prisma.lienHolder.findMany({ where: { assessmentId } }),
    prisma.negotiationEvent.findMany({ where: { assessmentId }, orderBy: { eventDate: 'asc' }, take: 40 }),
    prisma.demandLetter.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, status: true, targetAmount: true, sentAt: true, createdAt: true },
    }),
    prisma.evidenceFile.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        originalName: true,
        category: true,
        subcategory: true,
        createdAt: true,
        aiSummary: true,
        isVerified: true,
        provenanceSource: true,
      },
    }),
    prisma.caseTask.findMany({
      where: { assessmentId, mergedIntoId: null },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      take: 40,
      select: { title: true, status: true, dueDate: true, priority: true, assignedRole: true, assignedTo: true, notes: true },
    }),
    prisma.caseNote.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: { authorName: true, noteType: true, message: true, createdAt: true },
    }),
    prisma.chatRoom.findMany({ where: { assessmentId }, select: { id: true } }),
    prisma.caseExpense.findMany({ where: { assessmentId }, take: 40 }),
  ])

  const messages = chatRooms.length
    ? await prisma.message.findMany({
        where: { chatRoomId: { in: chatRooms.map((room) => room.id) } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { senderType: true, content: true, createdAt: true },
      })
    : []

  const sharing = buildMedicalSharingStatus({ ...assessment, evidenceFiles: evidence })
  const canShareMedical = sharing.canShareMedicalData
  const visibleEvidence = canShareMedical
    ? evidence
    : evidence.filter((file) => !isMedicalEvidenceFile(file) || String(file.provenanceSource || '').startsWith('opposing_portal:'))

  const parts = [
    section('CASE', [
      assessment.caseName ? `Caption: ${assessment.caseName}` : null,
      `Claim type: ${String(assessment.claimType).replace(/_/g, ' ')}`,
      `Venue: ${[assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ') || 'not recorded'}`,
      `Case stage: ${assessment.caseStage || 'pre-retention'}${assessment.litigationStatus && assessment.litigationStatus !== 'none' ? `; litigation: ${assessment.litigationStatus}` : ''}`,
      `Opened: ${day(assessment.createdAt)}`,
      canShareMedical ? null : `Medical records: ${sharing.message} (${sharing.medicalFileCount} medical file(s) withheld.)`,
    ]),
    section('INTAKE FACTS (as reported, JSON)', [factsForPrompt(facts, canShareMedical)], FACTS_LIMIT + 50),
    liability
      ? section('LIABILITY', [
          `Fault posture: ${liability.faultPosture}; defendant fault ${liability.defendantFaultPct}%, client comparative ${liability.comparativeNegPct}%`,
          liability.faultTheory ? `Theory: ${clip(liability.faultTheory, 600)}` : null,
          liability.defendantName ? `Defendant: ${liability.defendantName}` : null,
          liability.defendantInsurer ? `Defendant insurer: ${liability.defendantInsurer}` : null,
          `Police report: ${liability.policeReportStatus}${liability.policeReportNumber ? ` (#${liability.policeReportNumber})` : ''}${liability.citationIssuedTo ? `; citation issued to ${liability.citationIssuedTo}` : ''}`,
          `Witnesses: ${liability.hasWitnesses ? liability.witnessCount || 'yes' : 'none recorded'}; photos: ${liability.hasPhotos ? 'yes' : 'no'}; video: ${liability.hasVideo ? 'yes' : 'no'}`,
          liability.notes ? `Notes: ${clip(liability.notes, 600)}` : null,
        ])
      : null,
    canShareMedical
      ? section(
          'MEDICAL TREATMENT',
          treatment.map(
            (t) =>
              `- ${day(t.startDate)}${t.endDate ? ` to ${day(t.endDate)}` : ''}: ${t.provider}${t.specialty ? ` (${t.specialty})` : ''}, ${t.visitType}, ${t.status}${t.isFuture ? ', future' : ''}${t.diagnosis ? `; dx: ${clip(t.diagnosis, 200)}` : ''}${t.billedAmount != null ? `; billed ${money(t.billedAmount)}` : ''}${t.notes ? `; ${clip(t.notes, 200)}` : ''}`,
          ),
        )
      : null,
    section(
      'DAMAGES',
      damages
        .filter((d) => canShareMedical || !/medical/i.test(d.category))
        .map(
          (d) =>
            `- ${d.category}: ${clip(d.description, 160)} ${money(d.amount)}${d.provider ? ` (${d.provider})` : ''}${d.isFuture ? ', future' : ''}${d.billingStatus ? `, ${d.billingStatus}` : ''}`,
        ),
    ),
    section(
      'CASE EXPENSES',
      expenses.map((e) => `- ${e.category}: ${clip(e.description, 120)} ${money(e.amount)}${e.incurredAt ? ` on ${day(e.incurredAt)}` : ''}`),
      1_500,
    ),
    section(
      'INSURANCE',
      insurance.map(
        (i) =>
          `- ${i.carrierName}${i.coverageType ? ` (${i.coverageType})` : ''}${i.insuredParty ? `, insured: ${i.insuredParty}` : ''}; limit ${i.policyLimit != null ? money(i.policyLimit) : 'unknown'}; claim ${i.claimNumber || 'no number yet'}, ${i.claimStatus}; coverage ${i.coverageConfirmed ? 'confirmed' : 'unconfirmed'}${i.liabilityDecision ? `; liability decision: ${i.liabilityDecision}` : ''}${i.adjusterName ? `; adjuster ${i.adjusterName}` : ''}${i.limitsDemandStatus ? `; limits demand ${i.limitsDemandStatus}${i.limitsDemandDeadline ? ` (deadline ${day(i.limitsDemandDeadline)})` : ''}` : ''}${i.notes ? `; ${clip(i.notes, 200)}` : ''}`,
      ),
    ),
    section(
      'LIENS',
      liens.map((l) => `- ${l.name}${l.type ? ` (${l.type})` : ''}: ${money(l.finalAmount ?? l.amount)}, ${l.status}${l.notes ? `; ${clip(l.notes, 160)}` : ''}`),
      1_500,
    ),
    section(
      'NEGOTIATION',
      negotiation.map(
        (n) =>
          `- ${day(n.eventDate)} ${n.eventType}${n.amount != null ? ` ${money(n.amount)}` : ''} (${n.status})${n.insurerName ? ` with ${n.insurerName}` : ''}${n.clientDecision ? `; client ${n.clientDecision}${n.clientDecisionNote ? `: ${clip(n.clientDecisionNote, 160)}` : ''}` : ''}${n.notes ? `; ${clip(n.notes, 200)}` : ''}`,
      ),
    ),
    section(
      'DEMAND LETTERS',
      demands.map(
        (d) =>
          `- ${d.title || 'Demand'}: ${d.status}, target ${money(d.targetAmount)}, created ${day(d.createdAt)}${d.sentAt ? `, sent ${day(d.sentAt)}` : ''}`,
      ),
      1_000,
    ),
    section(
      'DOCUMENTS ON FILE',
      visibleEvidence.map(
        (f) =>
          `- ${day(f.createdAt)} ${f.originalName} [${f.category}${f.subcategory ? `/${f.subcategory}` : ''}]${f.isVerified ? ' reviewed' : ''}${f.aiSummary ? `: ${clip(f.aiSummary, FILE_SUMMARY_LIMIT)}` : ''}`,
      ),
      5_000,
    ),
    section(
      'TASKS',
      tasks.map(
        (t) =>
          `- [${t.status}] ${t.title}${t.dueDate ? `, due ${day(t.dueDate)}` : ''}${t.priority ? `, ${t.priority}` : ''}${t.assignedTo || t.assignedRole ? `, assigned ${t.assignedTo || t.assignedRole}` : ''}${t.notes ? `; ${clip(t.notes, 160)}` : ''}`,
      ),
      2_500,
    ),
    section(
      'CASE NOTES (newest first)',
      notes.map((n) => `- ${day(n.createdAt)} ${n.authorName || 'Team'} (${n.noteType}): ${clip(n.message, 400)}`),
      3_000,
    ),
    section(
      'CLIENT MESSAGES (newest first)',
      messages.map((m) => `- ${day(m.createdAt)} ${m.senderType === 'user' ? 'Client' : 'Firm'}: ${clip(m.content, 300)}`),
      3_000,
    ),
  ].filter((part): part is string => Boolean(part))

  const text = parts.join('\n\n')
  return text.length > TOTAL_LIMIT ? `${text.slice(0, TOTAL_LIMIT - 1)}…` : text
}
