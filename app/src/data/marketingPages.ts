/**
 * Non-landing pages that search engines index. The SEO landing pages carry
 * their own metadata in `seoLandingPages`; these are the handful of evergreen
 * marketing and legal routes that previously fell back to the site-wide title.
 *
 * `serverRender` marks the pages whose content is static enough to render on
 * the server. Pages whose body comes from an API are left client-only, since
 * server rendering them would only ship an empty or loading state to crawlers.
 */
import type { LanguageCode } from '../i18n'
import { marketingPagesEs } from './marketingPagesEs'
import { marketingPagesZh } from './marketingPagesZh'
import {
  TOPICS_INDEX_DESCRIPTION,
  TOPICS_INDEX_SLUG,
  TOPICS_INDEX_TITLE,
  topicHubs,
} from './seoTopicHubDefs'

export type MarketingPage = {
  path: string
  title: string
  description: string
  serverRender: boolean
  /** UI language this page is served in. Absent means the default, English. */
  locale?: LanguageCode
  /** The default-language page this one translates, which pairs the two for hreflang. */
  translationOf?: string
  /** Slices of the locale dictionary this page's markup reads. See marketingPagesEs. */
  namespaces?: string[]
  /**
   * Overrides `MARKETING_CONTENT_UPDATED` for this page. Set when one page is
   * revised or added, since bumping the shared constant would claim every
   * marketing page changed on that date.
   */
  contentUpdated?: string
  /**
   * Emit `buildMarketingPageSchema` for this page, using this schema.org type.
   *
   * Opt-in rather than automatic, because most marketing pages already render
   * their own JSON-LD from their component and a second generic node would just
   * restate it. Set only on the pages a crawl found with no structured data.
   */
  schemaType?: 'WebPage' | 'CollectionPage'
}

/**
 * When this set of pages was last meaningfully revised, used for sitemap
 * `lastmod`. Bump when editing the copy above rather than stamping the build
 * date: a lastmod that moves on every deploy tells crawlers nothing changed
 * that they should re-read.
 */
export const MARKETING_CONTENT_UPDATED = '2026-08-07'

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
    path: '/blog',
    title: 'Blog | ClearCaseIQ',
    description:
      'ClearCaseIQ blog: California injury claim education, case readiness, and platform notes. Not legal advice.',
    serverRender: false,
    contentUpdated: '2026-08-29',
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
    path: '/help',
    title: 'Help Center | ClearCaseIQ',
    description:
      'Answers on starting a case assessment, uploading medical records, attorney matching, settlement estimates, and privacy — plus how to reach support.',
    serverRender: true,
  },
  {
    path: '/contact',
    title: 'Contact ClearCaseIQ',
    description:
      'Contact ClearCaseIQ about plaintiff support, attorney partnerships, press, or privacy requests. Every inquiry is answered by email.',
    serverRender: true,
  },
  {
    path: '/editorial-standards',
    title: 'Editorial Standards | ClearCaseIQ',
    description:
      'How ClearCaseIQ writes, dates, and corrects its injury claim guidance — who produces it, what expert review it has had, and the limits of our estimates.',
    serverRender: true,
  },
  {
    path: '/disclosures',
    title: 'Platform Disclosures | ClearCaseIQ',
    description:
      'How ClearCaseIQ works and what it is not: independent legal technology, not a law firm. Attorney network, AI use, estimates, and California privacy rights.',
    serverRender: true,
  },
  {
    // These three server-render for their headings and schema, not for their
    // bodies, which still arrive from the API after load. They were the only
    // indexable pages a crawl found with no H1 and no structured data: the
    // server was sending meta tags wrapped around an empty shell, so there was
    // nothing on the page for a crawler to read before it ran the JavaScript.
    path: '/attorneys',
    title: 'Personal Injury Attorneys | ClearCaseIQ',
    description:
      'Browse personal injury attorneys in the ClearCaseIQ network and compare practice areas, venues, and case experience.',
    serverRender: true,
    schemaType: 'CollectionPage',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | ClearCaseIQ',
    description:
      'How ClearCaseIQ collects, uses, stores, and protects your personal and medical information.',
    serverRender: true,
    schemaType: 'WebPage',
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service | ClearCaseIQ',
    description: 'The terms that govern your use of the ClearCaseIQ case evaluation platform.',
    serverRender: true,
    schemaType: 'WebPage',
  },
]

/**
 * The topic index and category hubs. Registered here so they are server-rendered
 * with their own metadata and listed in the sitemap, like any other evergreen
 * marketing route — they are the navigation route into the SEO landing pages.
 */
const topicHubMarketingPages: MarketingPage[] = [
  {
    path: TOPICS_INDEX_SLUG,
    title: `${TOPICS_INDEX_TITLE} | ClearCaseIQ`,
    description: TOPICS_INDEX_DESCRIPTION,
    serverRender: true,
  },
  ...topicHubs.map((hub) => ({
    path: hub.slug,
    title: `${hub.title} | ClearCaseIQ`,
    description: hub.description,
    serverRender: true,
  })),
]

export const allMarketingPages: MarketingPage[] = [
  ...marketingPages,
  ...topicHubMarketingPages,
  ...marketingPagesEs,
  ...marketingPagesZh,
]

export const marketingPagesByPath = new Map(allMarketingPages.map((page) => [page.path, page]))

/** Paths the sitemap lists in addition to the SEO landing pages. */
export const marketingSitemapPaths = allMarketingPages.map((page) => page.path)
