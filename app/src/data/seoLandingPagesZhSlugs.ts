/**
 * The Chinese landing paths, as plain strings.
 *
 * A deliberate duplicate of the slugs in `seoLandingPagesZh`. That module holds
 * the full written content of every Chinese page, and `App.tsx` is loaded on
 * every route, so importing it there to declare routes would put all of that
 * prose into the bundle a visitor downloads to view the dashboard. Same reason
 * `LANDING_ES_SLUGS` exists.
 *
 * Enumerated rather than matched with `/zh/:slug`, so an invented Chinese path
 * still 404s instead of returning 200 with an empty page.
 * `seoLandingPagesZh.test.ts` fails if this list and the registry disagree.
 */
export const LANDING_ZH_SLUGS = [
  '/zh/anjian-jiazhi',
  '/zh/jiazhou-susong-shixiao',
  '/zh/heshi-qing-lvshi',
  '/zh/baoxian-gongsi-shouduan',
  '/zh/uber-lyft-shigu',
  '/zh/chehuo-hou-jingbu-tengtong',
  '/zh/chehuo-hou-beibu-tengtong',
] as const

export type LandingZhSlug = (typeof LANDING_ZH_SLUGS)[number]
