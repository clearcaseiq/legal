import { describe, expect, it } from 'vitest'
import { withWebsiteProtocol } from './website'

describe('withWebsiteProtocol', () => {
  it('adds https:// to a bare address', () => {
    expect(withWebsiteProtocol('www.hintonlaw.com')).toBe('https://www.hintonlaw.com')
    expect(withWebsiteProtocol('  hintonlaw.com ')).toBe('https://hintonlaw.com')
  })

  it('keeps an explicit http or https', () => {
    expect(withWebsiteProtocol('http://www.hintonlaw.com')).toBe('http://www.hintonlaw.com')
    expect(withWebsiteProtocol('HTTPS://hintonlaw.com')).toBe('HTTPS://hintonlaw.com')
  })

  it('treats an empty field or a lone prefix as no website', () => {
    expect(withWebsiteProtocol('')).toBe('')
    expect(withWebsiteProtocol('https://')).toBe('')
  })
})
