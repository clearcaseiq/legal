/**
 * The production origin, on its own so importing it costs nothing.
 *
 * It used to live in `seoLandingPageSchema.ts`, which imports the city-facts
 * table and the topic-hub definitions at module scope. That was harmless while
 * only server code and the landing-page renderer read it, but the organisation
 * schema is rendered by `Layout.tsx` — that is, on every page — and reaching
 * through that module for one string would have pulled the whole landing-page
 * data graph into the bundle every visitor downloads.
 *
 * Keep this module free of imports for the same reason.
 */
export const DEFAULT_SITE_URL = 'https://www.clearcaseiq.com'
