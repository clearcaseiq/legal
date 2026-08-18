import Document, { Head, Html, Main, NextScript, type DocumentContext } from 'next/document'
import { DEFAULT_LANGUAGE } from '../src/i18n'
import { hreflangFor, localeFromPath } from '../src/i18n/routing'

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
export default function CaseIQDocument({ locale }: { locale: string }) {
  return (
    <Html lang={locale}>
      <Head>
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
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

CaseIQDocument.getInitialProps = async (ctx: DocumentContext) => {
  const initialProps = await Document.getInitialProps(ctx)
  // The same tag hreflang uses, so `zh` pages declare `zh-Hans` in both places
  // rather than promising Simplified to a crawler and plain Chinese to a reader's
  // screen reader.
  return { ...initialProps, locale: hreflangFor(localeFromPath(ctx.asPath ?? '/') || DEFAULT_LANGUAGE) }
}
