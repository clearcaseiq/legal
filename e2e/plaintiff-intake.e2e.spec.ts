import { test, expect } from '@playwright/test'

test.describe('Plaintiff intake flow', () => {
  test('creates a fake plaintiff intake and opens the report page', async ({ page }) => {
    test.setTimeout(90000)

    // Block IP geolocation so the "use this location" banner never appears and
    // the manual state/county selects render deterministically.
    await page.route('https://ipapi.co/**', (route) => route.abort())

    await page.goto('/assess?fresh=1')

    // Step 1 — Injury type
    await page.getByRole('button', { name: /vehicle accident/i }).click()
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    // Step 2 — Incident facts (date, venue, and narrative share one screen)
    await page.getByRole('button', { name: /^today$/i }).click()
    await page.getByRole('combobox').first().selectOption('CA')
    await page.getByRole('combobox').nth(1).selectOption('Los Angeles')
    await page.getByPlaceholder('e.g., Glendale').fill('Glendale')
    await page.locator('textarea').first().fill(
      'A fake plaintiff intake for end-to-end testing after a rear-end collision in Glendale.'
    )
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    // Step 3 — Injury details (severity is the only required field)
    await page.getByRole('button', { name: /minor/i }).first().click()
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    // Step 4 — Case details (optional)
    await page.getByRole('button', { name: /skip for now/i }).click()

    // Step 5 — Evidence upload (optional)
    await page.getByRole('button', { name: /skip for now/i }).click()

    // Step 6 — Damages & valuation
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    // Step 7 — Insurance & legal status
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    // Step 8 — Consent + submit
    const createAssessmentResponse = page.waitForResponse((response) =>
      response.url().includes('/v1/assessments') &&
      response.request().method() === 'POST' &&
      response.ok()
    )

    await page.getByLabel(/terms & privacy policy/i).check()
    await page.getByLabel(/ai-assisted case analysis/i).check()
    await page.getByRole('button', { name: /view my case report/i }).click()

    const createAssessment = await createAssessmentResponse
    const createAssessmentJson = await createAssessment.json()
    const assessmentId = String(createAssessmentJson.assessment_id)

    await expect(page).toHaveURL(new RegExp(`/results/${assessmentId}$`), { timeout: 60000 })
    await expect(page.getByRole('heading', { name: /your case snapshot/i })).toBeVisible({ timeout: 60000 })
    await expect(page.getByRole('button', { name: /continue to attorney review/i }).first()).toBeVisible()
  })
})
