import type { LanguageCode } from './i18n'
import AppProviders from './AppProviders'

/**
 * Root used for routes we render on the server (SEO landing pages). Unlike
 * `next-root`, this is imported statically so Next can render it server-side;
 * the client hydrates the same tree.
 */
export default function SsrRoot({
  location,
  language,
  messages,
}: {
  location: string
  /** Language fixed by the URL, for routes with a localized path. */
  language?: LanguageCode
  /** Dictionary slices for `language`, serialized with the page. */
  messages?: Record<string, unknown>
}) {
  return <AppProviders serverRendered location={location} language={language} messages={messages} />
}
