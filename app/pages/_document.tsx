import Document, { Head, Html, Main, NextScript, type DocumentContext } from 'next/document'
import { DEFAULT_LANGUAGE } from '../src/i18n'
import { hreflangFor, localeFromPath } from '../src/i18n/routing'
import { isSensitivePath } from '../src/lib/analyticsBoundary'
import { gtmContainerId, gtmHeadSnippet, gtmNoscriptSrc } from '../src/lib/tagManager'

// Search engines verify ownership with a meta tag rather than a request, so
// these have to be in the document head on every page. Both are optional; the
// tag is omitted entirely when the variable is unset.
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION

/**
 * `lang` is resolved per request from the path.
 *
 * It was hardcoded to `en`, which was harmless while every URL served English.
 * Now that `/es` pages exist, a wrong `lang` tells a screen reader to read
 * Spanish with English pronunciation rules and tells search engines the page is
 * in a language it is not.
 */
type DocumentProps = {
  locale: string
  /** Container to load, or null where the tag manager is switched off. */
  gtmContainer: string | null
  /** Whether the landing route is one the container should hold tags back on. */
  analyticsBlocked: boolean
}

export default function CaseIQDocument({ locale, gtmContainer, analyticsBlocked }: DocumentProps) {
  return (
    <Html lang={locale}>
      <Head>
        {/* First in the head, ahead of the verification tags and the font
            preloads, so the container is evaluating by the time anything else
            has parsed. This is also the reason it lives here rather than in a
            component rendered by the catch-all page: the document is the only
            place that covers every route, which is what the tracking needs and
            what the previous marketing-only placement could not give. */}
        {gtmContainer ? (
          <script
            id="gtm-init"
            dangerouslySetInnerHTML={{ __html: gtmHeadSnippet(gtmContainer, analyticsBlocked) }}
          />
        ) : null}
        {GOOGLE_SITE_VERIFICATION ? (
          <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION} />
        ) : null}
        {BING_SITE_VERIFICATION ? (
          <meta name="msvalidate.01" content={BING_SITE_VERIFICATION} />
        ) : null}
        <link rel="icon" type="image/svg+xml" href="/cciq-mark.svg" />
        {/* Inter and Fraunces are self-hosted through next/font — see
            src/lib/fonts.ts. The stylesheet link that used to live here blocked
            the first paint on two round trips to Google. */}
      </Head>
      <body>
        {gtmContainer ? (
          <noscript>
            <iframe
              src={gtmNoscriptSrc(gtmContainer)}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
            />
          </noscript>
        ) : null}
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

CaseIQDocument.getInitialProps = async (ctx: DocumentContext) => {
  const initialProps = await Document.getInitialProps(ctx)
  const asPath = ctx.asPath ?? '/'
  return {
    ...initialProps,
    // The same tag hreflang uses, so `zh` pages declare `zh-Hans` in both places
    // rather than promising Simplified to a crawler and plain Chinese to a reader's
    // screen reader.
    locale: hreflangFor(localeFromPath(asPath) || DEFAULT_LANGUAGE),
    gtmContainer: gtmContainerId(),
    analyticsBlocked: isSensitivePath(asPath),
  }
}
