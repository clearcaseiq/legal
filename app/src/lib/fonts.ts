import { Fraunces, Inter } from 'next/font/google'

/**
 * The two site faces, downloaded at build time and served from our own origin.
 *
 * They used to come from a `<link>` to fonts.googleapis.com in the document
 * head. That link is render-blocking and sits in front of a second blocking
 * request: the browser cannot paint until it has fetched the stylesheet from
 * one host, then the font files it names from another. On a phone that is two
 * extra connection setups (DNS, TCP, TLS) before any text appears, which is
 * most of the gap between mobile and desktop first paint.
 *
 * `next/font` resolves both at build time and emits the `@font-face` rules
 * inline, so there is no third-party origin on the critical path at all.
 *
 * It also generates a size-adjusted fallback face for each family — a local
 * face with `size-adjust`, `ascent-override` and `descent-override` tuned so it
 * occupies the same space as the real font. That is what stops `display: swap`
 * from shoving the page around when the real file lands, and it is why the
 * fallback list below is a genuine fallback rather than the thing that has to
 * match metrics by hand.
 */

export const sans = Inter({
  subsets: ['latin'],
  // Paint text in the fallback immediately rather than holding it back for up
  // to 3s. Safe to do precisely because of the size-adjusted fallback above.
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})

export const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  // Fraunces is variable; `opsz` is the axis its own design relies on for
  // optical sizing, and dropping it would flatten large headings.
  axes: ['opsz'],
  // Upright only. The old Google URL also asked for italic 400, which nothing
  // in the UI renders, so it was a font file fetched on every visit for nothing.
  fallback: ['Georgia', 'ui-serif', 'serif'],
})

/**
 * `:root` custom properties for the two families, so Tailwind's `font-sans` and
 * `font-display` resolve to the hashed family names next/font generates.
 *
 * Declared at the root rather than on a wrapper element because dropdowns and
 * modals render through `createPortal` into `document.body`, outside anything
 * `_app` wraps. A wrapper would leave those rendering in Times New Roman.
 */
export const fontVariablesCss = `:root{--font-sans:${sans.style.fontFamily};--font-display:${display.style.fontFamily};}`

