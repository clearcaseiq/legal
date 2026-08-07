import { cityLocalFacts } from './seoCityLocalFacts'
import type { LandingPage } from './seoLandingPages'

export const DEFAULT_SITE_URL = 'https://www.clearcaseiq.com'

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL

type Faq = { q: string; a: string }

/**
 * The two disclaimers that genuinely belong on every page.
 *
 * Everything else is topic-specific. A single block of ten shared FAQs used to
 * be appended to all 173 pages, which left roughly half of each page identical
 * to every other one — the kind of templated bulk that makes a large content
 * library look thin to a search engine.
 */
const universalFaqs: Faq[] = [
  { q: 'Can ClearCaseIQ tell me exactly what my case is worth?', a: 'No tool can guarantee a result. ClearCaseIQ provides a preliminary intelligence report based on available facts, documents, and underwriting signals.' },
  { q: 'Is this legal advice?', a: 'No. ClearCaseIQ is not a law firm. The report is educational and can help organize information for possible attorney review.' },
]

const medicalFaqs: Faq[] = [
  { q: 'Does delayed pain after an accident matter?', a: 'Yes. Many serious injuries develop gradually after a crash. The key is documenting when symptoms started, when they worsened, and when you sought medical care.' },
  { q: 'Should I get an MRI after an accident?', a: 'That is a medical decision for a provider. From a case-readiness perspective, MRI findings can help document disc, ligament, soft-tissue, or nerve-related injuries when symptoms persist.' },
  { q: 'Will a treatment gap hurt my case?', a: 'A gap can create questions, but it may be explainable. Work conflicts, insurance delays, referral delays, transportation issues, or provider availability should be documented.' },
  { q: 'What if symptoms worsen later?', a: 'Worsening symptoms should be medically evaluated. Keep a timeline of changes and upload new records because escalation can change severity, confidence, and next steps.' },
]

const valuationFaqs: Faq[] = [
  { q: 'Does surgery increase settlement value?', a: 'Surgery or a surgery recommendation is often a high-impact severity signal, but value still depends on liability, causation, coverage, prior history, and recovery outcome.' },
  { q: 'Why do settlement ranges vary so widely?', a: 'Two claims with the same diagnosis can settle very differently depending on liability, available policy limits, treatment continuity, wage loss, and how well the file is documented.' },
  { q: 'Do medical bills set the value of a claim?', a: 'Bills are one input, not the answer. Insurers weigh causation, necessity, the treatment timeline, and what a jury in that venue is likely to do.' },
]

const insuranceFaqs: Faq[] = [
  { q: 'What if insurance denies treatment or says it was unnecessary?', a: 'Save the denial, explanation of benefits, adjuster emails, provider notes, and bills. The reason for denial can become an important litigation-readiness signal.' },
  { q: 'What happens if the other driver has no insurance?', a: 'Uninsured and underinsured motorist coverage on your own policy may respond. Check the declarations page, because this coverage is often present without the policyholder realising it.' },
  { q: 'Should I give a recorded statement to the other insurer?', a: 'You are generally not required to give one to the other side\u2019s insurer. Statements taken early, before the full injury picture is known, are frequently used to dispute severity later.' },
]

const liabilityFaqs: Faq[] = [
  { q: 'What if I was partly at fault?', a: 'California uses comparative fault, so being partly responsible reduces recovery rather than eliminating it. How fault is apportioned is often disputed and evidence-driven.' },
  { q: 'What evidence matters most when fault is disputed?', a: 'Scene photographs, dashcam or surveillance video, independent witnesses, vehicle damage patterns, and the police report narrative tend to carry the most weight.' },
  { q: 'Does a police report decide who was at fault?', a: 'No. An officer\u2019s opinion is influential but not binding, and reports are sometimes corrected when additional evidence surfaces.' },
]

const processFaqs: Faq[] = [
  { q: 'What documents are most useful?', a: 'Police reports, photos, medical records, bills, MRI reports, PT notes, wage loss proof, insurance letters, and witness information are usually high-value documents.' },
  { q: 'How long does a personal injury claim take?', a: 'It depends mainly on how long treatment continues, because a claim is difficult to value before the medical picture stabilises. Disputed liability and litigation extend it further.' },
  { q: 'Do I have to go to court?', a: 'Most personal injury claims resolve without trial. Filing suit is sometimes necessary to preserve a deadline or to move a stalled negotiation.' },
]

/** Topic-specific supplements, chosen by URL cluster. */
const faqsByPathPrefix: Array<[string, Faq[]]> = [
  ['/injuries/', medicalFaqs],
  ['/treatment/', medicalFaqs],
  ['/insurance/', insuranceFaqs],
  ['/liability/', liabilityFaqs],
  ['/settlements/', valuationFaqs],
  ['/tools/', valuationFaqs],
  ['/education/', processFaqs],
  ['/legal/', processFaqs],
  ['/commercial/', liabilityFaqs],
  ['/case-strength', liabilityFaqs],
  ['/how-much-', valuationFaqs],
  ['/average-', valuationFaqs],
  ['/medical-records', processFaqs],
  ['/how-to-', processFaqs],
  ['/what-medical-records', processFaqs],
  ['/how-insurance-companies', insuranceFaqs],
  ['/california-statute', processFaqs],
  ['/missed-the-statute', processFaqs],
]

export const MAX_FAQS = 10

function supplementalFaqs(page: LandingPage): Faq[] {
  const match = faqsByPathPrefix.find(([prefix]) => page.slug.startsWith(prefix))
  if (match) return match[1]
  // City and other intent pages: fault and process questions fit best.
  return page.category === 'Attorney Intent' ? processFaqs : valuationFaqs
}

/**
 * Questions answered from the city's own venue, agencies, and roadways. These
 * name different courts, transit operators, and corridors per city, so they add
 * material a template cannot produce by swapping a place name.
 */
function localFaqs(page: LandingPage): Faq[] {
  const facts = cityLocalFacts[page.slug]
  if (!facts) return []

  const agencies = facts.publicAgencies.join(', ')
  const corridors = facts.corridors.join(', ')

  return [
    {
      q: `Where would a ${facts.city} car accident case be filed?`,
      a: `Generally ${facts.court}. Venue can also turn on where the at-fault driver lives or where the collision happened, so confirm the correct court with counsel before relying on it.`,
    },
    {
      q: `What if a ${facts.city} bus or government vehicle was involved?`,
      a: `Claims involving public entities such as ${agencies} must be presented in writing to that entity far sooner than an ordinary claim against a private driver, and missing that deadline can end the claim outright. Identify who owned the other vehicle as early as possible.`,
    },
    {
      q: `Which roads produce the most serious crashes in ${facts.city}?`,
      a: `Locally, ${corridors}. Freeway and arterial collisions tend to involve higher speeds and commercial vehicles, which changes both injury severity and the insurance coverage available to respond.`,
    },
  ]
}

export function landingPageFaqs(page: LandingPage) {
  const seen = new Set<string>()

  return [...page.faqs, ...localFaqs(page), ...supplementalFaqs(page), ...universalFaqs]
    .filter((faq) => {
      if (seen.has(faq.q)) return false
      seen.add(faq.q)
      return true
    })
    .slice(0, MAX_FAQS)
}

/**
 * Google renders roughly this much of a title and description before cutting
 * them off and substituting text of its own choosing. Staying inside the limit
 * keeps control of the snippet, which is what actually earns the click.
 */
export const MAX_TITLE_LENGTH = 60
export const MAX_DESCRIPTION_LENGTH = 155

/** The date the page content was last meaningfully revised. Bump when editing. */
export const CONTENT_LAST_UPDATED = '2026-08-06'

function truncateAtWord(text: string, max: number) {
  if (text.length <= max) return text
  const clipped = text.slice(0, max - 1)
  const lastSpace = clipped.lastIndexOf(' ')
  const body = lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped
  return `${body.replace(/[\s,;:.\u2014-]+$/, '')}\u2026`
}

export function clampTitle(title: string) {
  return truncateAtWord(title, MAX_TITLE_LENGTH)
}

/** Below this a snippet stops being persuasive, so prefer a clean truncation. */
const MIN_DESCRIPTION_LENGTH = 110

export function clampDescription(description: string) {
  if (description.length <= MAX_DESCRIPTION_LENGTH) return description

  // Whole sentences read better than a cut-off phrase, so take as many as fit
  // rather than stopping at the first one, which can be very short.
  const sentences = description.match(/[^.!?]+[.!?]/g)
  if (sentences) {
    let assembled = ''
    for (const sentence of sentences) {
      if ((assembled + sentence).trim().length > MAX_DESCRIPTION_LENGTH) break
      assembled += sentence
    }
    assembled = assembled.trim()
    if (assembled.length >= MIN_DESCRIPTION_LENGTH) return assembled
  }

  return truncateAtWord(description, MAX_DESCRIPTION_LENGTH)
}

export function landingPageTitle(page: LandingPage) {
  const branded = `${page.title} | ClearCaseIQ`
  // Keep the brand suffix only when it fits; the page's own words matter more.
  return branded.length <= MAX_TITLE_LENGTH ? branded : clampTitle(page.title)
}

export function landingPageDescription(page: LandingPage) {
  return clampDescription(page.description)
}

export function landingPageCanonical(page: LandingPage, origin: string = siteUrl) {
  return `${origin}${page.slug}`
}

/**
 * Structured data for a landing page. Schema.org requires absolute URLs, so the
 * origin has to be threaded through rather than using the request path directly.
 */
export function buildLandingPageSchema(page: LandingPage, origin: string = siteUrl) {
  const canonical = landingPageCanonical(page, origin)
  const segments = page.slug.split('/').filter(Boolean)

  const breadcrumbs: Array<Record<string, unknown>> = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
  ]
  // Only emit a section crumb when the slug is actually nested (/injuries/foo);
  // top-level slugs would otherwise produce a crumb pointing at the page itself.
  if (segments.length > 1) {
    breadcrumbs.push({
      '@type': 'ListItem',
      position: breadcrumbs.length + 1,
      name: page.category,
      item: `${origin}/${segments[0]}`,
    })
  }
  breadcrumbs.push({
    '@type': 'ListItem',
    position: breadcrumbs.length + 1,
    name: page.title,
    item: canonical,
  })

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: page.title,
        description: page.description,
        inLanguage: 'en-US',
        author: { '@type': 'Organization', name: 'ClearCaseIQ', url: origin },
        publisher: { '@type': 'Organization', name: 'ClearCaseIQ', url: origin },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        url: canonical,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs,
      },
      {
        '@type': 'FAQPage',
        mainEntity: landingPageFaqs(page).map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'MedicalCondition',
        name: page.cluster,
        description: page.sections.whyItMatters,
        signOrSymptom: page.signals.map((signal) => ({ '@type': 'MedicalSymptom', name: signal })),
      },
    ],
  }
}
