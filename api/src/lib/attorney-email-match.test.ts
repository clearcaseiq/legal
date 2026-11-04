import { describe, expect, it } from 'vitest'
import { cleanScrapedEmail, emailMatchesAttorneyName, isSharedInboxEmail } from './attorney-email-match'

describe('emailMatchesAttorneyName', () => {
  it.each([
    ['Lateef H. Gray', 'lgray@firm.com'],
    ['Angela Leong', 'angela.leong@firm.com'],
    ['Stephen A. Crane', 'steve@firm.com'],
    ['John W. Stenson', 'jws@firm.com'],
    ['Jason A. Lieber', 'jlieber@firm.com'],
    ['Guillaume D\'Amico', 'gdamico@firm.com'],
    ['José Núñez', 'jose@firm.com'],
  ])('accepts %s <%s>', (name, email) => {
    expect(emailMatchesAttorneyName(name, email)).toBe(true)
  })

  it.each([
    ['Shawn J. Wachter', 'fabian@firm.com'],
    ['Alexandra R. Work', 'mike@firm.com'],
    ['Jason A. Helsel', 'flags-sprite@firm.com'],
    ['Elton T. Rosicki', 'jcloyd@altairlaw.com'],
  ])('rejects %s <%s>', (name, email) => {
    expect(emailMatchesAttorneyName(name, email)).toBe(false)
  })
})

describe('isSharedInboxEmail', () => {
  it('recognises department and front-desk addresses', () => {
    expect(isSharedInboxEmail('PublicRelations@firm.com')).toBe(true)
    expect(isSharedInboxEmail('contact-us@firm.com')).toBe(true)
    expect(isSharedInboxEmail('%20hello@firm.com')).toBe(true)
    expect(isSharedInboxEmail('angela@firm.com')).toBe(false)
  })
})

describe('cleanScrapedEmail', () => {
  it('decodes mailto encoding and rejects junk', () => {
    expect(cleanScrapedEmail('%20Jane@Firm.com ')).toBe('jane@firm.com')
    expect(cleanScrapedEmail('not an email')).toBeNull()
  })
})
