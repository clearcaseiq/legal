import { test, expect } from '@playwright/test'

/**
 * Terms / HIPAA pages load consent templates from the API (proxied via Vite in dev).
 * When API is unavailable, we stub the template endpoint so the UI still renders.
 */
test.describe('Plaintiff legal document pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/v1/consent/templates/**', async (route) => {
      const url = route.request().url()
      const type = url.includes('/hipaa') ? 'hipaa' : url.includes('/privacy') ? 'privacy' : 'terms'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            version: '1.0',
            documentId: `${type}-v1.0`,
            title: type === 'hipaa' ? 'HIPAA authorization' : type === 'privacy' ? 'Privacy Policy' : 'Terms of Service',
            effectiveDate: '2026-03-01',
            plainLanguageSummary: 'Summary for E2E.',
            content: `# ${type}\n\nBody content for automated test.`,
          },
        }),
      })
    })
  })

  test('terms of service page shows title and body', async ({ page }) => {
    await page.goto('/terms-of-service')
    await expect(page.getByRole('main')).toContainText(/terms of service/i, { timeout: 15000 })
    await expect(page.getByRole('main')).toContainText(/body content for automated test/i, { timeout: 15000 })
  })

  test('HIPAA authorization page shows title', async ({ page }) => {
    await page.goto('/hipaa-authorization')
    await expect(page.getByRole('heading', { name: /hipaa/i })).toBeVisible()
  })
})
