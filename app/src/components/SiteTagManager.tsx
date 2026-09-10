import Script from 'next/script'

const CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID

/**
 * Google Tag Manager for the public marketing and SEO pages.
 *
 * Held to the same boundary as <SiteAnalytics>: rendered only where the server
 * has already decided the page is public marketing content, so landing directly
 * on the intake wizard or any signed-in screen loads no container at all.
 *
 * GTM needs that boundary more than GA does, not less. A container is a remote
 * loader — whoever holds the GTM account can add a tag that fires on every page
 * without touching this repository, and that tag sees `page_location`, which on
 * these routes can carry an assessment id or a claim token. The review that
 * matters for GTM therefore happens in the container, not here.
 *
 * Two consequences worth stating plainly:
 *
 * 1. `ga-disable-<id>` does nothing for tags the container loads. It is gtag's
 *    own switch and GTM-loaded vendors do not read it. The client-side half of
 *    the boundary for GTM is the `analytics_blocked` dataLayer variable pushed
 *    by `applyAnalyticsBoundary`, and it only has an effect if the container is
 *    configured to respect it — see the blocking-trigger note in
 *    `lib/analyticsBoundary.ts`. Code cannot enforce this on its own.
 *
 * 2. If the container holds its own GA4 tag, that is a second measurement of
 *    the same traffic alongside <SiteAnalytics>, and sessions will double-count.
 *    Run GA4 through one of the two, not both.
 *
 * The <noscript> iframe lives here rather than in `_document` on purpose. In
 * `_document` it would render on every page including the private ones, which
 * is the boundary this component exists to hold.
 */
export default function SiteTagManager() {
  if (!CONTAINER_ID) return null

  return (
    <>
      {/* Seeded before gtm.js so the first container evaluation already has the
          variable. This component only renders on public pages, so the initial
          value is always false; route changes into private screens are what
          flip it. */}
      <Script id="gtm-boundary" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ analytics_blocked: false });
        `}
      </Script>
      <Script id="gtm-init" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){
            w[l]=w[l]||[];
            w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),
                dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;
            j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
            f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${CONTAINER_ID}');
        `}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${CONTAINER_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  )
}
