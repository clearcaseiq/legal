import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getApiOrigin } from './runtimeEnv'

/** A link a content editor attached to a public page (Admin → Page links). */
export type PublicPageLink = {
  id: string
  url: string
  anchor: string
  kind: 'internal' | 'outbound'
  rel: 'follow' | 'nofollow' | 'sponsored'
}

type PageLinksSeed = { path: string; links: PublicPageLink[] } | null

const PageLinksContext = createContext<PageLinksSeed>(null)

/** Seeds the links fetched during server rendering so hydration matches the HTML. */
export function PageLinksProvider({ value, children }: { value: PageLinksSeed; children: ReactNode }) {
  return <PageLinksContext.Provider value={value}>{children}</PageLinksContext.Provider>
}

const FETCH_TIMEOUT_MS = 1000

async function fetchLinks(origin: string, path: string): Promise<PublicPageLink[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`${origin}/v1/page-links?path=${encodeURIComponent(path)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const body = await res.json()
    return Array.isArray(body?.data) ? (body.data as PublicPageLink[]) : []
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Server-side fetch for getServerSideProps. Never throws and gives up after a
 * second: a slow or missing API must not hold up or break a public page.
 */
export function fetchPageLinksOnServer(path: string): Promise<PublicPageLink[]> {
  const origin = (process.env.API_PROXY_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000').replace(
    /\/+$/,
    '',
  )
  return fetchLinks(origin, path)
}

/**
 * Links for `path`. Uses the server-rendered seed when it is for this page;
 * otherwise (in-app navigation, client-only render) fetches after mount.
 */
export function usePageLinks(path: string): PublicPageLink[] {
  const seed = useContext(PageLinksContext)
  const seeded = seed && seed.path === path ? seed.links : null
  const [links, setLinks] = useState<PublicPageLink[]>(seeded ?? [])

  useEffect(() => {
    if (seeded) {
      setLinks(seeded)
      return
    }
    let cancelled = false
    setLinks([])
    void fetchLinks(getApiOrigin(), path).then((next) => {
      if (!cancelled) setLinks(next)
    })
    return () => {
      cancelled = true
    }
    // `seeded` is derived from `seed` and `path`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, path])

  return links
}

/** `rel` for an outbound link; internal links get none. */
export function outboundRel(rel: PublicPageLink['rel']): string {
  if (rel === 'follow') return 'noopener noreferrer'
  return `${rel} noopener noreferrer`
}
