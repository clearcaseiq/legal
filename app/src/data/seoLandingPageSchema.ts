import { DEFAULT_LANGUAGE, type LanguageCode } from '../i18n'
import { reviewerFor } from './contentReviewers'
import { cityLocalFacts } from './seoCityLocalFacts'
import type { LandingPage } from './seoLandingPages'
import { hubForPage } from './seoTopicHubDefs'

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

/**
 * The fees page matches `/how-much-`, which otherwise supplies valuation
 * questions about what a claim is worth — a different subject from what
 * representation costs, and confusing sat underneath it.
 */
const feeFaqs: Faq[] = [
  { q: 'Do I pay anything for an initial consultation?', a: 'Personal injury consultations are typically free, and a firm that expects payment to assess a claim is unusual enough to ask about.' },
  { q: 'Who pays my medical bills while the claim is pending?', a: 'Usually your health insurance, your own medical payments coverage if you have it, or a provider treating on a letter of protection who is repaid from the recovery. The at-fault insurer generally pays nothing until the claim resolves.' },
  { q: 'Can a fee agreement be changed after it is signed?', a: 'Any change is a matter of agreement between you and the firm, and in California contingency terms have to be in writing, so a revision should be documented the same way the original was.' },
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
  // `/case-strength` was mapped here when it was eight thin per-crash-type
  // pages that said nothing about fault themselves. The guide that replaced
  // them answers comparative fault directly, and `liabilityFaqs` opens with the
  // same question, so it now falls through to the Attorney Intent default.
  ['/how-much-do-', feeFaqs],
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

  // A translated page gets only the FAQs written for it. The shared pools are
  // English, and appending them would put English questions into a Spanish
  // page's visible list and its FAQPage schema — which is both a bad answer for
  // the reader and a mismatch between the markup and the declared language.
  const shared =
    (page.locale ?? DEFAULT_LANGUAGE) === DEFAULT_LANGUAGE
      ? [...localFaqs(page), ...supplementalFaqs(page), ...universalFaqs]
      : []

  return [...page.faqs, ...shared]
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

/**
 * Fallback revision date for content that carries none of its own. Individual
 * landing pages set `contentUpdated` per content set; see `CONTENT_UPDATED` in
 * `seoLandingPages`.
 */
export const CONTENT_LAST_UPDATED = '2026-08-06'

/** The revision date to publish for a page, in sitemap and structured data. */
export function landingPageLastModified(page: LandingPage) {
  return page.contentUpdated || CONTENT_LAST_UPDATED
}

/**
 * The original publication date. Falls back to the revision date, which is the
 * conservative choice: claiming a page is older than it is would overstate how
 * long the guidance has been maintained.
 */
export function landingPageFirstPublished(page: LandingPage) {
  return page.contentPublished || landingPageLastModified(page)
}

/** Formats an ISO date for a reader, in the site's own timezone-free terms. */
const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export function formatContentDate(iso: string, locale: LanguageCode = DEFAULT_LANGUAGE) {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  // Spelled out rather than handed to `toLocaleDateString('es')`, because this
  // string is rendered on the server and again during hydration. Node's ICU and
  // the browser's do not always agree on Spanish date formatting, and a
  // one-character disagreement is a hydration mismatch that discards the
  // server's markup for the whole subtree.
  if (locale === 'es') return `${day} de ${MONTHS_ES[month - 1]} de ${year}`
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

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
 * Per-page social card, drawn on demand from the page's own words.
 *
 * One site-wide card makes every shared link look identical, so a link to a
 * whiplash article and one to a settlement calculator preview the same — which
 * costs the click on exactly the pages people share.
 */
export function landingPageOgImage(page: LandingPage, origin: string = siteUrl) {
  return ogImageUrl(page.title, page.eyebrow, origin)
}

/**
 * Builds a share-card URL. The brand suffix is dropped because the card already
 * carries the wordmark, and repeating it wastes the headline.
 */
export function ogImageUrl(title: string, eyebrow = '', origin: string = siteUrl) {
  const params = new URLSearchParams({ title: title.replace(/\s*\|\s*ClearCaseIQ\s*$/, '') })
  if (eyebrow) params.set('eyebrow', eyebrow)
  return `${origin}/api/og?${params.toString()}`
}

/**
 * Structured data for a marketing page that has none of its own.
 *
 * Most marketing pages emit schema from their own component. `/attorneys`,
 * `/privacy-policy`, and `/terms-of-service` do not, and a crawl found them as
 * the only indexable pages on the site with no structured data at all.
 *
 * Deliberately modest: a WebPage node and the breadcrumb, both of which
 * describe things the served HTML actually contains. The obvious temptation on
 * `/attorneys` is an ItemList of the directory, but that list arrives from the
 * API after load, and claiming list items the HTML does not contain is the same
 * category of error as the MedicalCondition markup this file used to emit.
 */
export function buildMarketingPageSchema(
  page: { path: string; title: string; description: string; schemaType?: string; locale?: LanguageCode },
  origin: string = siteUrl
) {
  const canonical = `${origin}${page.path === '/' ? '' : page.path}`
  const locale = page.locale ?? DEFAULT_LANGUAGE
  const isTranslated = locale !== DEFAULT_LANGUAGE

  const name = bareTitle(page.title)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': page.schemaType || 'WebPage',
        name,
        description: clampDescription(page.description),
        inLanguage: isTranslated ? locale : 'en-US',
        url: canonical,
        isPartOf: { '@type': 'WebSite', name: 'ClearCaseIQ', url: origin },
        publisher: { '@type': 'Organization', name: 'ClearCaseIQ', url: origin },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isTranslated ? 'Inicio' : 'Home',
            item: isTranslated ? `${origin}/es` : `${origin}/`,
          },
          { '@type': 'ListItem', position: 2, name, item: canonical },
        ],
      },
    ],
  }
}

/**
 * A page's own words, without the brand suffix.
 *
 * `title` is written for the SERP, where "| ClearCaseIQ" earns recognition. In a
 * breadcrumb it is noise: the trail would read "Home > Personal Injury Attorneys
 * | ClearCaseIQ", repeating the brand in the one place it adds nothing.
 */
function bareTitle(title: string) {
  return title.replace(/\s*\|\s*ClearCaseIQ\s*$/, '').trim() || title
}

/**
 * Structured data for a landing page. Schema.org requires absolute URLs, so the
 * origin has to be threaded through rather than using the request path directly.
 */
export function buildLandingPageSchema(page: LandingPage, origin: string = siteUrl) {
  const canonical = landingPageCanonical(page, origin)
  const locale = page.locale ?? DEFAULT_LANGUAGE
  const isTranslated = locale !== DEFAULT_LANGUAGE

  // The trail has to stay inside the page's own language. Sending a Spanish page's
  // breadcrumb up to the English home and an English hub describes a path the
  // reader cannot take and contradicts what the rendered breadcrumb shows.
  const breadcrumbs: Array<Record<string, unknown>> = isTranslated
    ? [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: `${origin}/es` }]
    : [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` }]

  // Point the section crumb at the category hub. It used to derive a URL from the
  // first slug segment (/injuries), which is not a page that exists, and it was
  // skipped entirely for top-level slugs so those had no section at all.
  const hub = isTranslated ? undefined : hubForPage(page)
  if (isTranslated) {
    breadcrumbs.push({
      '@type': 'ListItem',
      position: breadcrumbs.length + 1,
      name: 'Temas',
      item: `${origin}/es/temas`,
    })
  } else if (hub) {
    breadcrumbs.push({
      '@type': 'ListItem',
      position: breadcrumbs.length + 1,
      name: hub.title,
      item: `${origin}${hub.slug}`,
    })
  }
  breadcrumbs.push({
    '@type': 'ListItem',
    position: breadcrumbs.length + 1,
    name: page.title,
    item: canonical,
  })

  const reviewer = reviewerFor(page.reviewedBy)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: page.title,
        description: page.description,
        inLanguage: isTranslated ? 'es' : 'en-US',
        // Injury and treatment content is health-adjacent, where recency is part
        // of how the page is judged. Without these the article reads as undated.
        datePublished: landingPageFirstPublished(page),
        dateModified: landingPageLastModified(page),
        image: landingPageOgImage(page),
        author: {
          '@type': 'Organization',
          name: 'ClearCaseIQ',
          url: origin,
          // Points at the page describing who produces this content and how, so
          // the authorship claim is checkable rather than a bare name.
          mainEntityOfPage: `${origin}/editorial-standards`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'ClearCaseIQ',
          url: origin,
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/clearcaseiq-logo.png`,
          },
        },
        // Only asserted when a named person actually reviewed the page. See
        // `contentReviewers` for why this is never populated speculatively.
        ...(reviewer
          ? {
              reviewedBy: {
                '@type': 'Person',
                name: reviewer.name,
                honorificSuffix: reviewer.credentials,
                description: reviewer.bio,
                ...(reviewer.profileUrl ? { url: reviewer.profileUrl } : {}),
              },
            }
          : {}),
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
      // MedicalCondition only where the page is actually about a condition.
      //
      // This used to be emitted on all 173 pages from `cluster` and `signals`,
      // which produced markup that contradicted the page: attorney fee guides
      // declared themselves medical conditions, and `signals` are underwriting
      // signals by definition — the page labels them as such — so "Policy
      // limits" and "Wage loss" were being published as MedicalSymptom. Markup
      // that misdescribes its page is a structured data policy violation, and
      // health markup is where that is judged most harshly.
      //
      // `signOrSymptom` is gone rather than filtered. Even on a symptoms page
      // the signals list mixes real symptoms with case attributes, and there is
      // no reliable way to tell them apart from the data. Asserting less is
      // better than asserting something false.
      ...(page.category === 'Symptoms'
        ? [
            {
              '@type': 'MedicalCondition',
              name: page.cluster,
              description: page.sections.whyItMatters,
            },
          ]
        : []),
    ],
  }
}
