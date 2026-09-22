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
    // Only /api is disallowed, and only because it is the one thing here that
    // cannot carry a `noindex`: its routes return JSON and images, not HTML
    // with a meta tag a crawler could read.
    //
    // Every app route serves `noindex, follow` and is therefore deliberately
    // left crawlable. A crawler has to fetch a page to read that tag, so a
    // Disallow does the opposite of what it looks like: it strands the bare
    // URL in the index with no snippet and no way to remove it.
    //
    // Ten routes used to be listed here — /admin, /dashboard, /attorney-dashboard,
    // /firm-dashboard, /evidence-upload, /evidence-dashboard, /results,
    // /edit-assessment, /auth and /private — while /assess and the rest of the
    // app relied on noindex, with a comment explaining why that was correct.
    // Both cannot be right. All ten were confirmed to serve `noindex, follow`,
    // so the block was the only thing keeping Google from acting on it. (/private
    // and /auth 404 outright, and had never matched a page at all.)
    //
    // A site audit asked for `Disallow: /assess` to keep the funnel out of
    // search. It is already out, by the same mechanism: /assess and
    // /assess?fresh=1 both return `noindex, follow`, which removes them
    // properly. Adding the rule would stop Google fetching the page and
    // therefore stop it ever seeing the noindex.
    '# API routes, which return JSON and cannot carry a noindex tag',
    'Disallow: /api',
    '',
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
