import type { LandingPage } from './seoLandingPages'

export const DEFAULT_SITE_URL = 'https://www.clearcaseiq.com'

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL

/** FAQs appended to every landing page's own FAQ list. */
export const expandedFaqs = [
  { q: 'Does delayed pain after an accident matter?', a: 'Yes. Many serious injuries develop gradually after a crash. The key is documenting when symptoms started, when they worsened, and when you sought medical care.' },
  { q: 'Should I get an MRI after an accident?', a: 'That is a medical decision for a provider. From a case-readiness perspective, MRI findings can help document disc, ligament, soft-tissue, or nerve-related injuries when symptoms persist.' },
  { q: 'Do chiropractors or physical therapy help claims?', a: 'They can help document pain, range-of-motion limits, treatment continuity, and recovery progress. Insurers may still scrutinize duration, gaps, and medical necessity.' },
  { q: 'What if insurance denies treatment or says it was unnecessary?', a: 'Save the denial, explanation of benefits, adjuster emails, provider notes, and bills. The reason for denial can become an important litigation-readiness signal.' },
  { q: 'Does surgery increase settlement value?', a: 'Surgery or a surgery recommendation is often a high-impact severity signal, but value still depends on liability, causation, coverage, prior history, and recovery outcome.' },
  { q: 'What if symptoms worsen later?', a: 'Worsening symptoms should be medically evaluated. Keep a timeline of changes and upload new records because escalation can change severity, confidence, and next steps.' },
  { q: 'Will a treatment gap hurt my case?', a: 'A gap can create questions, but it may be explainable. Work conflicts, insurance delays, referral delays, transportation issues, or provider availability should be documented.' },
  { q: 'What documents are most useful?', a: 'Police reports, photos, medical records, bills, MRI reports, PT notes, wage loss proof, insurance letters, and witness information are usually high-value documents.' },
  { q: 'Can ClearCaseIQ tell me exactly what my case is worth?', a: 'No tool can guarantee a result. ClearCaseIQ provides a preliminary intelligence report based on available facts, documents, and underwriting signals.' },
  { q: 'Is this legal advice?', a: 'No. ClearCaseIQ is not a law firm. The report is educational and can help organize information for possible attorney review.' },
]

export const MAX_FAQS = 12

export function landingPageFaqs(page: LandingPage) {
  return [...page.faqs, ...expandedFaqs].slice(0, MAX_FAQS)
}

export function landingPageTitle(page: LandingPage) {
  return `${page.title} | ClearCaseIQ`
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
