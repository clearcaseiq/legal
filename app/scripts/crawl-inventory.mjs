/**
 * Measures how much of the site is reachable by following links.
 *
 * External SEO crawlers report inventory this way, so this answers the question
 * they answer: starting at "/", how many pages can actually be found? It once
 * reported 35 URLs and 7 of 173 landing pages, because the landing pages were
 * linked only from the sitemap. Run it after touching navigation, the footer, or
 * the topic hubs to confirm nothing has been orphaned again.
 *
 * Usage:
 *   node scripts/crawl-inventory.mjs [origin]
 *   node scripts/crawl-inventory.mjs https://www.clearcaseiq.com
 *
 * Exits non-zero when a URL the sitemap advertises cannot be reached by
 * navigation, so it can gate a deploy.
 */
const ORIGIN = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '')

function pathOf(href, from) {
  if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) return null
  let url
  try {
    url = new URL(href, ORIGIN + from)
  } catch {
    return null
  }
  if (url.origin !== ORIGIN) return null
  const p = url.pathname
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
}

async function sitemapPaths() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`)
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, '') || '/')
}

const pages = new Map()
const queue = ['/']
const queued = new Set(['/'])

while (queue.length) {
  const path = queue.shift()
  let res
  try {
    res = await fetch(ORIGIN + path)
  } catch (error) {
    pages.set(path, { status: 'ERR', note: String(error) })
    continue
  }

  if (!res.headers.get('content-type')?.includes('text/html')) {
    pages.set(path, { status: res.status, asset: true })
    continue
  }

  const html = await res.text()
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null
  pages.set(path, {
    status: res.status,
    title,
    description: html.match(/<meta name="description"[^>]*content="([^"]*)"/i)?.[1] || null,
    noindex: /<meta name="robots"[^>]*content="[^"]*noindex/i.test(html),
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    schema: (html.match(/application\/ld\+json/gi) || []).length,
  })

  for (const match of html.matchAll(/<a\b[^>]*href="([^"]*)"/gi)) {
    const next = pathOf(match[1], path)
    if (next && !queued.has(next)) {
      queued.add(next)
      queue.push(next)
    }
  }
}

const documents = [...pages.entries()].filter(([, p]) => !p.asset && typeof p.status === 'number')
const indexable = documents.filter(([, p]) => !p.noindex)

const counts = (key) => {
  const groups = new Map()
  for (const [, p] of indexable) {
    const value = p[key]
    if (value) groups.set(value, (groups.get(value) || 0) + 1)
  }
  return [...groups].filter(([, n]) => n > 1)
}

console.log(`\nOrigin: ${ORIGIN}`)
console.log(`URLs reachable from "/":   ${pages.size}`)
console.log(`  HTML documents:          ${documents.length}`)
console.log(`  indexable:               ${indexable.length}`)
console.log(`  noindex:                 ${documents.length - indexable.length}`)
console.log(`\nAmong indexable pages:`)
console.log(`  missing H1:              ${indexable.filter(([, p]) => p.h1 === 0).length}`)
console.log(`  missing structured data: ${indexable.filter(([, p]) => p.schema === 0).length}`)
console.log(`  title over 60 chars:     ${indexable.filter(([, p]) => (p.title?.length || 0) > 60).length}`)
console.log(`  duplicate titles:        ${counts('title').length}`)
console.log(`  duplicate descriptions:  ${counts('description').length}`)

for (const [title, n] of counts('title')) console.log(`    x${n} title: ${title}`)
for (const [, n] of counts('description')) console.log(`    x${n} duplicate description`)

const advertised = await sitemapPaths()
const orphaned = advertised.filter((p) => !pages.has(p))
console.log(`\nSitemap URLs:              ${advertised.length}`)
console.log(`  orphaned (sitemap-only):  ${orphaned.length}`)
for (const p of orphaned) console.log(`    ${p}`)

if (orphaned.length) {
  console.error(`\nFAIL: ${orphaned.length} sitemap URL(s) unreachable by navigation.`)
  process.exit(1)
}
console.log('\nOK: every sitemap URL is reachable by following links.')
