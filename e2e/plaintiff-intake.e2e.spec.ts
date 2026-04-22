import { test, expect } from '@playwright/test'

test.describe('Plaintiff intake flow', () => {
  test('creates a fake plaintiff intake and opens the report page', async ({ page }) => {
    test.setTimeout(90000)

    await page.goto('/assess?fresh=1')

    await page.getByRole('button', { name: /vehicle accident/i }).click()
    await page.getByRole('button', { name: /^today$/i }).click()

    await page.getByRole('button', { name: /^change$/i }).click({ timeout: 15000 }).catch(() => {})

    await page.getByRole('combobox').first().selectOption('CA')
    await page.getByRole('combobox').nth(1).selectOption('Los Angeles')
    await page.getByPlaceholder('e.g., Glendale').fill('Glendale')
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    await page.getByPlaceholder(/describe the incident in your own words/i).fill(
      'A fake plaintiff intake for end-to-end testing after a rear-end collision in Glendale.'
    )
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    await page.getByRole('button', { name: /minor injury/i }).click()
    await page.getByRole('button', { name: /ER or hospital/i }).click()
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    await page.getByRole('button', { name: /rear-end collision/i }).click()
    await page.getByLabel(/was a police report made\?/i).check()
    await page.getByLabel(/were there witnesses\?/i).check()
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    await page.getByRole('button', { name: /minor cosmetic damage/i }).click()
    await page.getByRole('button', { name: /private driver/i }).click()
    await page.getByRole('button', { name: /skip for now/i }).click()

    await page.getByRole('button', { name: /^no$/i }).click()
    await page.getByLabel(/would you like to speak with a lawyer/i).check()
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    const createAssessmentResponse = page.waitForResponse((response) =>
      response.url().includes('/v1/assessments') &&
      response.request().method() === 'POST' &&
      response.ok()
    )

    await page.getByLabel(/terms of service and privacy policy/i).check()
    await page.getByLabel(/AI processing of my information for case analysis/i).check()
    await page.getByRole('button', { name: /view my case report/i }).click()

    const createAssessment = await createAssessmentResponse
    const createAssessmentJson = await createAssessment.json()
    const assessmentId = String(createAssessmentJson.assessment_id)

    await expect(page).toHaveURL(new RegExp(`/results/${assessmentId}$`), { timeout: 60000 })
    await expect(page.getByRole('heading', { name: /case intelligence report/i })).toBeVisible({ timeout: 60000 })
    await expect(page.getByText(/report summary/i)).toBeVisible()
  })
})
