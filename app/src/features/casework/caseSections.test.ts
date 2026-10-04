import { describe, expect, it } from 'vitest'
import { CASE_SECTIONS, CASE_TAB_GROUPS, groupForSection, resolveCaseSection, TAB_TO_SECTION } from './caseSections'
import { sectionForTaskAction, type TaskPrimaryActionKind } from './taskPrimaryActions'

const where = (segment: string) => {
  const section = resolveCaseSection(segment)
  return `${groupForSection(section).label} > ${section}`
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
  const expected: Array<[TaskPrimaryActionKind, string]> = [
    ['send_retainer', 'Documents > Documents'],
    ['check_retainer', 'Documents > Documents'],
    ['send_welcome', 'Documents > Documents'],
    ['open_signatures', 'Documents > Documents'],
    ['send_hipaa', 'Documents > Documents'],
    ['collect_police', 'Documents > Documents'],
    ['open_evidence', 'Documents > Documents'],
    ['collect_medical_records', 'Documents > Documents'],
    ['collect_bills', 'Documents > Documents'],
    ['send_lor', 'Claim > Insurance'],
    ['open_insurance', 'Claim > Insurance'],
    ['open_liability', 'Claim > Liability'],
    ['open_damages', 'Claim > Damages'],
    ['send_lor_providers', 'Medical > Medical'],
    ['open_medical', 'Medical > Medical'],
    ['open_overview', 'Overview > Overview'],
    ['open_client_info', 'Overview > Client Info'],
    ['open_demand', 'Resolution > Demand'],
    ['open_negotiation', 'Resolution > Negotiation'],
    ['open_settlement', 'Resolution > Settlement'],
    ['open_workflow', 'Tasks > Workflow'],
  ]

  it.each(expected)('%s opens %s', (kind, target) => {
    const section = sectionForTaskAction(kind)
    expect(section).not.toBeNull()
    expect(where(section!)).toBe(target)
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
