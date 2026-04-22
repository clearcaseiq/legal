import { describe, expect, it } from 'vitest'
import { extractAttorneyProfileUrlsFromSearchResultsHtml, isCloudflareChallenge } from './fetcher'
import { parseLegalMatchProfile } from './parser'

const SAMPLE_PROFILE_HTML = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>William Roth | LegalMatch Attorney Profile</title>
    <meta name="description" content="William Roth is a criminal defense and family law attorney in Utica, NY." />
    <meta property="og:image" content="https://cdn.example.com/william-roth.jpg" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "William Roth",
        "telephone": "(315) 555-0101",
        "image": "https://cdn.example.com/william-roth.jpg",
        "description": "For 13 years, William Roth has helped clients with criminal defense, family law, and divorce matters.",
        "worksFor": {
          "@type": "Organization",
          "name": "William M. Roth Esq"
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "123 Main Street",
          "addressLocality": "Utica",
          "addressRegion": "NY",
          "postalCode": "13501"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "12"
        },
        "knowsAbout": ["Criminal Defense", "Family", "Divorce"],
        "knowsLanguage": ["English", "Spanish"]
      }
    </script>
  </head>
  <body>
    <h1>William Roth</h1>
    <section>
      <h2>Practice Areas</h2>
      <ul>
        <li>Criminal Defense</li>
        <li>Family</li>
        <li>Divorce</li>
      </ul>
    </section>
    <p>William M. Roth Esq, an esteemed law firm in Central New York, seeks to defend local families and criminal defendants.</p>
    <a href="https://www.williamrothlaw.com">View Website</a>
  </body>
</html>
`

describe('parseLegalMatchProfile', () => {
  it('extracts attorney details from structured data and HTML fallbacks', () => {
    const profile = parseLegalMatchProfile(
      SAMPLE_PROFILE_HTML,
      'https://legalmatch.com/law-library/attorney-profile/william-roth.html'
    )

    expect(profile.fullName).toBe('William Roth')
    expect(profile.firmName).toBe('William M. Roth Esq')
    expect(profile.city).toBe('Utica')
    expect(profile.state).toBe('NY')
    expect(profile.zip).toBe('13501')
    expect(profile.phone).toBe('(315) 555-0101')
    expect(profile.website).toBe('https://www.williamrothlaw.com')
    expect(profile.photoUrl).toBe('https://cdn.example.com/william-roth.jpg')
    expect(profile.totalReviews).toBe(12)
    expect(profile.averageRating).toBe(4.9)
    expect(profile.yearsExperience).toBe(13)
    expect(profile.specialties).toEqual(['Criminal Defense', 'Family', 'Divorce'])
    expect(profile.languages).toEqual(['English', 'Spanish'])
    expect(profile.parseWarnings).toEqual([])
  })

  it('ignores LegalMatch-owned contact fields that are shared across profiles', () => {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>James A. Palmer | LegalMatch Attorney Profile</title>
  </head>
  <body>
    <h1>James A. Palmer</h1>
    <p>2 reviews Eugene, OR</p>
    <section>
      <h2>Practice Areas</h2>
      <ul>
        <li>Family</li>
        <li>Divorce</li>
      </ul>
    </section>
    <p>Call Now! (866) 953-4259</p>
    <a href="https://www.legalmatchcareers.com/">View Website</a>
    <a href="https://calendly.com/membership-recruiting/legalmatch-hlweb-active-case-review-45-min">Schedule a demo</a>
  </body>
</html>
`

    const profile = parseLegalMatchProfile(
      html,
      'https://legalmatch.com/law-library/attorney-profile/james-a-palmer.html'
    )

    expect(profile.fullName).toBe('James A. Palmer')
    expect(profile.phone).toBeUndefined()
    expect(profile.website).toBeUndefined()
    expect(profile.city).toBe('Eugene')
    expect(profile.state).toBe('OR')
  })

  it('normalizes location fallbacks without mistaking firm suffixes for states', () => {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>John Olczak | LegalMatch Attorney Profile</title>
  </head>
  <body>
    <h1>John Olczak</h1>
    <p>8 reviews Atlanta GA</p>
    <p>The Law Office of John S. Olczak, PC is devoted to serving families in Georgia.</p>
    <section>
      <h2>Practice Areas</h2>
      <ul>
        <li>Wills, Trusts and Estates</li>
      </ul>
    </section>
  </body>
</html>
`

    const profile = parseLegalMatchProfile(
      html,
      'https://legalmatch.com/law-library/attorney-profile/john-olczak.html'
    )

    expect(profile.city).toBe('Atlanta')
    expect(profile.state).toBe('GA')
  })

  it('extracts contact fields from mailto, tel, and bare website links', () => {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Jane Example | LegalMatch Attorney Profile</title>
  </head>
  <body>
    <h1>Jane Example</h1>
    <p>3 reviews Austin, Texas 78701</p>
    <section>
      <h2>Practice Areas</h2>
      <ul>
        <li>Business</li>
      </ul>
    </section>
    <a href="mailto:jane@examplelaw.com">Email Jane</a>
    <a href="tel:+1 (512) 555-0199">Call Jane</a>
    <a href="www.examplelaw.com">View Website</a>
  </body>
</html>
`

    const profile = parseLegalMatchProfile(
      html,
      'https://legalmatch.com/law-library/attorney-profile/jane-example.html'
    )

    expect(profile.email).toBe('jane@examplelaw.com')
    expect(profile.phone).toBe('+1 (512) 555-0199')
    expect(profile.website).toBe('https://www.examplelaw.com')
    expect(profile.state).toBe('TX')
  })

  it('ignores LegalMatch-owned CTA phones even when they include a country code', () => {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Michael Cohen | LegalMatch Attorney Profile</title>
  </head>
  <body>
    <h1>Michael Cohen</h1>
    <p>6 reviews Atlanta, Georgia</p>
    <section>
      <h2>Practice Areas</h2>
      <ul>
        <li>Real Estate</li>
        <li>Landlord and Tenant</li>
      </ul>
    </section>
    <a href="tel:+1 (866) 953-4259">Call Now</a>
    <a href="https://www.nsidelaw.com/contact-us/">View Website</a>
  </body>
</html>
`

    const profile = parseLegalMatchProfile(
      html,
      'https://legalmatch.com/law-library/attorney-profile/michael-cohen.html'
    )

    expect(profile.fullName).toBe('Michael Cohen')
    expect(profile.phone).toBeUndefined()
    expect(profile.website).toBe('https://www.nsidelaw.com/contact-us/')
    expect(profile.city).toBe('Atlanta')
    expect(profile.state).toBe('GA')
  })

  it('falls back to a state-only location when biography text contains misleading capitalized phrases', () => {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Andrei Blakely | LegalMatch Attorney Profile</title>
  </head>
  <body>
    <h1>Andrei Blakely</h1>
    <p>1 reviews Maryland</p>
    <p>He first pursued a degree in English and Black Studies at Oberlin College, Ohio.</p>
    <section>
      <h2>Practice Areas</h2>
      <ul>
        <li>Criminal Defense</li>
      </ul>
    </section>
  </body>
</html>
`

    const profile = parseLegalMatchProfile(
      html,
      'https://legalmatch.com/law-library/attorney-profile/andrei-blakely.html'
    )

    expect(profile.city).toBeUndefined()
    expect(profile.state).toBe('MD')
  })

  it('extracts a state-only review location when no city is published', () => {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Steven Wolvek | LegalMatch Attorney Profile</title>
  </head>
  <body>
    <h1>Steven Wolvek</h1>
    <p>4 reviews CA</p>
    <section>
      <h2>Practice Areas</h2>
      <ul>
        <li>Bankruptcy & Finance</li>
      </ul>
    </section>
  </body>
</html>
`

    const profile = parseLegalMatchProfile(
      html,
      'https://legalmatch.com/law-library/attorney-profile/steven-wolvek.html'
    )

    expect(profile.city).toBeUndefined()
    expect(profile.state).toBe('CA')
  })

  it('ignores privacy and compliance links when choosing an external website', () => {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>David Robinson | LegalMatch Attorney Profile</title>
  </head>
  <body>
    <h1>David Robinson</h1>
    <p>0 reviews Durham, North Carolina</p>
    <section>
      <h2>Practice Areas</h2>
      <ul>
        <li>Criminal Defense</li>
      </ul>
    </section>
    <a href="https://privacy.truste.com/privacy-seal/validation?rid=123">Privacy Seal</a>
    <a href="https://www.robinsonlawoffice.com/">View Website</a>
  </body>
</html>
`

    const profile = parseLegalMatchProfile(
      html,
      'https://legalmatch.com/law-library/attorney-profile/david-robinson.html'
    )

    expect(profile.website).toBe('https://www.robinsonlawoffice.com/')
  })
})

describe('isCloudflareChallenge', () => {
  it('recognizes Cloudflare challenge pages', () => {
    const challengeHtml = '<html><title>Just a moment...</title><script>window._cf_chl_opt = {}</script></html>'
    expect(isCloudflareChallenge(challengeHtml, 403)).toBe(true)
  })
})

describe('extractAttorneyProfileUrlsFromSearchResultsHtml', () => {
  it('extracts attorney profile URLs from indexed search result markup', () => {
    const html = `
<html>
  <body>
    <a href="https://legalmatch.com/law-library/attorney-profile/william-roth.html">William Roth</a>
    <a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Flegalmatch.com%2Flaw-library%2Fattorney-profile%2Fjohn-olczak.html">John Olczak</a>
    <a href="https://legalmatch.com/law-library/attorney-profile/">Directory</a>
    <a href="https://example.com/not-legalmatch">Other result</a>
  </body>
</html>
`

    expect(extractAttorneyProfileUrlsFromSearchResultsHtml(html)).toEqual([
      'https://www.legalmatch.com/law-library/attorney-profile/william-roth.html',
      'https://www.legalmatch.com/law-library/attorney-profile/john-olczak.html',
    ])
  })
})
