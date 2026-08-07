import { Head, Html, Main, NextScript } from 'next/document'

// Search engines verify ownership with a meta tag rather than a request, so
// these have to be in the document head on every page. Both are optional; the
// tag is omitted entirely when the variable is unset.
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION

export default function Document() {
  return (
    <Html lang="en">
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
