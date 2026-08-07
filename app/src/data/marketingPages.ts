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
    title: 'ClearCaseIQ | AI-Powered Personal Injury Case Evaluation & Attorney Matching',
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
    path: '/attorney-network',
    title: 'Attorney Network | Pre-Screened Personal Injury Cases | ClearCaseIQ',
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
