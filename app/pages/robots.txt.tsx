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
    // Deliberately not disallowed: /login, /register, /intake, /profile and the
    // other app routes. They serve `noindex` instead, and a crawler has to be
    // able to fetch a page to read that — blocking them here would leave the
    // bare URLs in the index with no way to remove them.
    '# Social share cards, exempt from the /api rule above so link previews render',
    'Allow: /api/og',
    '',
    '# Allow SEO Content',
    // The translated editions. Their URLs are not disallowed anywhere above, so
    // these are documentation rather than rules, but a crawler operator reading
    // this file should be able to see that /es and /zh are deliberate, indexable
    // sections rather than accidental duplicates of the English pages.
    'Allow: /es/',
    'Allow: /zh/',
    'Allow: /injuries/',
    'Allow: /treatment/',
    'Allow: /settlements/',
    'Allow: /insurance/',
    'Allow: /liability/',
    'Allow: /education/',
    'Allow: /commercial/',
    'Allow: /legal/',
    'Allow: /tools/',
    'Allow: /case-strength/',
    'Allow: /how-much-is-',
    'Allow: /average-',
    'Allow: /california-statute-of-limitations-',
    'Allow: /medical-records',
    'Allow: /how-to-organize-medical-records',
    'Allow: /how-to-build-a-medical-chronology',
    'Allow: /what-medical-records-do-lawyers-need',
    'Allow: /how-insurance-companies-review-medical-records',
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
