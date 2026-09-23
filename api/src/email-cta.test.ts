import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * The button is the only way to act on most plaintiff mail now: the bodies no
 * longer spell the destination out, so a CTA that fails to render leaves an
 * email with nothing to click. These cover the parts that silently degrade —
 * Outlook's dropped padding, the text-only alternative, and a rejected URL.
 */

const send = vi.fn(async () => ({ ok: true }))

vi.mock('./lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

describe('transactional email call-to-action', () => {
  let sendClaimEmail: typeof import('./lib/claims')['sendClaimEmail']
  let logger: { error: ReturnType<typeof vi.fn> }
  let captured: { text?: string; html?: string }

  beforeEach(async () => {
    vi.resetModules()
    captured = {}
    process.env.EMAIL_PROVIDER = 'resend'
    process.env.RESEND_API_KEY = 'test-key'
    process.env.RESEND_FROM_EMAIL = 'noreply@clearcaseiq.test'

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: string }) => {
        const payload = JSON.parse(init.body)
        captured.text = payload.text
        captured.html = payload.html
        return { ok: true, text: async () => '' }
      }),
    )

    sendClaimEmail = (await import('./lib/claims')).sendClaimEmail
    logger = (await import('./lib/logger')).logger as any
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    send.mockClear()
  })

  it('renders the action as a table-based button, not a styled link', async () => {
    await sendClaimEmail({
      to: 'claimant@example.com',
      subject: 'Your attorney requested additional documents',
      body: 'Hi Dana,\n\nPlease send the police report.',
      cta: { label: 'Upload your documents', url: 'https://app.clearcaseiq.test/evidence-upload/abc?token=xyz' },
    })

    const html = captured.html || ''
    // Outlook renders through Word, which drops padding and background from an
    // inline <a>. Both must sit on the <td> or the button collapses to text.
    expect(html).toMatch(/<td[^>]*bgcolor="#2563eb"[^>]*padding:13px 26px/)
    expect(html).toContain('Upload your documents')
    // The destination is repeated for clients that strip the table.
    expect(html).toContain('Or paste this into your browser:')
  })

  it('carries the action into the plain-text alternative', async () => {
    await sendClaimEmail({
      to: 'claimant@example.com',
      subject: 'Your ClearCaseIQ case report is ready',
      body: 'Good news. Your case assessment is complete.',
      cta: { label: 'View your case report', url: 'https://app.clearcaseiq.test/results/asm-1' },
    })

    expect(captured.text).toContain('View your case report: https://app.clearcaseiq.test/results/asm-1')
  })

  it('refuses a non-http scheme and says so, rather than sending a dead email', async () => {
    await sendClaimEmail({
      to: 'claimant@example.com',
      subject: 'Test',
      body: 'Body copy.',
      cta: { label: 'Click me', url: 'javascript:alert(1)' },
    })

    expect(captured.html).not.toContain('javascript:alert(1)')
    expect(captured.html).not.toContain('Click me')
    expect(logger.error).toHaveBeenCalledWith(
      'Email CTA dropped: not an http(s) URL',
      expect.objectContaining({ label: 'Click me' }),
    )
  })

  /**
   * The case-received mail offers two next steps. The second used to be a bare
   * JWT claim URL printed in the body, which wrapped across four lines of blue
   * text mid-paragraph and read as a broken email rather than an invitation.
   */
  describe('two actions', () => {
    const TWO = [
      { label: 'View your case report', url: 'https://app.clearcaseiq.test/results/asm-1' },
      { label: 'Create your free account', url: 'https://app.clearcaseiq.test/register?claim=eyJhbGciOi.J9.x' },
    ]

    it('renders both as buttons', async () => {
      await sendClaimEmail({ to: 'c@example.com', subject: 'We received your case', body: 'Hi Dana,', cta: TWO })

      const html = captured.html || ''
      expect(html).toContain('View your case report')
      expect(html).toContain('Create your free account')
      expect((html.match(/<table role="presentation"[^>]*style="margin:4px 0 8px;"/g) || []).length).toBe(2)
    })

    it('styles the first as primary and the second as an outlined secondary', async () => {
      await sendClaimEmail({ to: 'c@example.com', subject: 'We received your case', body: 'Hi Dana,', cta: TWO })

      const html = captured.html || ''
      expect(html).toMatch(/<td[^>]*bgcolor="#2563eb"[^>]*>\s*<a[^>]*>View your case report/)
      expect(html).toMatch(/<td[^>]*bgcolor="#ffffff"[^>]*border:1px solid #2563eb[^>]*>\s*<a[^>]*>Create your free account/)
    })

    /** Two unlabelled URLs would leave the reader unable to tell which opens what. */
    it('labels each destination in the paste-it fallback', async () => {
      await sendClaimEmail({ to: 'c@example.com', subject: 'We received your case', body: 'Hi Dana,', cta: TWO })

      const html = captured.html || ''
      expect(html).toContain('Or paste these into your browser:')
      expect(html).toContain('Create your free account:')
    })

    it('carries both into the plain-text alternative', async () => {
      await sendClaimEmail({ to: 'c@example.com', subject: 'We received your case', body: 'Hi Dana,', cta: TWO })

      expect(captured.text).toContain('View your case report: https://app.clearcaseiq.test/results/asm-1')
      expect(captured.text).toContain(
        'Create your free account: https://app.clearcaseiq.test/register?claim=eyJhbGciOi.J9.x',
      )
    })

    it('drops only the unusable one and still sends the rest', async () => {
      await sendClaimEmail({
        to: 'c@example.com',
        subject: 'We received your case',
        body: 'Hi Dana,',
        cta: [TWO[0], { label: 'Bad', url: 'javascript:alert(1)' }],
      })

      expect(captured.html).toContain('View your case report')
      expect(captured.html).not.toContain('javascript:alert(1)')
      expect(captured.html).toContain('Or paste this into your browser:')
      expect(logger.error).toHaveBeenCalledWith(
        'Email CTA dropped: not an http(s) URL',
        expect.objectContaining({ label: 'Bad' }),
      )
    })

    it('treats a single action in an array exactly like a bare one', async () => {
      await sendClaimEmail({ to: 'c@example.com', subject: 'Report ready', body: 'Body.', cta: [TWO[0]] })

      expect(captured.html).toContain('Or paste this into your browser:')
      expect(captured.html).not.toContain('Or paste these into your browser:')
    })
  })

  it('leaves an email without a CTA exactly as before', async () => {
    await sendClaimEmail({
      to: 'claimant@example.com',
      subject: 'Verify your ClearCaseIQ email',
      body: 'Confirm at https://app.clearcaseiq.test/verify/tok',
    })

    expect(captured.text).toBe('Confirm at https://app.clearcaseiq.test/verify/tok')
    expect(captured.html).not.toContain('Or paste this into your browser:')
    // Bare URLs in a body are still auto-linked.
    expect(captured.html).toContain('<a href="https://app.clearcaseiq.test/verify/tok"')
  })
})
