import type { GetServerSideProps } from 'next'
import { indexingEnabled, serverSiteUrl } from '../src/lib/siteConfig'

function RobotsTxt() {
  return null
}

function disallowEverything() {
  return [
    '# Non-production deployment. This host serves the same pages as the live',
    '# site, so it is closed to crawlers entirely rather than competing with it.',
    'User-agent: *',
    'Disallow: /',
    '',
  ].join('\n')
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const SITE_URL = serverSiteUrl()

  if (!indexingEnabled()) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    // Deliberately not cached. A disallow-all accidentally served by production
    // and then held in a CDN for an hour is the expensive direction of this
    // mistake, so it stays cheap to correct.
    res.setHeader('Cache-Control', 'no-store')
    res.write(disallowEverything())
    res.end()

    return { props: {} }
  }

  const robots = [
    'User-agent: *',
    '',
    // No trailing slashes: "Disallow: /dashboard/" matches /dashboard/x but
    // leaves /dashboard itself crawlable, which is where these routes live.
    '# Admin Areas',
    'Disallow: /admin',
    'Disallow: /private',
    'Disallow: /api',
    'Disallow: /dashboard',
    'Disallow: /auth',
    'Disallow: /attorney-dashboard',
    'Disallow: /firm-dashboard',
    'Disallow: /evidence-upload',
    'Disallow: /evidence-dashboard',
    'Disallow: /results',
    'Disallow: /edit-assessment',
    '',
    // Deliberately not disallowed: /assess, /login, /register, /intake, /profile
    // and the other app routes. They serve `noindex` instead, and a crawler has
    // to be able to fetch a page to read that — blocking them here would leave
    // the bare URLs in the index with no way to remove them.
    //
    // A site audit asked for `Disallow: /assess` to keep the funnel out of
    // search. It is already out: /assess and /assess?fresh=1 both return
    // `noindex, follow`, which removes them properly. Adding the rule would
    // stop Google fetching the page and therefore stop it ever seeing the
    // noindex, which is the failure this comment exists to prevent.
    '# Social share cards, exempt from the /api rule above so link previews render',
    'Allow: /api/og',
    '',
    // The 21 `Allow:` rules that used to sit here were removed. Nothing above
    // disallows those paths, so every one of them was a no-op, and three were
    // not paths at all but prefixes — /how-much-is-, /average-, and
    // /california-statute-of-limitations-. Twenty-one inert lines around six
    // real ones is how a rule that matters gets missed.
    '# /es and /zh are deliberate indexable editions, not duplicate English pages.',
    '',
    '# Sitemap',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n')

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(robots)
  res.end()

  return { props: {} }
}

export default RobotsTxt
