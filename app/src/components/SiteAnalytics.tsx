import Script from 'next/script'

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

/**
 * Google Analytics for the public marketing and SEO pages.
 *
 * This deliberately does NOT load on the intake wizard, dashboards, or any
 * signed-in screen. Those routes are where claimants describe injuries and
 * upload medical records, and HHS guidance treats analytics on pages like that
 * as a disclosure of health information. Extending coverage past public
 * marketing content should be a reviewed decision, not a default.
 *
 * For the same reason there is no listener on client-side route changes: only
 * the public entry page is recorded, which is what attribution and landing page
 * performance need. IP anonymisation and ad-personalisation are off.
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
