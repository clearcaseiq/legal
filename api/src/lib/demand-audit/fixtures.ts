/**
 * Synthetic regression case CCIQ-BPX79C (Stephen Hawking) from the Demand
 * Quality Audit spec. Fictional test material only.
 */
import type { SuperDemandContext } from '../super-demand'
import type { DeterministicInput, AuditFile } from './deterministic'

export const TODAY = new Date('2026-10-20T17:00:00Z')

export const CLEAN_LETTER = [
  'October 20, 2026',
  '',
  'Acme Insurance',
  'Re: Our client: Stephen Hawking; Claim Number: CLM-77881; Date of loss: October 12, 2026',
  '',
  'Dear Claims Representative:',
  '',
  'On October 12, 2026, Stephen Hawking was stopped at a red light when the other driver struck his vehicle from behind. The other driver was cited for following too closely, and a witness confirmed the account. See Exhibit 1.',
  '',
  'Stephen Hawking was seen at Bay Area Urgent Care on October 13, 2026 and diagnosed with a cervical strain (Ex. 2, p. 1). He began care at Pacific Physical Therapy on October 16, 2026 for a thoracic strain (Ex. 2, p. 2). See Exhibit 2.',
  '',
  'Medical specials (billed charges):',
  'Bay Area Urgent Care: $1,675',
  'Pacific Physical Therapy: $2,500',
  'Total medical specials: $4,175',
  'See Exhibit 3.',
  '',
  'Economic damages: $4,175',
  'General damages: $20,825',
  'Total damages: $25,000',
  '',
  'We demand $25,000 to settle this claim. Please respond within 30 days.',
  '',
  'Sincerely,',
].join('\n')

export function baseFiles(): AuditFile[] {
  return [
    {
      id: 'f-police',
      originalName: '01_Police_Report.pdf',
      category: 'police_report',
      identityCheck: null,
      contentHash: 'h-police',
      createdAt: new Date('2026-10-14T00:00:00Z'),
      ocrText: 'Traffic Collision Report. Date of Collision: 10/12/2026. Party 2 rear-ended Party 1. Citation issued to: Party 2 (VC 21703). Witness name: Jane Roe.',
    },
    {
      id: 'f-med',
      originalName: '02_Medical_Records_Stephen_Hawking.pdf',
      category: 'medical_records',
      identityCheck: null,
      contentHash: 'h-med',
      createdAt: new Date('2026-10-17T00:00:00Z'),
      ocrText: 'Patient: Stephen Hawking. Bay Area Urgent Care. Date of visit 10/13/2026. Assessment: cervical strain.\fPacific Physical Therapy. 10/16/2026. Assessment: thoracic strain.',
    },
    {
      id: 'f-bills',
      originalName: '05_Itemized_Medical_Bills_Stephen_Hawking.pdf',
      category: 'bills',
      identityCheck: null,
      contentHash: 'h-bills',
      createdAt: new Date('2026-10-18T00:00:00Z'),
      ocrText: 'Itemized statement. Claim Number CLM-77881. Bay Area Urgent Care $1,675.00. Pacific Physical Therapy $2,500.00. Total charges $4,175.00.',
    },
  ]
}

export function baseContext(): SuperDemandContext {
  return {
    sections: {
      totals: { medical: 4175, futureMedical: 0, lostWages: 0, earningCapacity: 0, otherEconomic: 0, specials: 4175, general: 20825, demand: 25000 },
    } as any,
    caseRecord: {
      clientName: 'Stephen Hawking',
      claim: { carrierName: 'Acme Insurance', claimNumber: 'CLM-77881', policyNumber: null },
      liability: { citationIssuedTo: 'Party 2', witnessCount: 1, comparativeNegPct: null, faultPosture: null },
      medical: {
        entries: [
          {
            provider: 'Bay Area Urgent Care',
            visitType: 'urgent_care',
            startDate: '2026-10-13',
            endDate: null,
            diagnosis: 'Cervical strain',
            sourceFileId: 'f-med',
            sourcePage: 1,
            sourceQuote: 'Assessment: cervical strain.',
          },
          {
            provider: 'Pacific Physical Therapy',
            visitType: 'physical_therapy',
            startDate: '2026-10-16',
            endDate: null,
            diagnosis: 'Thoracic strain',
            sourceFileId: 'f-med',
            sourcePage: 2,
            sourceQuote: 'Assessment: thoracic strain.',
          },
        ],
        status: { symptoms: [] },
      },
      damageItems: [
        { category: 'medical', description: 'Urgent care visit', amount: 1675, billed: 1675, provider: 'Bay Area Urgent Care', incurredAt: '2026-10-13', sourceFileId: 'f-bills', sourcePage: 1 },
        { category: 'medical', description: 'Physical therapy', amount: 2500, billed: 2500, provider: 'Pacific Physical Therapy', incurredAt: '2026-10-16', sourceFileId: 'f-bills', sourcePage: 1 },
      ],
      medicalSpecialsMeasure: 'billed',
      exhibits: [
        { number: 1, section: 'liability', label: 'Police report (01_Police_Report.pdf)', fileId: 'f-police' },
        { number: 2, section: 'treatment', label: 'Medical records (02_Medical_Records_Stephen_Hawking.pdf)', fileId: 'f-med' },
        { number: 3, section: 'bills', label: 'Medical bill (05_Itemized_Medical_Bills_Stephen_Hawking.pdf)', fileId: 'f-bills' },
      ],
      recordConflicts: [],
    },
    facts: { incident: { date: '2026-10-12' } },
    assessment: { claimType: 'auto', venueState: 'CA', referenceCode: 'CCIQ-BPX79C' },
    ledger: { entries: [], totalBilled: 0, firstVisit: null, lastVisit: null, providerCount: 0 },
  }
}

export function baseInput(overrides: Partial<DeterministicInput> = {}): DeterministicInput {
  return {
    content: CLEAN_LETTER,
    targetAmount: 25000,
    approvedDemandAmount: 25000,
    ctx: baseContext(),
    files: baseFiles(),
    enclosures: [],
    referenceCode: 'CCIQ-BPX79C',
    venueState: 'CA',
    sol: { status: 'ok' },
    pageCounts: new Map([
      ['f-police', 1],
      ['f-med', 2],
      ['f-bills', 1],
    ]),
    now: TODAY,
    ...overrides,
  }
}
