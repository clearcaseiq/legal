/**
 * Case workspace navigation: the sections a case URL can open
 * (`/attorney-dashboard/cases/:leadId/:section`) and the top-level tabs that
 * group them. A section keeps its own URL, so links and task buttons that
 * point at `insurance` open the Claim tab on its Insurance subtab.
 */

export const CASE_SECTIONS = [
  'Overview',
  'Client Info',
  'Timeline',
  'Tasks',
  'Workflow',
  'AI Copilot',
  'Rose',
  'Documents',
  'Medical',
  'Liability',
  'Insurance',
  'Damages',
  'Demand',
  'Negotiation',
  'Settlement',
  'Time',
  'Billing',
  'Referrals',
] as const
export type CaseSection = (typeof CASE_SECTIONS)[number]

export type CaseTabGroup = {
  id: string
  label: string
  /** Subtabs in display order; the first is where the tab button lands. */
  sections: CaseSection[]
}

export const CASE_TAB_GROUPS: CaseTabGroup[] = [
  { id: 'overview', label: 'Overview', sections: ['Overview', 'Client Info', 'Timeline'] },
  { id: 'tasks', label: 'Tasks', sections: ['Tasks', 'Workflow'] },
  { id: 'ai', label: 'AI', sections: ['AI Copilot', 'Rose'] },
  { id: 'documents', label: 'Documents', sections: ['Documents'] },
  { id: 'medical', label: 'Medical', sections: ['Medical'] },
  { id: 'claim', label: 'Claim', sections: ['Liability', 'Insurance', 'Damages'] },
  { id: 'resolution', label: 'Resolution', sections: ['Demand', 'Negotiation', 'Settlement'] },
  { id: 'billing', label: 'Billing', sections: ['Time', 'Billing', 'Referrals'] },
]

/** Subtab label, where it differs from the section name. */
export const SECTION_SUBTAB_LABEL: Partial<Record<CaseSection, string>> = {
  Overview: 'Summary',
  'Client Info': 'Client info',
  Timeline: 'Activity',
  Tasks: 'Queue',
  'AI Copilot': 'Ask Copilot',
  Billing: 'Invoices',
}

export const SECTION_TO_TAB: Record<string, CaseSection> = {
  overview: 'Overview',
  deadlines: 'Overview',
  'case-insights': 'Overview',
  recommendations: 'Overview',
  info: 'Client Info',
  'client-info': 'Client Info',
  'client-contact': 'Client Info',
  client: 'Client Info',
  contact: 'Client Info',
  contacts: 'Client Info',
  timeline: 'Timeline',
  activity: 'Timeline',
  chronology: 'Timeline',
  tasks: 'Tasks',
  workflow: 'Workflow',
  copilot: 'AI Copilot',
  'ai-copilot': 'AI Copilot',
  companion: 'AI Copilot',
  ai: 'AI Copilot',
  rose: 'Rose',
  'ai-manager': 'Rose',
  'ai-case-manager': 'Rose',
  // Evidence and Signatures were merged into Documents; their old links land there.
  documents: 'Documents',
  evidence: 'Documents',
  inbox: 'Documents',
  'document-inbox': 'Documents',
  texted: 'Documents',
  signatures: 'Documents',
  esign: 'Documents',
  retainer: 'Documents',
  medical: 'Medical',
  liability: 'Liability',
  fault: 'Liability',
  claim: 'Liability',
  insurance: 'Insurance',
  coverage: 'Insurance',
  damages: 'Damages',
  demand: 'Demand',
  resolution: 'Demand',
  negotiation: 'Negotiation',
  settlement: 'Settlement',
  time: 'Time',
  billing: 'Billing',
  invoices: 'Billing',
  invoice: 'Billing',
  payments: 'Billing',
  referrals: 'Referrals',
  referral: 'Referrals',
  'co-counsel': 'Referrals',
  collaboration: 'Referrals',
  sharing: 'Referrals',
}

export const TAB_TO_SECTION: Record<CaseSection, string> = {
  Overview: 'overview',
  'Client Info': 'client-info',
  Timeline: 'timeline',
  Tasks: 'tasks',
  Workflow: 'workflow',
  'AI Copilot': 'copilot',
  Rose: 'rose',
  Documents: 'documents',
  Medical: 'medical',
  Liability: 'liability',
  Insurance: 'insurance',
  Damages: 'damages',
  Demand: 'demand',
  Negotiation: 'negotiation',
  Settlement: 'settlement',
  Time: 'time',
  Billing: 'billing',
  Referrals: 'referrals',
}

/** The section a URL segment opens; unknown segments land on Overview. */
export function resolveCaseSection(segment?: string | null): CaseSection {
  const key = String(segment || 'overview').split('?')[0].trim().toLowerCase()
  return SECTION_TO_TAB[key] ?? 'Overview'
}

export function groupForSection(section: CaseSection): CaseTabGroup {
  return CASE_TAB_GROUPS.find((g) => g.sections.includes(section)) ?? CASE_TAB_GROUPS[0]
}
