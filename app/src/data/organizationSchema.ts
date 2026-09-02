import { DEFAULT_SITE_URL } from './siteOrigin'

/**
 * One description of ClearCaseIQ as an entity, for every page that publishes it.
 *
 * `Layout.tsx` and `About.tsx` each carried their own copy, and they had already
 * diverged — one claimed a logo and a description, the other did not. Two
 * partial answers to "what is this organisation" is worse than one, because the
 * entity a search engine builds is assembled from all of them and the
 * disagreements are what it has to resolve. It also meant every change to the
 * organisation was two edits, with no way to notice when only one was made.
 */

export const ORGANIZATION_NAME = 'ClearCaseIQ'
export const ORGANIZATION_LEGAL_NAME = 'ClearCaseIQ Corp.'
export const ORGANIZATION_EMAIL = 'support@clearcaseiq.com'

const ORGANIZATION_DESCRIPTION =
  'AI-powered legal technology that helps injury victims evaluate personal injury claims and connect with participating attorneys — with consent. Not a law firm.'

/**
 * Street address, postal code and phone: omitted by decision, not left to do.
 *
 * ClearCaseIQ operates remotely and has no staffed public office, and support
 * runs on email rather than a phone line. So there is no street address or
 * number to publish, and the honest structured data says nothing about either.
 *
 * Do not fill these in to "complete" the schema. All three are fields Google
 * reconciles against a Business Profile and the legal directories, so a value
 * that is not a real staffed location or a real answered line does not merely
 * fail to help — it contradicts the authoritative record and splits the entity.
 * A Business Profile at an address nobody occupies is also grounds for
 * suspension. Schema.org marks all three optional; omission is valid, and
 * disagreement is much harder to undo than absence.
 *
 * If that changes, set them here once and use byte-identical strings in the
 * Business Profile, the directories and the site footer. Inconsistent
 * name/address/phone across those is the problem this single source prevents.
 */
export const ORGANIZATION_STREET_ADDRESS = ''
export const ORGANIZATION_POSTAL_CODE = ''
export const ORGANIZATION_TELEPHONE = ''

/** Drops keys with no value, so an unset field is absent rather than empty. */
function withoutBlanks<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== '' && v != null)) as Partial<T>
}

export const organizationAddress = {
  '@type': 'PostalAddress',
  ...withoutBlanks({
    streetAddress: ORGANIZATION_STREET_ADDRESS,
    addressLocality: 'Los Angeles',
    addressRegion: 'CA',
    postalCode: ORGANIZATION_POSTAL_CODE,
    addressCountry: 'US',
  }),
}

/**
 * The Organization node. `nested` omits the fields that only make sense on the
 * node a page is primarily about, so an embedded reference stays a reference.
 */
export function organizationSchema({ nested = false }: { nested?: boolean } = {}) {
  return {
    '@type': 'Organization',
    name: ORGANIZATION_NAME,
    legalName: ORGANIZATION_LEGAL_NAME,
    url: DEFAULT_SITE_URL,
    email: ORGANIZATION_EMAIL,
    ...withoutBlanks({ telephone: ORGANIZATION_TELEPHONE }),
    address: organizationAddress,
    ...(nested
      ? {}
      : {
          logo: `${DEFAULT_SITE_URL}/clearcaseiq-logo.png`,
          description: ORGANIZATION_DESCRIPTION,
          areaServed: {
            '@type': 'AdministrativeArea',
            name: 'California',
          },
        }),
  }
}
