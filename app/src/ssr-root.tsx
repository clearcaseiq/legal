import type { LanguageCode } from './i18n'
import AppProviders from './AppProviders'
import { PageLinksProvider, type PublicPageLink } from './lib/pageLinks'

/**
 * Root used for routes we render on the server (SEO landing pages). Unlike
 * `next-root`, this is imported statically so Next can render it server-side;
 * the client hydrates the same tree.
 */
export default function SsrRoot({
  location,
  language,
  messages,
  pageLinks,
}: {
  location: string
  /** Language fixed by the URL, for routes with a localized path. */
  language?: LanguageCode
  /** Dictionary slices for `language`, serialized with the page. */
  messages?: Record<string, unknown>
  /** Editor-managed links for this page, fetched in getServerSideProps. */
  pageLinks?: { path: string; links: PublicPageLink[] } | null
}) {
  return (
    <PageLinksProvider value={pageLinks ?? null}>
      <AppProviders serverRendered location={location} language={language} messages={messages} />
    </PageLinksProvider>
  )
}
