import { describe, expect, it } from 'vitest'
import { parseJsonText } from './tabular-import'
import {
  buildMatterPackagePlan,
  bundleCounts,
  bundleRecordKeys,
  detectMatterPackage,
  detectMatterPackageFromSheets,
  matterIsImportable,
} from './matter-package'

const today = new Date('2026-10-20T12:00:00Z')

const clioPackage = {
  matter_id: 'CLIO-DEMO-2026-0042',
  tables: {
    Matters: [
      {
        matter_id: 'CLIO-DEMO-2026-0042',
        client_id: 'C-1',
        practice_area: 'Car Accident',
        incident_date: '2026-10-12',
        state: 'California',
        county: 'Los Angeles',
        description: 'Rear-ended at a red light on Wilshire Blvd.',
      },
    ],
    Contacts: [
      { contact_id: 'C-1', first_name: 'Morgan', last_name: 'Ellis', email: 'morgan@example.com', phone: '213-555-0100', role: 'Client' },
      { contact_id: 'C-2', name: 'Dana Reyes', role: 'Adjuster', company: 'Acme Insurance' },
      { contact_id: 'C-3', name: 'Sam Carter', role: 'Defendant' },
    ],
    Medical_Visits: [
      { visit_id: 'V-1', matter_id: 'CLIO-DEMO-2026-0042', provider: 'Bay Urgent Care', visit_date: '2026-10-13', diagnosis: 'Cervical strain' },
      { visit_id: 'V-2', matter_id: 'CLIO-DEMO-2026-0042', provider: 'Pacific PT', visit_date: '2026-10-16' },
    ],
    Medical_Bills: [
      { bill_id: 'B-1', visit_id: 'V-1', amount: '$1,675.00', paid: '400' },
      { bill_id: 'B-2', visit_id: 'V-9', amount: '2500' },
      { bill_id: 'B-3', visit_id: 'V-2' },
    ],
    Insurance: [
      { policy_id: 'P-1', carrier: 'Acme Insurance', policy_limit: '100,000/300,000', claim_number: 'CL-77', coverage_type: 'Bodily Injury', insured: 'Defendant' },
    ],
    Tasks: [{ task_id: 'T-1', title: 'Request police report', due_date: '2026-11-01', status: 'Open' }],
    Notes: [{ note_id: 'N-1', note: 'Client called about rental car.', date: '2026-10-14', author: 'Paralegal' }],
    Negotiations: [{ id: 'NG-1', type: 'Demand', amount: '50000', date: '2026-10-18' }],
  },
}

describe('detectMatterPackage', () => {
  it('finds the tables under a tables envelope', () => {
    const tables = detectMatterPackage(clioPackage)
    expect(tables?.matters).toHaveLength(1)
    expect(tables?.contacts).toHaveLength(3)
    expect(tables?.medicalVisits).toHaveLength(2)
    expect(tables?.medicalBills).toHaveLength(3)
  })

  it('leaves a flat case list to the basic importer', () => {
    expect(detectMatterPackage({ cases: [{ first_name: 'A', incident_date: '2026-01-01' }] })).toBeNull()
    expect(detectMatterPackage([{ first_name: 'A' }])).toBeNull()
    expect(detectMatterPackage({ first_name: 'A', incident_date: '2026-01-01' })).toBeNull()
  })

  it('uses a root matter id when the package has no Matters table', () => {
    const { Matters: _m, ...rest } = clioPackage.tables
    const tables = detectMatterPackage({ matter_id: 'M-9', incident_date: '2026-10-01', state: 'CA', tables: rest })
    expect(tables?.matters?.[0]).toMatchObject({ matter_id: 'M-9' })
  })

  it('reads a workbook with one sheet per table', () => {
    const tables = detectMatterPackageFromSheets({
      Matters: clioPackage.tables.Matters,
      Contacts: clioPackage.tables.Contacts,
      Instructions: [{ text: 'read me' }],
    })
    expect(tables?.matters).toHaveLength(1)
    expect(tables?.unrecognized).toEqual(['Instructions'])
  })

  it('is what the basic importer was flattening into one row', () => {
    // The original bug: the whole package as a single row with table columns.
    const flat = parseJsonText(JSON.stringify(clioPackage))
    expect(flat.rows).toHaveLength(1)
    expect(flat.headers).toContain('tables.Contacts')
  })
})

describe('buildMatterPackagePlan', () => {
  const plan = buildMatterPackagePlan(detectMatterPackage(clioPackage)!, { today })
  const matter = plan.matters[0]

  it('extracts the client and case facts from the related tables', () => {
    expect(matter.externalId).toBe('CLIO-DEMO-2026-0042')
    expect(matter.client).toMatchObject({ firstName: 'Morgan', lastName: 'Ellis', email: 'morgan@example.com' })
    expect(matter.claimType).toBe('auto')
    expect(matter.incidentDate).toBe('2026-10-12')
    expect(matter.venueState).toBe('CA')
    expect(matter.venueCounty).toBe('Los Angeles')
    expect(matter.defendantName).toBe('Sam Carter')
    expect(matterIsImportable(matter)).toBe(true)
  })

  it('takes the description from the matter, never the notes table', () => {
    expect(matter.narrative).toContain('Rear-ended')
    expect(matter.narrative).not.toContain('rental car')
    expect(matter.notes[0].message).toContain('rental car')
  })

  it('links bills to visits and reports broken references', () => {
    expect(matter.bills.find((b) => b.key === 'medicalBills:B-1')).toMatchObject({ provider: 'Bay Urgent Care', amount: 1675, paidAmount: 400, incurredAt: '2026-10-13' })
    expect(matter.visits[0].billedAmount).toBe(1675)
    expect(matter.issues.some((i) => /visit V-9/.test(i.message))).toBe(true)
    expect(plan.issues.some((i) => i.table === 'medicalBills' && /B-3/.test(i.message))).toBe(true)
  })

  it('counts every related record for the preview', () => {
    expect(bundleCounts(matter)).toMatchObject({
      contacts: 3,
      medicalVisits: 2,
      medicalBills: 2,
      insurance: 1,
      tasks: 1,
      notes: 1,
      negotiations: 1,
    })
    expect(matter.insurance[0]).toMatchObject({ policyLimit: 100000, coverageType: 'liability', insuredParty: 'defendant' })
  })

  it('gives records stable keys so a re-import can tell what is new', () => {
    const again = buildMatterPackagePlan(detectMatterPackage(clioPackage)!, { today })
    expect(bundleRecordKeys(again.matters[0])).toEqual(bundleRecordKeys(matter))
  })

  it('blocks a matter with no client or date of loss', () => {
    const broken = structuredClone(clioPackage)
    broken.tables.Matters[0].incident_date = ''
    broken.tables.Contacts = broken.tables.Contacts.filter((c) => c.role !== 'Client')
    const result = buildMatterPackagePlan(detectMatterPackage(broken)!, { today })
    expect(matterIsImportable(result.matters[0])).toBe(false)
    const messages = result.matters[0].issues.filter((i) => i.severity === 'error').map((i) => i.message)
    expect(messages.some((m) => /client/i.test(m))).toBe(true)
    expect(messages.some((m) => /incident date/i.test(m))).toBe(true)
  })

  it('routes records by matter id across several matters and flags orphans', () => {
    const multi = {
      tables: {
        Matters: [
          { matter_id: 'M-1', incident_date: '2026-09-01', state: 'CA' },
          { matter_id: 'M-2', incident_date: '2026-09-02', state: 'TX' },
          { matter_id: 'M-1', incident_date: '2026-09-03', state: 'CA' },
        ],
        Contacts: [
          { contact_id: 'A', name: 'Ann Lee', matter_id: 'M-1', role: 'Client' },
          { contact_id: 'B', name: 'Bo Kim', matter_id: 'M-2', role: 'Client' },
        ],
        Tasks: [
          { id: 'T1', matter_id: 'M-2', title: 'Call client' },
          { id: 'T2', matter_id: 'M-404', title: 'Ghost' },
          { id: 'T3', title: 'Unrouted' },
        ],
      },
    }
    const result = buildMatterPackagePlan(detectMatterPackage(multi)!, { today })
    expect(result.matters.map((m) => m.externalId)).toEqual(['M-1', 'M-2'])
    expect(result.matters[1].tasks.map((t) => t.title)).toEqual(['Call client'])
    expect(result.matters[0].client?.firstName).toBe('Ann')
    const messages = result.issues.map((i) => i.message).join(' | ')
    expect(messages).toMatch(/M-1 appears more than once/)
    expect(messages).toMatch(/matter M-404/)
    expect(messages).toMatch(/no matter ID and the file holds several matters/)
  })

  it('falls back to the bar state with a warning', () => {
    const noState = structuredClone(clioPackage)
    noState.tables.Matters[0].state = ''
    const result = buildMatterPackagePlan(detectMatterPackage(noState)!, { today, fallbackState: 'NV' })
    expect(result.matters[0].venueState).toBe('NV')
    expect(result.matters[0].issues.some((i) => i.severity === 'warning' && /bar state/.test(i.message))).toBe(true)
  })
})
