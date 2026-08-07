/**
 * Non-landing pages that search engines index. The SEO landing pages carry
 * their own metadata in `seoLandingPages`; these are the handful of evergreen
 * marketing and legal routes that previously fell back to the site-wide title.
 *
 * `serverRender` marks the pages whose content is static enough to render on
 * the server. Pages whose body comes from an API are left client-only, since
 * server rendering them would only ship an empty or loading state to crawlers.
 */
export type MarketingPage = {
  path: string
  title: string
  description: string
  serverRender: boolean
}

export const marketingPages: MarketingPage[] = [
  {
    path: '/',
    title: 'Personal Injury Case Evaluation | ClearCaseIQ',
    description:
      'ClearCaseIQ helps accident victims evaluate personal injury claims, estimate settlement value, organize medical records, and connect with attorneys.',
    serverRender: true,
  },
  {
    path: '/how-it-works',
    title: 'How ClearCaseIQ Works | Free Personal Injury Case Assessment',
    description:
      'Answer a few questions about your accident, add your medical records, and get a preliminary case assessment with clear next steps — in minutes, at no cost.',
    serverRender: true,
  },
  {
    path: '/about',
    title: 'About ClearCaseIQ | Legal Technology for Injury Claims',
    description:
      'ClearCaseIQ Corp. is a Los Angeles legal technology company — not a law firm — that helps California injury victims understand their case and connect with attorneys only with consent.',
    serverRender: true,
  },
  {
    path: '/press',
    title: 'Press Kit | ClearCaseIQ',
    description:
      'ClearCaseIQ press kit: company boilerplate, founder quotes, brand assets, and linkable California injury education tools for journalists and partners.',
    serverRender: true,
  },
  {
    path: '/insights',
    title: 'Insights | Case Readiness Themes | ClearCaseIQ',
    description:
      'Early ClearCaseIQ insights on California injury case readiness — documentation gaps, treatment continuity, public-entity deadlines, and consent-based attorney matching.',
    serverRender: true,
  },
  {
    path: '/partners/badge',
    title: 'Partner Badge | ClearCaseIQ',
    description:
      'Embed the ClearCaseIQ partner badge to link educational case-readiness tools. Not a law firm endorsement or attorney referral arrangement.',
    serverRender: true,
  },
  {
    path: '/tools/california-sol-checker',
    title: 'California Statute of Limitations Checker | ClearCaseIQ',
    description:
      'Educational California personal injury deadline checker — estimate common filing windows and public-entity claim presentation clocks. Not legal advice.',
    serverRender: true,
  },
  {
    path: '/tools/medical-records-checklist',
    title: 'Medical Records Checklist | ClearCaseIQ',
    description:
      'Interactive personal injury medical records and evidence checklist with printable PDF. Organize documents before attorney review. Not legal advice.',
    serverRender: true,
  },
  {
    path: '/attorney-network',
    title: 'Attorney Network | Pre-Screened Injury Cases | ClearCaseIQ',
    description:
      'Join the ClearCaseIQ attorney network to receive pre-screened personal injury cases that arrive with documents, medical signals, and case-readiness scoring.',
    serverRender: true,
  },
  {
    path: '/attorneys',
    title: 'Personal Injury Attorneys | ClearCaseIQ',
    description:
      'Browse personal injury attorneys in the ClearCaseIQ network and compare practice areas, venues, and case experience.',
    serverRender: false,
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | ClearCaseIQ',
    description:
      'How ClearCaseIQ collects, uses, stores, and protects your personal and medical information.',
    serverRender: false,
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service | ClearCaseIQ',
    description: 'The terms that govern your use of the ClearCaseIQ case evaluation platform.',
    serverRender: false,
  },
]

export const marketingPagesByPath = new Map(marketingPages.map((page) => [page.path, page]))

/** Paths the sitemap lists in addition to the SEO landing pages. */
export const marketingSitemapPaths = marketingPages.map((page) => page.path)
