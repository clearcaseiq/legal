import { describe, expect, it } from 'vitest'
import { CASE_SECTIONS, CASE_TAB_GROUPS, groupForSection, resolveCaseSection, TAB_TO_SECTION } from './caseSections'
import { resolveTaskPrimaryAction, sectionForTaskAction, type TaskPrimaryActionKind } from './taskPrimaryActions'

const DOCUMENTS_VIEW_LABEL: Record<string, string> = {
  files: 'All files',
  requests: 'Requests',
  signatures: 'Signatures',
  templates: 'Templates',
}

/** "Tab > Subtab" a case URL segment opens, including the Documents subtab from `?view=`. */
const where = (segment: string) => {
  const section = resolveCaseSection(segment)
  const base = `${groupForSection(section).label} > ${section}`
  if (section !== 'Documents') return base
  const view = new URLSearchParams(segment.split('?')[1] || '').get('view')
  return view ? `${base} > ${DOCUMENTS_VIEW_LABEL[view]}` : base
}

describe('case tab groups', () => {
  it('puts every section in exactly one group', () => {
    const grouped = CASE_TAB_GROUPS.flatMap((g) => g.sections)
    expect([...grouped].sort()).toEqual([...CASE_SECTIONS].sort())
  })

  it('round-trips every section through its URL segment', () => {
    for (const section of CASE_SECTIONS) expect(resolveCaseSection(TAB_TO_SECTION[section])).toBe(section)
  })
})

describe('task buttons open the right tab', () => {
  // [action, while the task is open, once it is done]
  const expected: Array<[TaskPrimaryActionKind, string, string]> = [
    ['send_retainer', 'Documents > Documents > Signatures', 'Documents > Documents > Signatures'],
    ['check_retainer', 'Documents > Documents > Signatures', 'Documents > Documents > Signatures'],
    ['send_welcome', 'Documents > Documents > Signatures', 'Documents > Documents > Signatures'],
    ['open_signatures', 'Documents > Documents > Signatures', 'Documents > Documents > Signatures'],
    ['send_hipaa', 'Documents > Documents > Signatures', 'Documents > Documents > Signatures'],
    ['collect_police', 'Documents > Documents > Requests', 'Documents > Documents > All files'],
    ['collect_medical_records', 'Documents > Documents > Requests', 'Documents > Documents > All files'],
    ['collect_bills', 'Documents > Documents > Requests', 'Documents > Documents > All files'],
    ['collect_item', 'Documents > Documents > Requests', 'Documents > Documents > All files'],
    ['open_evidence', 'Documents > Documents > All files', 'Documents > Documents > All files'],
    ['send_lor', 'Claim > Insurance', 'Claim > Insurance'],
    ['open_insurance', 'Claim > Insurance', 'Claim > Insurance'],
    ['open_liability', 'Claim > Liability', 'Claim > Liability'],
    ['open_damages', 'Claim > Damages', 'Claim > Damages'],
    ['send_lor_providers', 'Medical > Medical', 'Medical > Medical'],
    ['open_medical', 'Medical > Medical', 'Medical > Medical'],
    ['open_overview', 'Overview > Overview', 'Overview > Overview'],
    ['open_client_info', 'Overview > Client Info', 'Overview > Client Info'],
    ['open_demand', 'Resolution > Demand', 'Resolution > Demand'],
    ['open_negotiation', 'Resolution > Negotiation', 'Resolution > Negotiation'],
    ['open_settlement', 'Resolution > Settlement', 'Resolution > Settlement'],
    ['open_workflow', 'Tasks > Workflow', 'Tasks > Workflow'],
  ]

  it.each(expected)('%s opens %s (done: %s)', (kind, open, done) => {
    expect(where(sectionForTaskAction(kind)!)).toBe(open)
    expect(where(sectionForTaskAction(kind, { done: true })!)).toBe(done)
  })

  it('opens the send form for unsent retainer and HIPAA tasks only', () => {
    expect(sectionForTaskAction('send_retainer')).toContain('doc=retainer')
    expect(sectionForTaskAction('send_hipaa')).toContain('doc=hipaa_authorization')
    expect(sectionForTaskAction('send_retainer', { done: true })).not.toContain('doc=')
    expect(sectionForTaskAction('send_hipaa', { done: true })).not.toContain('doc=')
  })

  it('opens carrier and provider letters only while the task is open', () => {
    expect(sectionForTaskAction('send_lor')).toBe('insurance?letter=1')
    expect(sectionForTaskAction('send_lor', { done: true })).toBe('insurance')
    expect(sectionForTaskAction('send_lor_providers', { done: true })).toBe('medical')
  })

  it('has no destination for actions handled in place', () => {
    expect(sectionForTaskAction('run_conflict')).toBeNull()
    expect(sectionForTaskAction('open_task_detail')).toBeNull()
  })
})

describe('generated tasks open the right tab', () => {
  it.each([
    ['Send retainer to client', 'Documents > Documents > Signatures'],
    ['Confirm signed representation agreement', 'Documents > Documents > Signatures'],
    ['Send client welcome packet', 'Documents > Documents > Signatures'],
    ['Send HIPAA authorization', 'Documents > Documents > Signatures'],
    ['Request police / incident report', 'Documents > Documents > Requests'],
    ['Request medical records', 'Documents > Documents > Requests'],
    ['Request medical bills', 'Documents > Documents > Requests'],
    ['Collect Wage verification', 'Documents > Documents > Requests'],
    ['All medical records & bills received', 'Documents > Documents > All files'],
    ['Send Letter of Representation (LOR)', 'Claim > Insurance'],
    ['Confirm defendant insurance carrier / claim number', 'Claim > Insurance'],
    ['Gather photos, witness statements & scene evidence', 'Claim > Liability'],
    ['Compile special damages summary', 'Claim > Damages'],
    ['Send letters of representation to providers', 'Medical > Medical'],
    ['Monitor ongoing treatment', 'Medical > Medical'],
    ['Draft demand letter', 'Resolution > Demand'],
    ['Demand sent to carrier', 'Resolution > Negotiation'],
    ['Adjuster offer received', 'Resolution > Negotiation'],
    ['Counter & negotiate', 'Resolution > Negotiation'],
    ['Execute release & settlement documents', 'Resolution > Settlement'],
    ['Close matter', 'Resolution > Settlement'],
    ['Verify client contact information', 'Overview > Client Info'],
  ])('"%s" opens %s', (title, target) => {
    const action = resolveTaskPrimaryAction({ title })
    expect(where(sectionForTaskAction(action!.kind)!)).toBe(target)
  })
})

describe('legacy links', () => {
  it.each([
    ['evidence', 'Documents > Documents'],
    ['signatures', 'Documents > Documents'],
    ['retainer', 'Documents > Documents'],
    ['client-info', 'Overview > Client Info'],
    ['contacts', 'Overview > Client Info'],
    ['timeline', 'Overview > Timeline'],
    ['chronology', 'Overview > Timeline'],
    ['copilot', 'AI > AI Copilot'],
    ['rose', 'AI > Rose'],
    ['coverage', 'Claim > Insurance'],
    ['invoices', 'Billing > Billing'],
    ['time', 'Billing > Time'],
    ['collaboration', 'Billing > Referrals'],
    ['TASKS', 'Tasks > Tasks'],
    ['nonsense', 'Overview > Overview'],
  ])('%s opens %s', (segment, target) => {
    expect(where(segment)).toBe(target)
  })
})
