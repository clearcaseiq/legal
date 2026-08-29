import { describe, expect, it } from 'vitest'
import { renderBlogMarkdown } from './blogMarkdown'

describe('renderBlogMarkdown', () => {
  it('escapes HTML and formats a heading and link', () => {
    const html = renderBlogMarkdown('# Hello\n\nSee [SOL](/tools/california-sol-checker).\n\n<script>x</script>')
    expect(html).toContain('<h1>Hello</h1>')
    expect(html).toContain('href="/tools/california-sol-checker"')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })
})
