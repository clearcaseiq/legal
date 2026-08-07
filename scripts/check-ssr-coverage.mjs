/**
 * Checks every URL in the sitemap against a running server and reports whether
 * it arrives as real HTML or as an empty app shell.
 *
 * Server rendering fails silently from a crawler's point of view: a component
 * that reads localStorage during render, or a route that starts fetching its
 * content in an effect, still looks fine in a browser while shipping an empty
 * page to Google. Run this after changes to the render path.
 *
 *   node scripts/check-ssr-coverage.mjs
 *   BASE_URL=https://staging.example.com node scripts/check-ssr-coverage.mjs
 *
 * The three legal/attorney-directory pages are client-only by design because
 * their body comes from the API; everything else should be server-rendered.
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const MIN_RENDERED_BYTES = 20000

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text()
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)

console.log(`sitemap entries: ${paths.length}`)

const failures = []
const clientOnly = []
let rendered = 0

for (const path of paths) {
  const res = await fetch(`${BASE}${path}`)
  const html = await res.text()
  // The router's Suspense fallback leaking into the response means the route
  // never resolved on the server.
  const servedFallback = html.includes('Loading page')

  if (res.status !== 200 || servedFallback) {
    failures.push(`${path} status=${res.status} fallback=${servedFallback}`)
  } else if (/<h1[^>]*>/.test(html) && html.length > MIN_RENDERED_BYTES) {
    rendered++
  } else {
    clientOnly.push(`${path} (${html.length} bytes)`)
  }
}

console.log(`\nserver-rendered : ${rendered}`)
console.log(`client-only     : ${clientOnly.length}`)
console.log(`failures        : ${failures.length}`)

if (failures.length) {
  console.log('\n--- FAILURES ---')
  failures.forEach((f) => console.log('  ' + f))
}
if (clientOnly.length) {
  console.log('\n--- CLIENT-ONLY ---')
  clientOnly.forEach((c) => console.log('  ' + c))
}

process.exit(failures.length ? 1 : 0)
