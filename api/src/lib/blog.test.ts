import { describe, expect, it } from 'vitest'
import { blogAuthorName, slugifyBlogTitle } from './blog'

describe('slugifyBlogTitle', () => {
  it('turns a title into a hyphenated slug', () => {
    expect(slugifyBlogTitle("What's a demand letter?")).toBe('whats-a-demand-letter')
  })

  it('uses post when the title has no letters', () => {
    expect(slugifyBlogTitle('!!!')).toBe('post')
  })
})

describe('blogAuthorName', () => {
  it('falls back to the product name', () => {
    expect(blogAuthorName(null)).toBe('ClearCaseIQ')
  })
})
