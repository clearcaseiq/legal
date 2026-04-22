import { test, expect } from '@playwright/test'

test.describe('Public marketing pages', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('main').getByRole('link', { name: /start free case assessment/i })).toBeVisible()
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /plaintiff login/i })).toBeVisible()
  })
})
