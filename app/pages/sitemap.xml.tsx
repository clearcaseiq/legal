import type { GetServerSideProps } from 'next'
import { allLandingPages } from '../src/data/seoLandingPages'

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

const exactPriorities: Record<string, string> = {
  '/': '1.0',
  '/tools/settlement-calculator': '1.0',
  '/tools/whiplash-settlement-calculator': '0.9',
  '/tools/herniated-disc-settlement-calculator': '0.9',
  '/tools/tbi-settlement-calculator': '0.9',
  '/tools/truck-accident-settlement-calculator': '0.9',
  '/education/how-much-does-a-lawyer-take-from-settlement': '0.8',
  '/education/when-to-hire-a-lawyer-after-accident': '0.8',
}

function priorityForPath(path: string) {
  if (exactPriorities[path]) return exactPriorities[path]
  if (path.startsWith('/how-much') || path.startsWith('/average-')) return '0.95'
  if (path.startsWith('/settlements/') || path.startsWith('/tools/')) return '0.9'
  if (path.startsWith('/injuries/') || path.startsWith('/treatment/')) return '0.8'
  if (path.startsWith('/insurance/') || path.startsWith('/liability/')) return '0.8'
  if (path.startsWith('/commercial/') || path.startsWith('/legal/')) return '0.8'
  if (path.startsWith('/case-strength/') || path.startsWith('/case-strength-')) return '0.8'
  if (path.endsWith('-car-accident')) return '0.8'
  if (path.startsWith('/california-statute-of-limitations-') || path === '/missed-the-statute-of-limitations') return '0.8'
  if (path.startsWith('/medical-records') || path.includes('medical-records') || path.includes('medical-chronology')) return '0.8'
  if (path.startsWith('/education/')) return '0.7'
  return '0.75'
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const uniqueSeoPaths = Array.from(new Set(allLandingPages.map((page) => page.slug))).sort()
  const staticPaths = ['/', '/how-it-works', '/for-attorneys', '/attorneys', '/privacy-policy', '/terms-of-service']
  const paths = Array.from(new Set([...staticPaths, ...uniqueSeoPaths]))
  const lastmod = new Date().toISOString().split('T')[0]

  const urls = paths
    .map((path) => {
      const loc = `${SITE_URL}${path === '/' ? '' : path}`
      return [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        '    <changefreq>weekly</changefreq>',
        `    <priority>${priorityForPath(path)}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
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
