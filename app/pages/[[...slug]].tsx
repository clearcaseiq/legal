import type { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import SsrRoot from '../src/ssr-root'
import AppRouteShell from '../src/components/AppRouteShell'
import SiteAnalytics from '../src/components/SiteAnalytics'
import { isKnownAppRoute, topicHubForClusterPrefix } from '../src/data/appRoutes'
import { indexingEnabled } from '../src/lib/siteConfig'
import { DEFAULT_LANGUAGE, type LanguageCode } from '../src/i18n'
import { alternatesForPath } from '../src/data/localeAlternates'
import { marketingPagesByPath } from '../src/data/marketingPages'
import { landingPagesBySlug } from '../src/data/seoLandingPages'
import {
  buildLandingPageSchema,
  buildMarketingPageSchema,
  clampDescription,
  clampTitle,
  landingPageCanonical,
  landingPageDescription,
  landingPageOgImage,
  landingPageTitle,
  ogImageUrl,
  siteUrl,
} from '../src/data/seoLandingPageSchema'

// SEO landing pages are rendered on the server so crawlers receive the article
// text, not an empty shell. Every other route is app UI behind a login and has
// no SEO value, so it keeps mounting client-side.
//
// `loading` is what the server sends for those routes, and what the client
// renders until this chunk arrives. Without it the response body is empty and
// first paint cannot happen until the bundle has executed. See AppRouteShell.
const NextRoot = dynamic(() => import('../src/next-root'), {
  ssr: false,
  loading: () => <AppRouteShell />,
})

// Same chunk, no shell. An embedded view renders without site chrome, so the
// shell's header would be drawn and then taken away the moment the app mounts —
// the one case where sending it costs a layout shift instead of saving a paint.
const EmbeddedNextRoot = dynamic(() => import('../src/next-root'), {
  ssr: false,
})

// 76 characters, so it was also every app route's "title too long" warning.
const DEFAULT_TITLE = 'Personal Injury Case Evaluation | ClearCaseIQ'
const DEFAULT_DESCRIPTION =
  'ClearCaseIQ helps accident victims evaluate personal injury claims, estimate settlement value, organize medical records, and connect with attorneys.'

/**
 * A readable title for an app route.
 *
 * Every one of these used to fall back to the same string, so a crawl reported
 * them as a pile of duplicate titles and duplicate descriptions. They are
 * noindexed, but the title is still what shows in a browser tab, in history, and
 * in a bookmark, and a distinct one costs nothing.
 */
function appRouteTitle(pathname: string) {
  const words = pathname
    .split('/')
    .filter(Boolean)
    // Drop record ids and other opaque segments; they are not worth reading.
    .filter((segment) => !/^[0-9a-f]{8,}$/i.test(segment) && !/^\d+$/.test(segment))
    .join(' ')
    .replace(/[-_]+/g, ' ')
    .trim()

  if (!words) return DEFAULT_TITLE
  const label = words.charAt(0).toUpperCase() + words.slice(1)
  return clampTitle(`${label} | ClearCaseIQ`)
}
// A 1200x630 card rather than the logo: social platforms crop a square logo
// badly and render it as a small thumbnail instead of a full-width preview.
const OG_IMAGE = `${siteUrl}/clearcaseiq-og-card.png`
const OG_IMAGE_ALT = 'ClearCaseIQ — know what your injury case is worth'

type SeoProps = {
  title: string
  description: string
  canonical: string
  schema: string | null
  /** Set on 404s and app UI so search engines drop the URL instead of indexing it. */
  noindex?: boolean
  /** Per-page social card; falls back to the site-wide one. */
  ogImage?: string
  /**
   * Absolute URLs of this page in every language it exists in, including itself.
   * Empty for pages with no translation.
   */
  alternates?: Array<{ hreflang: string; href: string }>
}

type PageProps = {
  seo: SeoProps
  /** Path to render on the server, or null for client-only routes. */
  ssrLocation: string | null
  /** Public marketing content, so analytics may load. See SiteAnalytics. */
  publicPage: boolean
  /** Language the URL fixes this page to, for localized paths. */
  language?: LanguageCode
  /** Dictionary slices for `language`, so the first render is not English. */
  messages?: Record<string, unknown> | null
  /** Chrome-less partner view, which also gets no loading shell. */
  embed?: boolean
}

export default function CatchAllPage({ seo, ssrLocation, publicPage, language, messages, embed }: PageProps) {
  const ogImage = seo.ogImage || OG_IMAGE
  const ogImageAlt = seo.ogImage ? seo.title : OG_IMAGE_ALT

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        {seo.noindex ? <meta name="robots" content="noindex, follow" /> : null}
        {seo.noindex ? null : <link rel="canonical" href={seo.canonical} />}
        {/* Only emitted for pages that genuinely exist in more than one language,
            and always as a complete reciprocal set — an annotation the other side
            does not confirm is ignored outright. */}
        {seo.alternates?.map((alternate) => (
          <link key={alternate.hreflang} rel="alternate" hrefLang={alternate.hreflang} href={alternate.href} />
        ))}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ClearCaseIQ" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.canonical} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={ogImageAlt} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content={ogImageAlt} />
        {seo.schema ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: seo.schema }} />
        ) : null}
      </Head>
      {publicPage ? <SiteAnalytics /> : null}
      {ssrLocation ? (
        <SsrRoot location={ssrLocation} language={language} messages={messages ?? undefined} />
      ) : embed ? (
        <EmbeddedNextRoot />
      ) : (
        <NextRoot />
      )}
    </>
  )
}

/**
 * The dictionary slices a localized page needs, read on the server only.
 *
 * The import lives in here rather than at module scope because Next strips
 * `getServerSideProps` from the client bundle: at module scope this would put
 * the entire 280 KB Spanish dictionary into the shared bundle that every
 * English visitor downloads.
 */
async function messagesFor(locale: LanguageCode | undefined, namespaces: string[] | undefined) {
  if (!locale || locale === DEFAULT_LANGUAGE || !namespaces?.length) return null

  const dictionary =
    locale === 'es'
      ? ((await import('../src/i18n/locales/es.json')).default as Record<string, unknown>)
      : locale === 'zh'
        ? ((await import('../src/i18n/locales/zh.json')).default as Record<string, unknown>)
        : null
  if (!dictionary) return null

  const selected: Record<string, unknown> = {}
  for (const namespace of namespaces) {
    if (namespace in dictionary) selected[namespace] = dictionary[namespace]
  }
  return selected
}

/** Absolute hreflang set for a path, empty when the page has no translation. */
function alternatesFor(pathname: string) {
  return alternatesForPath(pathname).map((alternate) => ({
    hreflang: alternate.hreflang,
    href: `${siteUrl}${alternate.path === '/' ? '' : alternate.path}`,
  }))
}

const resolvePage: GetServerSideProps<PageProps> = async ({ params, query, res }) => {
  const segments = Array.isArray(params?.slug) ? params.slug : []
  const pathname = segments.length ? `/${segments.join('/')}` : '/'
  const page = landingPagesBySlug.get(pathname)

  // Embeds are the one case where the query string changes what to render: the
  // tool has to come up without the site chrome on the very first paint, or a
  // partner's iframe shows a full ClearCaseIQ page for a moment and then
  // collapses. It also means the embedded view is never indexed as a rival of
  // the real page.
  const isEmbed = query.embed === '1'
  const renderLocation = isEmbed ? `${pathname}?embed=1` : pathname

  // /assessment/start is the CTA in both the header and the footer, which makes
  // it the most linked URL on the site after the home page — and it was never a
  // page. It booted the whole app only for React to redirect to /assess?fresh=1,
  // so a visitor waited on the JS bundle before the wizard even began loading
  // and a crawler spent a full render to learn the URL was an alias. Answering
  // with a redirect resolves it before a byte of JavaScript is sent.
  //
  // The equivalent client-side route stays in App.tsx: in-app CTA clicks are
  // react-router navigations that never reach the server, and this only catches
  // cold loads, shared links and crawlers.
  if (pathname === '/assessment/start') {
    const forwarded = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      // `slug` is the catch-all's own path segments, not a real query param.
      if (key === 'slug') continue
      if (typeof value === 'string') forwarded.set(key, value)
      else if (Array.isArray(value)) for (const entry of value) forwarded.append(key, entry)
    }
    // The wizard reads `fresh` to start a new assessment instead of resuming a
    // saved draft, which is what the client-side redirect has always passed.
    forwarded.set('fresh', '1')

    return {
      redirect: {
        destination: `/assess?${forwarded.toString()}`,
        permanent: true,
      },
    }
  }

  if (page) {
    // Landing pages are anonymous marketing content and the shell carries no
    // user data, so they are safe to cache at the edge.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

    return {
      props: {
        ssrLocation: renderLocation,
        publicPage: !isEmbed,
        language: page.locale ?? DEFAULT_LANGUAGE,
        messages: await messagesFor(page.locale, page.namespaces),
        seo: {
          title: landingPageTitle(page),
          description: landingPageDescription(page),
          canonical: landingPageCanonical(page),
          schema: isEmbed ? null : JSON.stringify(buildLandingPageSchema(page)),
          ogImage: landingPageOgImage(page),
          // `page.noindex` is the thinning switch; see the field on LandingPage.
          // The page still renders and still 200s — a crawler has to fetch it to
          // read the tag that removes it.
          noindex: isEmbed || page.noindex === true,
          alternates: isEmbed ? [] : alternatesFor(pathname),
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
        ssrLocation: marketingPage.serverRender ? renderLocation : null,
        publicPage: !isEmbed,
        language: marketingPage.locale ?? DEFAULT_LANGUAGE,
        messages: await messagesFor(marketingPage.locale, marketingPage.namespaces),
        seo: {
          title: clampTitle(marketingPage.title),
          description: clampDescription(marketingPage.description),
          canonical,
          schema:
            isEmbed || !marketingPage.schemaType
              ? null
              : JSON.stringify(buildMarketingPageSchema(marketingPage)),
          ogImage: ogImageUrl(marketingPage.title),
          noindex: isEmbed,
          alternates: isEmbed ? [] : alternatesFor(pathname),
        },
      },
    }
  }

  // A bare SEO cluster prefix: /treatment rather than /treatment/mri-after-accident.
  // Nothing links to these and no page exists at them; crawlers reach them by
  // truncating a child URL. Sending them to the topic hub that lists those
  // children turns a discarded request into a signal for a page that does exist,
  // where a 404 would spend the same crawl and leave nothing behind.
  //
  // Checked after the landing and marketing lookups above so a real page always
  // wins, and only on an exact match so children are untouched.
  const clusterHub = topicHubForClusterPrefix(pathname)
  if (clusterHub) {
    return {
      redirect: {
        destination: clusterHub,
        permanent: true,
      },
    }
  }

  if (!isKnownAppRoute(pathname)) {
    // The URL matches nothing the app can render. Answering 200 here would make
    // every typo look like a real page to a crawler.
    res.statusCode = 404

    return {
      props: {
        ssrLocation: null,
        publicPage: false,
        embed: isEmbed,
        seo: {
          title: 'Page Not Found | ClearCaseIQ',
          description: DEFAULT_DESCRIPTION,
          canonical,
          schema: null,
          noindex: true,
        },
      },
    }
  }

  // A real app route, but one with no public content: login, intake, dashboards,
  // internal tools. These answer 200 with the site-wide title and a body that is
  // empty until JS runs, so to a crawler they are indistinguishable from each
  // other and from a soft 404. Indexing them puts near-duplicate, contentless
  // URLs in front of searchers and spends crawl budget that belongs to the
  // landing pages. `follow` is kept so links out of them still carry weight.
  return {
    props: {
      ssrLocation: null,
      publicPage: false,
      embed: isEmbed,
      seo: {
        title: appRouteTitle(pathname),
        description: DEFAULT_DESCRIPTION,
        canonical,
        schema: null,
        noindex: true,
      },
    },
  }
}

/**
 * Everything above decides what a page *is*. This decides what this particular
 * deployment is allowed to do, which is a property of the host rather than the
 * route: be indexed, and report to analytics.
 *
 * It wraps the resolver instead of touching each branch because there are five
 * return sites, and a non-production environment that stayed indexable through
 * the one branch someone forgot would compete with the live site for its own
 * queries — the failure is invisible until rankings move.
 *
 * `publicPage` is what gates SiteAnalytics, and the measurement id is baked into
 * the image at build time because Next inlines `NEXT_PUBLIC_*`. One promotable
 * image therefore carries production's id everywhere it runs, so QA would report
 * its own test traffic into the production property and quietly corrupt the
 * numbers the site is measured on. Clearing the flag here is what stops that,
 * and it follows the same rule: a deployment that is not the public site does
 * not behave as the public site.
 *
 * Canonical URLs are deliberately left pointing at the production origin. They
 * are built from the baked `siteUrl`, and rewriting them per environment would
 * mean threading an origin through the schema builders and the five client
 * components that also use it, to change a value that no crawler will ever read
 * on a host that is `noindex` and disallowed in robots.txt.
 */
export const getServerSideProps: GetServerSideProps<PageProps> = async (context) => {
  const result = await resolvePage(context)

  if (!('props' in result) || indexingEnabled()) return result

  const props = await result.props
  return {
    props: { ...props, publicPage: false, seo: { ...props.seo, noindex: true } },
  }
}
