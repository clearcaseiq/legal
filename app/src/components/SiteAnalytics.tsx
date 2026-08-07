import Script from 'next/script'

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

/**
 * Google Analytics for the public marketing and SEO pages.
 *
 * This is not rendered when the visitor lands directly on the intake wizard, a
 * dashboard, or any signed-in screen. Those routes are where claimants describe
 * injuries and upload medical records, and HHS guidance treats analytics on
 * pages like that as a disclosure of health information.
 *
 * There is deliberately no listener on client-side route changes, so only the
 * entry page is reported. Note the limit of that: the app is a SPA behind a
 * catch-all route, so a visitor who enters on a public page and then navigates
 * to the intake wizard still has this script resident in the document. It sends
 * no pageview for that route, but GA4 enhanced measurement can still fire on
 * its own — form interactions in particular. Disable enhanced measurement in
 * the GA4 property, and treat any widening of this boundary as a decision that
 * needs a HIPAA review rather than a default.
 *
 * IP anonymisation is on; ad personalisation and Google signals are off.
 */
export default function SiteAnalytics() {
  if (!MEASUREMENT_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${MEASUREMENT_ID}', {
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
          });
        `}
      </Script>
    </>
  )
}
