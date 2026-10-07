import type { NextApiRequest, NextApiResponse } from 'next'
import { indexableLandingPages } from '../../src/data/seoLandingPages'
import { caseTypeHubs } from '../../src/data/caseTypeHubDefs'

/**
 * Pages that render the editor-managed "Further reading" block, for the picker
 * in Admin → Page links. Lives in the web app because the page catalogue is
 * code here, not data in the API. English, indexable pages only: a link on a
 * noindex page carries no SEO weight, and translated pages don't render the block.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const pages = [
    ...caseTypeHubs.map((hub) => ({ path: hub.slug, title: hub.title })),
    ...indexableLandingPages()
      .filter((page) => !page.locale)
      .map((page) => ({ path: page.slug, title: page.title })),
  ]
  const unique = Array.from(new Map(pages.map((page) => [page.path, page])).values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  )
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).json({ pages: unique })
}
