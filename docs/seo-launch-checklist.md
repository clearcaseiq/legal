# SEO launch checklist

Everything here lives outside the application code — DNS, hosting, and
third-party consoles — so it can't be verified from the repository. Work through
it before and immediately after the domain goes live.

Run `node scripts/check-ssr-coverage.mjs` against production once it's up. It
should report 176 server-rendered, 3 client-only, 0 failures.

---

## 1. Before launch — blocking

### Environment variables

Next inlines `NEXT_PUBLIC_*` into the bundle **when the image is built**, so
these must be passed as Docker build args. Setting them on the running container
does nothing, and does it silently. `app/Dockerfile` declares each as an `ARG`
in the builder stage, and both compose files forward them from the deploy
environment.

They are all optional, and each feature is skipped when its variable is unset,
so a missing value fails quietly rather than loudly. Confirm they are present in
the production build environment, not just in a local `.env`.

| Variable | Purpose | Effect if missing |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs in canonicals, Open Graph tags, sitemap | Falls back to `https://www.clearcaseiq.com` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 property (`G-XXXXXXXXXX`) | No analytics at all |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console meta tag | Cannot verify by meta tag |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Bing Webmaster meta tag | Cannot verify by meta tag |

`NEXT_PUBLIC_SITE_URL` must match the live host exactly, including `www`. If it
disagrees with the canonical host below, every canonical URL on the site points
somewhere the visitor isn't.

### Host and redirect rules

Canonicals, Open Graph URLs, and the sitemap all declare `www.clearcaseiq.com`.
The hosting layer must agree, or the same 176 pages become reachable at several
addresses and the ranking signals split between them.

- [ ] `http://clearcaseiq.com` → 301 → `https://www.clearcaseiq.com`
- [ ] `https://clearcaseiq.com` → 301 → `https://www.clearcaseiq.com`
- [ ] `http://www.clearcaseiq.com` → 301 → `https://www.clearcaseiq.com`
- [ ] Valid TLS certificate covering both apex and `www`
- [ ] Confirm with `curl -I` that each returns a single 301 and not a chain

### Staging must not compete

- [ ] Any preview or staging deployment returns `X-Robots-Tag: noindex` or sits
      behind authentication. A crawlable staging copy competes with production
      for the identical content.
- [ ] Production does **not** send `X-Robots-Tag: noindex`. Check the response
      headers on the live host before announcing.

### Search Console and Bing

- [ ] Register the Search Console property for the exact production host. A
      property for the apex domain shows no data for `www`. Prefer a Domain
      property, which covers both.
- [ ] Submit `https://www.clearcaseiq.com/sitemap.xml`
- [ ] Repeat both in Bing Webmaster Tools; it also feeds ChatGPT search results
- [ ] Request indexing for the ten highest-value URLs rather than waiting for a
      natural crawl
- [ ] Set the international targeting and confirm no manual actions are present

### Analytics

- [ ] GA4 property created, data stream pointed at the production host
- [ ] Confirm a pageview lands from a landing page in the realtime report
- [ ] Link GA4 to Search Console so query data appears alongside behaviour

- [ ] **Turn off GA4 enhanced measurement**, form interactions above all. See
      the boundary described below — this setting is the part of it that lives
      in the GA4 admin rather than in code.

Note a deliberate constraint: analytics are requested **only on public marketing
and SEO pages**, and client-side route changes are not tracked, so only the
entry page is reported. Those routes are excluded because the intake wizard and
dashboards are where claimants describe injuries and upload medical records, and
HHS guidance treats third-party tracking on such pages as a disclosure of health
information.

Be precise about the limit of that guarantee when discussing it with counsel.
The app is a single-page app behind a catch-all route, so a visitor who lands on
a public page and then navigates to the intake wizard still has the GA script
resident in the document. It sends no pageview for that route, but GA4 enhanced
measurement can fire on its own, which is why the setting above matters.
Widening this boundary needs a HIPAA review — see
`app/src/components/SiteAnalytics.tsx`.

---

## 2. Launch week

- [ ] Run Lighthouse against a landing page and the homepage; record LCP, CLS,
      and INP. The pages ship the full application bundle, so this is the most
      likely remaining technical weakness.
- [ ] Paste a landing page URL into Slack, iMessage, and LinkedIn to confirm the
      1200×630 card renders. Use Facebook's Sharing Debugger and X's Card
      Validator to force a re-scrape if a stale preview is cached.
- [ ] Watch Search Console Page Indexing daily for the first fortnight. Expect
      gradual coverage; a large "Discovered – currently not indexed" bucket is
      the signal that content quality, not crawling, is the constraint.
- [ ] Verify `robots.txt` and `sitemap.xml` resolve on the live host.

---

## 3. Content and legal review

- [ ] **Verify the city page local details.** `app/src/data/seoCityLocalFacts.ts`
      names superior courts, filing venues, and transit agencies for 13
      California cities. These were written to differentiate pages that were
      otherwise 70–80% identical, and they are accurate to the best of current
      knowledge, but courts reorganise divisions and agencies rename. Have
      counsel confirm before launch.
- [ ] **Attorney advertising compliance.** California regulates lawyer
      advertising and lawyer referral arrangements, and a platform matching
      claimants to attorneys sits inside that scope. Confirm required
      disclaimers appear where the rules demand.
- [ ] **E-E-A-T signals.** Personal injury is a YMYL category, where Google
      weighs demonstrable trust unusually heavily. Ship `/about` with founder
      story, company identity, and content standards (done in-app). Still add
      named outside legal/medical reviewer bylines and a verifiable street
      address when available.

---

## 4. Ongoing

- [ ] Bump `CONTENT_LAST_UPDATED` in `app/src/data/seoLandingPageSchema.ts` when
      page content is meaningfully revised. It feeds `lastmod` in the sitemap,
      which is deliberately a fixed date rather than today's, so that the field
      stays a real signal.
- [ ] Register a route in `app/src/data/appRoutes.ts` whenever one is added to
      `App.tsx`, or the server will return 404 for a page that exists.
      `appRoutes.test.ts` fails if the two drift.
- [ ] Backlinks remain the dominant off-page factor. A new domain in this
      vertical should not be expected to rank on published content alone for
      several months; plan paid and direct channels for launch traffic.
