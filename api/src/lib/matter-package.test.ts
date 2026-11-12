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
      'START HERE': [{ text: 'Import instructions' }],
      'FIELD MAPPING': [{ source: 'Matter ID', target: 'matter_id' }],
      Instructions: [{ text: 'read me' }],
    })
    expect(tables?.matters).toHaveLength(1)
    expect(tables?.unrecognized).toEqual(['Instructions'])
  })

  it('combines separate Clio CSV table names and keeps legal bills separate from medical specials', () => {
    const tables = detectMatterPackageFromSheets({
      'matters.csv': clioPackage.tables.Matters,
      'contacts.csv': clioPackage.tables.Contacts,
      'custom_fields.csv': [
        { id: 'CF-1', matter_id: 'CLIO-DEMO-2026-0042', field_name: 'Date of Loss', value: '2026-10-11' },
      ],
      'calendar_event.csv': [
        { id: 'CE-1', matter_id: 'CLIO-DEMO-2026-0042', title: 'Client conference', due_date: '2026-10-25' },
      ],
      'bills.csv': [{ id: 'INV-1', matter_id: 'CLIO-DEMO-2026-0042', total: '1200' }],
      'time_entries.csv': [{ id: 'TE-1', matter_id: 'CLIO-DEMO-2026-0042', date: '2026-10-19', quantity: '1.0' }],
    })

    expect(tables?.matters).toHaveLength(1)
    expect(tables?.customFields).toHaveLength(1)
    expect(tables?.tasks).toHaveLength(1)
    expect(tables?.medicalBills).toBeUndefined()
    expect(tables?.billingInvoices).toHaveLength(1)
    expect(tables?.timeEntries).toHaveLength(1)
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

  it('uses Clio custom fields as matter facts', () => {
    const tables = detectMatterPackageFromSheets({
      matters: [{ matter_id: 'M-CUSTOM', client_id: 'C-CUSTOM', practice_area: 'MVA' }],
      contacts: [{ id: 'C-CUSTOM', first_name: 'Casey', last_name: 'Client' }],
      custom_fields: [
        { id: 'CF-1', matter_id: 'M-CUSTOM', field_name: 'Date of Loss', value: '2026-08-14' },
        { id: 'CF-2', matter_id: 'M-CUSTOM', field_name: 'Venue State', value: 'TX' },
        { id: 'CF-3', matter_id: 'M-CUSTOM', field_name: 'Injuries', value: 'Cervical strain; concussion' },
      ],
    })!
    const imported = buildMatterPackagePlan(tables, { today }).matters[0]

    expect(imported.incidentDate).toBe('2026-08-14')
    expect(imported.venueState).toBe('TX')
    expect(imported.injuryDiagnoses).toEqual(['Cervical strain', 'concussion'])
    expect(matterIsImportable(imported)).toBe(true)
  })

  it('imports Clio legal bills and time entries without treating them as medical damages', () => {
    const tables = detectMatterPackageFromSheets({
      matters: [{ matter_id: 'M-BILLING', client_id: 'C-BILLING', incident_date: '2026-07-01', state: 'CA' }],
      contacts: [{ id: 'C-BILLING', first_name: 'Bill', last_name: 'Client' }],
      bills: [{ id: 'BILL-9', matter_id: 'M-BILLING', total_usd: '1250', due_date: '2026-11-15', status: 'Awaiting Payment' }],
      time_entries: [{
        id: 'TIME-2',
        matter: 'M-BILLING',
        date: '2026-10-18',
        activity_description: 'Client call',
        note: 'Discussed treatment status',
        price: '400',
        quantity: '1.5',
      }],
    })!
    const imported = buildMatterPackagePlan(tables, { today }).matters[0]

    expect(imported.bills).toEqual([])
    expect(imported.billingInvoices[0]).toMatchObject({ invoiceNumber: 'BILL-9', amount: 1250, status: 'open' })
    expect(imported.timeEntries[0]).toMatchObject({
      workDate: '2026-10-18',
      minutes: 90,
      activityType: 'client_call',
      hourlyRate: 400,
      amount: 600,
    })
    expect(bundleCounts(imported)).toMatchObject({ medicalBills: 0, billingInvoices: 1, timeEntries: 1 })
  })

  it('reads nested Clio API custom-field relationships', () => {
    const tables = detectMatterPackageFromSheets({
      matters: [{ id: 'M-NESTED', client_id: 'C-NESTED', state: 'CA' }],
      contacts: [{ id: 'C-NESTED', name: 'Nested Client' }],
      custom_fields: [{
        id: 'VALUE-1',
        parent: { id: 'M-NESTED', type: 'Matter' },
        custom_field: { id: 'FIELD-1', name: 'Date of Loss' },
        value: '2026-06-15',
      }],
    })!

    const imported = buildMatterPackagePlan(tables, { today }).matters[0]
    expect(imported.incidentDate).toBe('2026-06-15')
    expect(matterIsImportable(imported)).toBe(true)
  })

  it('plans a large multi-matter Clio package without crossing records', () => {
    const size = 500
    const matters = Array.from({ length: size }, (_, index) => ({
      matter_id: `M-${index}`,
      client_id: `C-${index}`,
      incident_date: '2026-01-15',
      state: 'CA',
    }))
    const contacts = Array.from({ length: size }, (_, index) => ({
      id: `C-${index}`,
      first_name: `Client${index}`,
    }))
    const tasks = Array.from({ length: size }, (_, index) => ({
      id: `T-${index}`,
      matter_id: `M-${index}`,
      title: `Task ${index}`,
    }))
    const tables = detectMatterPackageFromSheets({ matters, contacts, tasks })!
    const plan = buildMatterPackagePlan(tables, { today })

    expect(plan.matters).toHaveLength(size)
    expect(plan.matters[499].client?.firstName).toBe('Client499')
    expect(plan.matters[499].tasks[0].title).toBe('Task 499')
    expect(plan.matters.every(matterIsImportable)).toBe(true)
  })

  it('normalizes a relational Filevine export with native project IDs', () => {
    const tables = detectMatterPackageFromSheets({
      'projects.csv': [{
        projectId: { native: 9001 },
        projectName: 'FV-9001',
        projectTypeCode: 'MVA',
        incidentDate: '2026-05-04',
        state: 'TX',
      }],
      'people.csv': [{
        personId: { native: 44 },
        projectId: { native: 9001 },
        firstName: 'Fiona',
        lastName: 'Vine',
        role: 'Client',
      }],
      'project_tasks.csv': [{
        id: 81,
        projectId: { native: 9001 },
        title: 'Request crash report',
        dueDate: '2026-06-01',
      }],
    })!
    const matter = buildMatterPackagePlan(tables, { today }).matters[0]

    expect(matter.externalId).toBe('9001')
    expect(matter.client).toMatchObject({ firstName: 'Fiona', lastName: 'Vine' })
    expect(matter.tasks[0].title).toBe('Request crash report')
    expect(matterIsImportable(matter)).toBe(true)
  })

  it('normalizes Needles cases, names, and case notes', () => {
    const tables = detectMatterPackageFromSheets({
      'cases.csv': [{
        case_num: 'ND-77',
        classification: 'Auto Accident',
        date_of_loss: '2026-04-03',
        state: 'FL',
      }],
      'names.csv': [{
        name_id: 'NAME-7',
        case_num: 'ND-77',
        name: 'Nina Needles',
        role: 'Plaintiff',
      }],
      'case_notes.csv': [{
        note_id: 'NOTE-1',
        case_num: 'ND-77',
        note: 'Initial client interview complete.',
      }],
    })!
    const matter = buildMatterPackagePlan(tables, { today }).matters[0]

    expect(matter.externalId).toBe('ND-77')
    expect(matter.client).toMatchObject({ firstName: 'Nina', lastName: 'Needles' })
    expect(matter.notes[0].message).toContain('Initial client interview')
    expect(matterIsImportable(matter)).toBe(true)
  })

  it('normalizes Litify namespaced Salesforce objects and fields', () => {
    const tables = detectMatterPackageFromSheets({
      'litify_pm__Matter__c.csv': [{
        Id: 'a0M9001',
        litify_pm__Client__c: '001CLIENT',
        litify_pm__Date_of_Loss__c: '2026-03-02',
        litify_pm__Practice_Area__c: 'Motor Vehicle Accident',
        litify_pm__State__c: 'CA',
      }],
      'Account.csv': [{
        Id: '001CLIENT',
        Name: 'Lily Litify',
      }],
      'Task.csv': [{
        Id: '00T1',
        WhatId: 'a0M9001',
        Subject: 'Order collision report',
        ActivityDate: '2026-03-20',
      }],
    })!
    const matter = buildMatterPackagePlan(tables, { today }).matters[0]

    expect(matter.externalId).toBe('a0M9001')
    expect(matter.client).toMatchObject({ firstName: 'Lily', lastName: 'Litify' })
    expect(matter.incidentDate).toBe('2026-03-02')
    expect(matter.claimType).toBe('auto')
    expect(matter.tasks[0].title).toBe('Order collision report')
    expect(matterIsImportable(matter)).toBe(true)
  })
})
