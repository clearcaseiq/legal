/**
 * The six case-type hubs, as definitions only.
 *
 * Split from `caseTypeHubs` for the same reason `seoTopicHubDefs` is split from
 * `seoTopicHubs`: the home page, the footer and the route table need the slugs
 * and names on every route, and none of them should pull the full hub copy into
 * the shared bundle.
 *
 * A case type sits over the subject categories rather than replacing them. A
 * herniated disc page stays in Symptoms for the `/topics/` hubs and is also a
 * Car Accident / Injuries page for breadcrumbs and related links. URLs do not
 * change: the hierarchy is expressed in links and structured data, so pages that
 * already rank keep their addresses.
 */
import { START_ASSESSMENT_HREF } from './appRoutes'

/** When the hub copy in `caseTypeHubs` was last revised; sitemap `lastmod`. */
export const CASE_TYPE_HUBS_UPDATED = '2026-09-29'

export type CaseType = 'car' | 'slip_fall' | 'dog_bite' | 'pedestrian' | 'medmal' | 'wrongful_death'

export type CaseSection =
  | 'injuries'
  | 'treatment'
  | 'value'
  | 'liability'
  | 'insurance'
  | 'evidence'
  | 'deadlines'
  | 'attorney'
  | 'local'

/** The breadcrumb label for each section, and its heading on the hub. */
export const CASE_SECTION_LABELS: Record<CaseSection, string> = {
  injuries: 'Injuries',
  treatment: 'Treatment',
  value: 'Case value',
  liability: 'Fault and liability',
  insurance: 'Insurance',
  evidence: 'Evidence',
  deadlines: 'Deadlines',
  attorney: 'Working with a lawyer',
  local: 'Near you',
}

/**
 * Where each section lives on the hub page, for the breadcrumb's section link.
 * The hub has no separate "working with a lawyer" block; that question is
 * answered in its opening "do you have a claim" section.
 */
export const CASE_SECTION_ANCHORS: Record<CaseSection, string> = {
  injuries: 'injuries',
  treatment: 'treatment',
  value: 'value',
  liability: 'liability',
  insurance: 'insurance',
  evidence: 'evidence',
  deadlines: 'deadlines',
  attorney: 'claims',
  local: 'near-you',
}

export interface CaseTypeHubDef {
  caseType: CaseType
  slug: string
  /** The hub's H1 and title-tag stem. */
  title: string
  /** The plural used in breadcrumbs and navigation: "Car Accidents". */
  label: string
  description: string
  /** The case type's value page: first in every Related resources block. */
  valueSlug: string
  /**
   * The `?type=` preset the assessment understands (see `caseTypePreset`).
   * Absent where the intake has no single answer for it: a wrongful death claim
   * can arise from any incident type, so the case-type question stays open.
   */
  assessmentType?: string
}

export const caseTypeHubs: CaseTypeHubDef[] = [
  {
    caseType: 'car',
    slug: '/car-accident',
    title: 'Car Accident Claims in California',
    label: 'Car Accidents',
    description:
      'A guide to California car accident claims: common injuries, who is at fault, how insurance works, the evidence that matters, what affects value, and the filing deadline.',
    valueSlug: '/how-much-is-a-car-accident-case-worth',
    assessmentType: 'car',
  },
  {
    caseType: 'slip_fall',
    slug: '/slip-and-fall',
    title: 'Slip and Fall Claims in California',
    label: 'Slip & Fall',
    description:
      'A guide to California slip and fall claims: when a property owner is responsible, the injuries these falls cause, the evidence to preserve, what affects value, and the deadline.',
    valueSlug: '/how-much-is-a-slip-and-fall-case-worth',
    assessmentType: 'slip_fall',
  },
  {
    caseType: 'dog_bite',
    slug: '/dog-bite',
    title: 'Dog Bite Claims in California',
    label: 'Dog Bites',
    description:
      'A guide to California dog bite claims: strict liability under Civil Code 3342, scarring and infection, homeowner insurance, what affects value, and the filing deadline.',
    valueSlug: '/how-much-is-a-dog-bite-case-worth',
    assessmentType: 'dog_bite',
  },
  {
    caseType: 'pedestrian',
    slug: '/pedestrian-accident',
    title: 'Pedestrian Accident Claims in California',
    label: 'Pedestrian Accidents',
    description:
      'A guide to California pedestrian accident claims: right of way and fault, common injuries, the driver’s and your own insurance, evidence, what affects value, and the deadline.',
    valueSlug: '/how-much-is-a-pedestrian-accident-case-worth',
    assessmentType: 'pedestrian',
  },
  {
    caseType: 'medmal',
    slug: '/medical-malpractice',
    title: 'Medical Malpractice Claims in California',
    label: 'Medical Malpractice',
    description:
      'A guide to California medical malpractice claims: what counts as malpractice, how it is proven, MICRA damage limits, the records that matter, and the short filing deadlines.',
    valueSlug: '/how-much-is-a-medical-malpractice-case-worth-in-california',
    assessmentType: 'medmal',
  },
  {
    caseType: 'wrongful_death',
    slug: '/wrongful-death',
    title: 'Wrongful Death Claims in California',
    label: 'Wrongful Death',
    description:
      'A guide to California wrongful death claims: who can file, what damages the family can recover, how a survival action differs, the evidence involved, and the deadline.',
    valueSlug: '/how-much-is-a-wrongful-death-case-worth-in-california',
  },
]

export const caseTypeHubByType = new Map(caseTypeHubs.map((hub) => [hub.caseType, hub]))
export const caseTypeHubBySlug = new Map(caseTypeHubs.map((hub) => [hub.slug, hub]))

/** A fresh assessment with the case type already answered, where the intake has one. */
export function caseTypeAssessmentHref(caseType: CaseType): string {
  const type = caseTypeHubByType.get(caseType)?.assessmentType
  return type ? `${START_ASSESSMENT_HREF}&type=${type}` : START_ASSESSMENT_HREF
}
