import type { GetServerSideProps } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.clearcaseiq.com'

function RobotsTxt() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const robots = [
    'User-agent: *',
    '',
    '# Admin Areas',
    'Disallow: /admin/',
    'Disallow: /private/',
    'Disallow: /api/',
    'Disallow: /dashboard/',
    'Disallow: /auth/',
    'Disallow: /attorney-dashboard/',
    'Disallow: /firm-dashboard/',
    'Disallow: /evidence-upload/',
    'Disallow: /evidence-dashboard/',
    'Disallow: /results/',
    'Disallow: /edit-assessment/',
    '',
    '# Allow SEO Content',
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
