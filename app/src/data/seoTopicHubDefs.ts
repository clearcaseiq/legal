/**
 * Topic hub definitions, deliberately free of any dependency on the landing page
 * content.
 *
 * `App.tsx` and `marketingPages` only need the hub slugs and titles, and both are
 * loaded on every route. Importing them from a module that also pulls in
 * `allLandingPages` put the full text of all 173 landing pages into the shared
 * client chunk — about 400 KB of prose shipped to someone opening /login. The
 * helpers that genuinely need the page list live in `seoTopicHubs`, which is only
 * reached from lazily loaded routes.
 */
import type { LandingPageCategory } from './seoLandingPages'

export type TopicHub = {
  slug: string
  category: LandingPageCategory
  /** Hub heading, also the base of its SEO title. */
  title: string
  eyebrow: string
  description: string
  intro: string
}

export const TOPICS_INDEX_SLUG = '/topics'
export const TOPICS_INDEX_TITLE = 'Injury Claim Topic Library'
export const TOPICS_INDEX_DESCRIPTION =
  'Browse every ClearCaseIQ topic on injuries, treatment, settlement value, insurance disputes, liability, and working with an attorney.'

export const topicHubs: TopicHub[] = [
  {
    slug: '/topics/injuries-and-symptoms',
    category: 'Symptoms',
    title: 'Injury and Symptom Topics',
    eyebrow: 'Symptom review',
    description:
      'Symptom-by-symptom guides on injuries after an accident — what to track, when delayed pain matters, and which findings change a claim.',
    intro:
      'What you feel after a crash, when it started, and how it was documented all shape the claim. These pages cover the injuries we see most often and the details that matter for each.',
  },
  {
    slug: '/topics/treatment-and-recovery',
    category: 'Treatment',
    title: 'Treatment and Recovery Topics',
    eyebrow: 'Treatment review',
    description:
      'Guides on medical care after an accident: imaging, physical therapy, treatment gaps, specialist referrals, and reaching maximum medical improvement.',
    intro:
      'Treatment records are the backbone of an injury claim. These pages explain what each stage of care documents and how gaps or delays get read later.',
  },
  {
    slug: '/topics/settlement-value',
    category: 'Settlement',
    title: 'Settlement Value Topics',
    eyebrow: 'Valuation review',
    description:
      'How injury settlements are valued by injury type — what drives the range, what the documentation has to show, and where estimates go wrong.',
    intro:
      'Settlement value follows from injury severity, treatment, liability, and documented economic loss. These pages break that down by injury and claim type.',
  },
  {
    slug: '/topics/insurance-disputes',
    category: 'Insurance',
    title: 'Insurance Dispute Topics',
    eyebrow: 'Carrier review',
    description:
      'What to do when an insurer denies, delays, or lowballs an injury claim — common carrier arguments and the documentation that answers them.',
    intro:
      'Most disputes come down to a handful of recurring arguments about causation, treatment timing, and severity. These pages cover each and what tends to answer it.',
  },
  {
    slug: '/topics/fault-and-liability',
    category: 'Liability',
    title: 'Fault and Liability Topics',
    eyebrow: 'Liability review',
    description:
      'How fault is established and disputed in injury claims: police reports, comparative negligence, witnesses, video, and shared-fault scenarios.',
    intro:
      'Liability decides whether a well-documented injury turns into a recovery. These pages cover how fault is proven, shared, and contested.',
  },
  {
    slug: '/topics/commercial-and-rideshare',
    category: 'Commercial',
    title: 'Rideshare and Commercial Claims',
    eyebrow: 'Coverage review',
    description:
      'Rideshare, trucking, delivery, and employer-vehicle claims — how commercial coverage changes available limits and who is responsible.',
    intro:
      'When a commercial policy is involved the available coverage and the number of parties both change. These pages cover the common scenarios.',
  },
  {
    slug: '/topics/working-with-an-attorney',
    category: 'Attorney Intent',
    title: 'Working With an Injury Attorney',
    eyebrow: 'Attorney review',
    description:
      'When to involve an injury attorney, how contingency fees work, what a firm looks for in a case, and how to prepare before the first call.',
    intro:
      'These pages cover the decision to hire a lawyer and what happens around it — fees, timing, case selection, and how to arrive prepared.',
  },
  {
    slug: '/topics/guides',
    category: 'Educational / SEO Moat',
    title: 'Injury Claim Guides',
    eyebrow: 'Reference',
    description:
      'Reference guides on California injury claims: filing deadlines, medical records, documentation checklists, and how claims are actually reviewed.',
    intro:
      'Longer reference material on process and paperwork — deadlines, records, and how a claim file is put together and read.',
  },
]

export const topicHubBySlug = new Map(topicHubs.map((hub) => [hub.slug, hub]))
export const topicHubByCategory = new Map(topicHubs.map((hub) => [hub.category, hub]))

export function hubForPage(page: { category: LandingPageCategory }): TopicHub | undefined {
  return topicHubByCategory.get(page.category)
}
