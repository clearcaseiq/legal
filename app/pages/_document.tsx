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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
