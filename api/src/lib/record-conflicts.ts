/**
 * Records that disagree with the case: a police report that dates the incident
 * differently, a policy number that does not match the Insurance tab, a visit
 * dated before the accident.
 *
 * Accepting a finding only fills blanks, so a disagreement never overwrites
 * what the attorney entered. It is reported here instead, on the finding and
 * in the demand's quality check, for the attorney to resolve.
 */
import { prisma } from './prisma'
import { namesMatch, sameReference, type FindingView } from './document-findings'

export interface ConflictState {
  incidentDate: string | null
  policeReportNumber: string | null
  citationIssuedTo: string | null
  defendantNames: string[]
  policies: Array<{
    id: string
    carrierName: string
    policyNumber: string | null
    claimNumber: string | null
    policyLimit: number | null
    insuredParty: string | null
  }>
}

const CITATION_LABEL: Record<string, string> = {
  none: 'no one',
  defendant: 'the defendant',
  plaintiff: 'our client',
  both: 'both drivers',
}

function toIsoDay(value: unknown): string | null {
  if (!value) return null
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function longDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

/** Where one finding disagrees with the case. Pure, so it can be checked without a database. */
export function conflictsFor(finding: Pick<FindingView, 'kind' | 'data'>, state: ConflictState): string[] {
  const d = finding.data
  const out: string[] = []

  if (finding.kind === 'incident_report') {
    if (d.date && state.incidentDate && d.date !== state.incidentDate) {
      out.push(`The report dates the incident ${longDay(d.date)}; the case has ${longDay(state.incidentDate)}.`)
    }
    if (d.reportNumber && state.policeReportNumber && !sameReference(d.reportNumber, state.policeReportNumber)) {
      out.push(`Report number ${d.reportNumber}; the Liability tab has ${state.policeReportNumber}.`)
    }
    if (
      d.citationIssuedTo &&
      state.citationIssuedTo &&
      state.citationIssuedTo !== 'none' &&
      d.citationIssuedTo !== state.citationIssuedTo
    ) {
      out.push(
        `The report says ${CITATION_LABEL[d.citationIssuedTo] || d.citationIssuedTo} was cited; the Liability tab says ${
          CITATION_LABEL[state.citationIssuedTo] || state.citationIssuedTo
        }.`,
      )
    }
    if (d.defendantName && state.defendantNames.length && !state.defendantNames.some((n) => namesMatch(n, d.defendantName))) {
      out.push(`The report names ${d.defendantName} as the other party; the case lists ${state.defendantNames.join(', ')}.`)
    }
  } else if (finding.kind === 'insurance_policy') {
    const byNumber = state.policies.find(
      (p) => sameReference(p.policyNumber, d.policyNumber) || sameReference(p.claimNumber, d.claimNumber),
    )
    const sameCarrier = byNumber || state.policies.find((p) => namesMatch(p.carrierName, d.carrierName))
    if (sameCarrier) {
      if (d.policyNumber && sameCarrier.policyNumber && !sameReference(d.policyNumber, sameCarrier.policyNumber)) {
        out.push(`Policy number ${d.policyNumber}; the Insurance tab has ${sameCarrier.policyNumber} for ${sameCarrier.carrierName}.`)
      }
      if (d.claimNumber && sameCarrier.claimNumber && !sameReference(d.claimNumber, sameCarrier.claimNumber)) {
        out.push(`Claim number ${d.claimNumber}; the Insurance tab has ${sameCarrier.claimNumber} for ${sameCarrier.carrierName}.`)
      }
      if (d.policyLimit && sameCarrier.policyLimit && Math.abs(d.policyLimit - sameCarrier.policyLimit) >= 1) {
        out.push(`Limit of ${money(d.policyLimit)} per person; the Insurance tab has ${money(sameCarrier.policyLimit)}.`)
      }
      if (d.insuredParty && sameCarrier.insuredParty && d.insuredParty !== sameCarrier.insuredParty) {
        out.push(
          `The document reads as the ${d.insuredParty === 'client' ? "client's own" : "defendant's"} policy; the Insurance tab has it as the ${
            sameCarrier.insuredParty === 'client' ? "client's" : "defendant's"
          }.`,
        )
      }
    }
    if (
      d.insuredParty === 'defendant' &&
      d.insuredName &&
      state.defendantNames.length &&
      !state.defendantNames.some((n) => namesMatch(n, d.insuredName))
    ) {
      out.push(`The policy insures ${d.insuredName}, who is not a defendant on the case.`)
    }
  } else if (d.date && state.incidentDate && d.date < state.incidentDate) {
    out.push(`Dated ${longDay(d.date)}, before the incident on ${longDay(state.incidentDate)}. Check whether this is prior treatment.`)
  }
  return out
}

function parseFacts(raw: unknown): any {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {}
    } catch {
      return {}
    }
  }
  return raw
}

export async function loadConflictState(assessmentId: string): Promise<ConflictState> {
  const [assessment, record, defendants, policies] = await Promise.all([
    prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } }).catch(() => null),
    (prisma as any).liabilityRecord
      .findUnique({ where: { assessmentId }, select: { policeReportNumber: true, citationIssuedTo: true, defendantName: true } })
      .catch(() => null),
    (prisma as any).liabilityDefendant.findMany({ where: { assessmentId }, select: { name: true } }).catch(() => [] as any[]),
    prisma.insuranceDetail
      .findMany({
        where: { assessmentId },
        select: { id: true, carrierName: true, policyNumber: true, claimNumber: true, policyLimit: true, insuredParty: true },
      })
      .catch(() => [] as any[]),
  ])
  const facts = parseFacts(assessment?.facts)
  const names = (defendants as any[]).map((d) => d.name).filter(Boolean)
  return {
    incidentDate: toIsoDay(facts?.incident?.date),
    policeReportNumber: record?.policeReportNumber ?? null,
    citationIssuedTo: record?.citationIssuedTo ?? null,
    defendantNames: names.length ? names : record?.defendantName ? [record.defendantName] : [],
    policies: policies as ConflictState['policies'],
  }
}

/** Attach each finding's conflicts with the case. */
export async function withConflicts(assessmentId: string, findings: FindingView[]): Promise<FindingView[]> {
  if (!findings.length) return findings
  const state = await loadConflictState(assessmentId)
  return findings.map((f) => (f.status === 'rejected' ? f : { ...f, conflicts: conflictsFor(f, state) }))
}

/**
 * Disagreements the attorney still has to resolve, one line each, naming the
 * file and page. Rejected findings are left out: rejecting a record is how the
 * attorney says it is wrong.
 */
export async function listRecordConflicts(assessmentId: string): Promise<string[]> {
  const rows = await (prisma as any).documentFinding
    .findMany({
      where: { assessmentId, status: { in: ['proposed', 'accepted'] } },
      select: { kind: true, data: true, pageNumber: true, evidenceFile: { select: { originalName: true } } },
      take: 500,
    })
    .catch(() => [] as any[])
  if (!rows.length) return []
  const state = await loadConflictState(assessmentId)
  const out: string[] = []
  for (const row of rows as any[]) {
    let data: any = {}
    try {
      data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data || {}
    } catch {
      data = {}
    }
    const where = `${row.evidenceFile?.originalName || 'Document'}${row.pageNumber ? `, p. ${row.pageNumber}` : ''}`
    for (const c of conflictsFor({ kind: row.kind, data }, state)) out.push(`${where}: ${c}`)
  }
  return [...new Set(out)]
}
