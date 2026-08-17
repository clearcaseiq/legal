import type { GetServerSideProps } from 'next'
import { CONTENT_LAST_UPDATED, landingPageLastModified } from '../src/data/seoLandingPageSchema'
import {
  MARKETING_CONTENT_UPDATED,
  marketingPagesByPath,
  marketingSitemapPaths,
} from '../src/data/marketingPages'
import { alternatesForPath } from '../src/data/localeAlternates'
import { allLandingPages, landingPagesBySlug } from '../src/data/seoLandingPages'
import { priorityForPath } from '../src/data/sitemapPriority'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clearcaseiq.com'

function SitemapXml() {
  return null
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Deliberately not today's date. Regenerating lastmod on every request told
 * crawlers every page changed daily, which trains them to ignore the field and
 * costs a real signal when the content genuinely does change. Each content set
 * carries the date it was actually revised, so the values differ per URL.
 */
function lastmodForPath(path: string) {
  const page = landingPagesBySlug.get(path)
  if (page) return landingPageLastModified(page)
  const marketingPage = marketingPagesByPath.get(path)
  if (marketingPage) return marketingPage.contentUpdated ?? MARKETING_CONTENT_UPDATED
  return CONTENT_LAST_UPDATED
}

/**
 * hreflang annotations for a URL, as `xhtml:link` children.
 *
 * Duplicated here as well as in the page head on purpose: Google accepts either,
 * but the sitemap is the only channel that still works when a page is fetched
 * from a cache that strips head links, and having both is explicitly supported.
 */
function alternateLinks(path: string) {
  return alternatesForPath(path).map((alternate) => {
    const href = `${SITE_URL}${alternate.path === '/' ? '' : alternate.path}`
    return `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(href)}" />`
  })
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const uniqueSeoPaths = Array.from(new Set(allLandingPages.map((page) => page.slug))).sort()
  const paths = Array.from(new Set([...marketingSitemapPaths, ...uniqueSeoPaths]))

  const urls = paths
    .map((path) => {
      const loc = `${SITE_URL}${path === '/' ? '' : path}`
      return [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${lastmodForPath(path)}</lastmod>`,
        '    <changefreq>weekly</changefreq>',
        `    <priority>${priorityForPath(path)}</priority>`,
        ...alternateLinks(path),
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    '</urlset>',
    '',
  ].join('\n')

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(sitemap)
  res.end()

  return { props: {} }
}

export default SitemapXml
