# Third-party tracking architecture

How ClearCaseIQ keeps advertising and analytics vendors (Google Ads, GA4,
Microsoft Clarity, the Meta Pixel) away from claimant, attorney and admin
screens, and what has to stay true for that to keep working.

Background: Meta classified the site's dataset as health-related because its
Pixel was receiving personal-injury assessment URLs. A browser audit then found
GA4, Google Ads and Clarity receiving the same screens, and an evidence-upload
link's token.

## The rule

Third-party tags run on public marketing pages only, and only for the page the
visitor landed on. They never run on a screen that is part of an assessment,
a case, a dashboard, a sign-in, or any route nobody has classified.

Measurement of the funnel (assessment progress, completion, qualified leads,
valuation, routing) belongs in ClearCaseIQ's own analytics, not in vendor tags.
Ad platforms receive landing-page views and the "start assessment" click
conversion, nothing more.

## Four layers, each enforced in this repository

1. **Server allow list: which documents load the container.**
   `pages/[[...slug]].tsx` sets `publicPage` only for entries in the marketing
   page and SEO landing page data. `pages/_document.tsx` renders the GTM
   snippet only when `publicPage` is true. App screens, error pages, redirects
   and unknown URLs get no container, no Pixel and no Clarity, whatever the GTM
   console says. Non-production hosts (`SEARCH_ENGINE_INDEXING=disabled`) get
   none at all.

2. **Meta guard, ahead of the container.** `lib/metaPixelGuard.ts` writes the
   Pixel base code into the same inline script as the GTM bootstrap, before
   `gtm.js`. It turns off Meta's automatic history PageViews
   (`disablePushState`) and automatic button and form events (`autoConfig`)
   before the GTM tag's `init` runs. On any page that is not allowed, `fbq` is
   an inert stub, so the Pixel script never loads.

3. **Leaving the landing page reloads the document.** The container is a remote
   loader. Switching vendors off one at a time does not cover them all: Google
   Ads tags ignore GA's kill switch and Meta's consent. So when the router first
   moves off the landing page, `metaPixelGuard.ts` revokes Meta consent, stops
   Clarity, disables every loaded GA4 property, freezes the URL, and makes the
   move a full page load. The next document is answered by layer 1, which loads
   no container on app screens. No tag the container installed survives into
   the app.

4. **Referrer policy.** `next.config.mjs` sends `Referrer-Policy: strict-origin`
   site-wide. A full page load from `/evidence-upload/<id>?token=...` to a
   marketing page would otherwise hand that URL to the marketing page's tags as
   `document.referrer`.

`lib/analyticsBoundary.ts` keeps the deny list of sensitive routes. It drives
GA's kill switch and the `analytics_blocked` dataLayer variable, and is a
second line of defence behind the allow list.

## Required GTM and vendor configuration

The app does not depend on these, but they are the second control, and they
are the only control over what the container does on marketing pages:

- An exception trigger on `analytics_blocked equals true` attached to every
  Meta, Clarity, GA4 and Google Ads tag.
- GA4: enhanced measurement "page changes based on browser history events" off.
- Google Ads: automatic enhanced conversions off. The browser test shows it is
  on (`ec_mode=a`). It found no email on the landing page, but it scrapes the
  page for one whenever a conversion fires.
- Meta Events Manager: automatic advanced matching off; no URL-based custom
  conversions on app paths.
- No tag on a "History Change" or "All Pages" trigger that sends the URL to a
  vendor, other than the landing page view.

Anyone with GTM publish rights can add a tag without touching this repository.
Review container changes against this list.

## Automated checks

| Check | Where | Fails when |
|---|---|---|
| `lib/trackerExposure.test.ts` | CI, before images are built | a marketing or landing page sits on a sensitive or app route; an app route is added without being classified |
| `lib/metaPixelGuard.test.ts`, `analyticsBoundary.test.ts`, `tagManager.test.ts`, `screenView.test.ts` | CI, before images are built | the guard's ordering, fail-closed stub, landing-only switches or reload change |
| `e2e/third-party-network.e2e.spec.ts` | CI, after each production rollout; locally on demand | any vendor request after the landing page; any request carrying an app route, record id, token, contact detail, case fact or user-data parameter; a container on an app screen |

The browser test records each vendor request (URL, body, headers) and then
aborts it, so nothing reaches the vendors.

```bash
# Production (stops at the first assessment screen, which saves nothing)
E2E_BASE_URL=https://www.clearcaseiq.com pnpm test:e2e e2e/third-party-network.e2e.spec.ts

# Local, full assessment and signed-in dashboards (API and web dev servers running)
pnpm --filter caseiq-api exec tsx scripts/e2e-tracker-sessions.ts ../e2e/.sessions.local.json
E2E_SESSIONS=e2e/.sessions.local.json E2E_SUBMIT_ASSESSMENT=1 pnpm test:e2e e2e/third-party-network.e2e.spec.ts
```

## Adding a route

- App screen: register it in `data/appRoutes.ts` and add its prefix to
  `SENSITIVE_ROUTE_PREFIXES` in `lib/analyticsBoundary.ts`. `trackerExposure`
  fails until you do.
- Public content page: add it to the marketing or landing page data. It must
  not sit under an app or sensitive prefix.
- Never put a token, record id or case detail in a marketing page URL.

## Known limits

- `strict-origin` protects the `Referer` header only. Tokens in URLs still
  appear in server logs, browser history and copied links. The no-login upload
  links (`/respond/documents/<token>` and `/evidence-upload/<id>?token=`, both
  `DocumentRequest.secureToken`) have no time-based expiry, and the provider
  version exposes a signed HIPAA authorization. Short-lived, single-use tokens
  would reduce that exposure.
- GA4 and the Meta Pixel see only the landing page. A visitor who goes into the
  app and comes back out starts a new page view on a new document.
