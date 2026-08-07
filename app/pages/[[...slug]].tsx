import type { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import SsrRoot from '../src/ssr-root'
import { marketingPagesByPath } from '../src/data/marketingPages'
import { landingPagesBySlug } from '../src/data/seoLandingPages'
import {
  buildLandingPageSchema,
  landingPageCanonical,
  landingPageTitle,
  siteUrl,
} from '../src/data/seoLandingPageSchema'

// SEO landing pages are rendered on the server so crawlers receive the article
// text, not an empty shell. Every other route is app UI behind a login and has
// no SEO value, so it keeps mounting client-side.
const NextRoot = dynamic(() => import('../src/next-root'), {
  ssr: false,
})

const DEFAULT_TITLE = 'ClearCaseIQ | AI-Powered Personal Injury Case Evaluation & Attorney Matching'
const DEFAULT_DESCRIPTION =
  'ClearCaseIQ helps accident victims evaluate personal injury claims, estimate settlement value, organize medical records, and connect with attorneys.'
const OG_IMAGE = `${siteUrl}/clearcaseiq-logo.png`

type SeoProps = {
  title: string
  description: string
  canonical: string
  schema: string | null
}

type PageProps = {
  seo: SeoProps
  /** Path to render on the server, or null for client-only routes. */
  ssrLocation: string | null
}

export default function CatchAllPage({ seo, ssrLocation }: PageProps) {
  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ClearCaseIQ" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.canonical} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        {seo.schema ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: seo.schema }} />
        ) : null}
      </Head>
      {ssrLocation ? <SsrRoot location={ssrLocation} /> : <NextRoot />}
    </>
  )
}

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ params, res }) => {
  const segments = Array.isArray(params?.slug) ? params.slug : []
  const pathname = segments.length ? `/${segments.join('/')}` : '/'
  const page = landingPagesBySlug.get(pathname)

  if (page) {
    // Landing pages are anonymous marketing content and the shell carries no
    // user data, so they are safe to cache at the edge.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

    return {
      props: {
        ssrLocation: pathname,
        seo: {
          title: landingPageTitle(page),
          description: page.description,
          canonical: landingPageCanonical(page),
          schema: JSON.stringify(buildLandingPageSchema(page)),
        },
      },
    }
  }

  const canonical = `${siteUrl}${pathname === '/' ? '' : pathname}`
  const marketingPage = marketingPagesByPath.get(pathname)

  if (marketingPage) {
    if (marketingPage.serverRender) {
      // Server-rendered marketing pages show the signed-out shell to everyone,
      // so the response is identical for every visitor and safe to cache.
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    }

    return {
      props: {
        ssrLocation: marketingPage.serverRender ? pathname : null,
        seo: {
          title: marketingPage.title,
          description: marketingPage.description,
          canonical,
          schema: null,
        },
      },
    }
  }

  return {
    props: {
      ssrLocation: null,
      seo: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        canonical,
        schema: null,
      },
    },
  }
}
