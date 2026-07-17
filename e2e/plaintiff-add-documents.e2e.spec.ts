import { test, expect } from '@playwright/test'

/**
 * Covers the Case Snapshot "Add documents" deep link into the intake wizard's
 * focused Supporting Documents (Step 6 evidence) screen.
 *
 * The screen is driven entirely by the URL
 * (/intake2?assessment=<id>&step=evidence) and does not fetch the assessment,
 * so we can exercise it deterministically without walking the full wizard.
 */
const ASSESSMENT_ID = 'e2e-add-docs-123'
const DOCS_URL = `/intake2?assessment=${ASSESSMENT_ID}&step=evidence`

test.describe('Case Snapshot -> Add documents (Supporting Documents deep link)', () => {
  test('opens the focused Supporting Documents screen for the case', async ({ page }) => {
    test.setTimeout(60000)

    await page.goto(DOCS_URL)

    // Focused header: eyebrow + "Supporting Documents" title.
    await expect(page.getByRole('heading', { name: /supporting documents/i })).toBeVisible({ timeout: 30000 })

    // The reused Step 6 evidence UI should render its document categories.
    await expect(page.getByText(/medical records/i).first()).toBeVisible()

    // Focused mode shows Back / Done controls instead of the full wizard stepper.
    await expect(page.getByRole('button', { name: /back to your case/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /done/i })).toBeVisible()
  })

  test('does not render the full wizard stepper in documents mode', async ({ page }) => {
    await page.goto(DOCS_URL)
    await expect(page.getByRole('heading', { name: /supporting documents/i })).toBeVisible({ timeout: 30000 })

    // The normal wizard advance control must not be present here.
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0)
  })

  test('Back to your case returns to the report for this assessment', async ({ page }) => {
    await page.goto(DOCS_URL)
    await expect(page.getByRole('button', { name: /back to your case/i })).toBeVisible({ timeout: 30000 })

    await page.getByRole('button', { name: /back to your case/i }).click()
    await expect(page).toHaveURL(new RegExp(`/results/${ASSESSMENT_ID}`), { timeout: 30000 })
  })

  test('Done returns to the report for this assessment', async ({ page }) => {
    await page.goto(DOCS_URL)
    await expect(page.getByRole('button', { name: /done/i })).toBeVisible({ timeout: 30000 })

    await page.getByRole('button', { name: /done/i }).click()
    await expect(page).toHaveURL(new RegExp(`/results/${ASSESSMENT_ID}`), { timeout: 30000 })
  })
})
