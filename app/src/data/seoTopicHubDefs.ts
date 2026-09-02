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
// Kept under MAX_DESCRIPTION_LENGTH (155). Past it `clampDescription` truncates,
// which on a list like this one would cut the last topics off mid-sentence.
export const TOPICS_INDEX_DESCRIPTION =
  'Browse every ClearCaseIQ topic: injuries, treatment, settlement value, insurance, liability, California city guides, filing deadlines, and attorneys.'

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
    slug: '/topics/california-cities',
    category: 'Cities',
    title: 'California City Injury Guides',
    eyebrow: 'Local guide',
    description:
      'City-by-city guides to California injury claims: the local courts, the agencies and transit operators involved, and the deadlines that attach.',
    intro:
      'Where a crash happened changes which court hears the case, which agency holds the report, and whether a six-month public-entity deadline applies. These guides cover each city and the claim types that come up most often there.',
  },
  {
    slug: '/topics/claim-types',
    category: 'Claim Types',
    title: 'Do You Have a Claim?',
    eyebrow: 'Eligibility review',
    description:
      'Whether a California injury claim exists at all: who has standing to file, what makes a case viable, and how claim types differ from one another.',
    intro:
      'Before value or timing matters, there is a prior question — is there a claim, and whose is it. These pages cover standing, viability, and what separates one kind of claim from another.',
  },
  {
    slug: '/topics/filing-deadlines',
    category: 'Statute of Limitations',
    title: 'California Filing Deadlines',
    eyebrow: 'Deadline review',
    description:
      'California statutes of limitations by claim type, the shorter government-claim deadlines, and what happens when a deadline has already passed.',
    intro:
      'A missed deadline ends a claim regardless of its merits, and the clock is shorter than most people expect when a public entity or a medical provider is involved. These pages cover the deadline for each claim type and the exceptions that move it.',
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
