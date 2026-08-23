/**
 * The Spanish landing paths, as plain strings.
 *
 * A deliberate duplicate of the slugs in `seoLandingPagesEs`. That module holds
 * the full written content of every Spanish page, and `App.tsx` is loaded on
 * every route, so importing it there to declare routes would put all of that
 * prose into the bundle a visitor downloads to view the dashboard. Same reason
 * `CALCULATOR_VARIANT_SLUGS` exists.
 *
 * Enumerated rather than matched with `/es/:slug`, so an invented Spanish path
 * still 404s instead of returning 200 with an empty page.
 * `seoLandingPagesEs.test.ts` fails if this list and the registry disagree.
 */
export const LANDING_ES_SLUGS = [
  '/es/cuanto-vale-mi-caso',
  '/es/plazo-para-demandar-en-california',
  '/es/estatus-migratorio-y-reclamos',
  '/es/dolor-de-cuello-despues-de-un-accidente',
  '/es/dolor-de-espalda-despues-de-un-accidente',
  '/es/cuando-contratar-un-abogado',
  '/es/tacticas-de-las-aseguradoras',
  '/es/accidentes-de-uber-y-lyft',
  '/es/cuanto-vale-un-caso-de-mordedura-de-perro',
  '/es/cuanto-vale-un-caso-de-resbalon-y-caida',
  '/es/cuanto-vale-un-caso-de-muerte-por-negligencia',
  '/es/cuanto-vale-un-caso-de-accidente-de-camion',
  '/es/cuanto-vale-un-caso-de-atropello-de-peaton',
  '/es/cuanto-vale-un-caso-de-accidente-de-bicicleta',
] as const

export type LandingEsSlug = (typeof LANDING_ES_SLUGS)[number]
