import { test, expect, Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Diagnostic (not a pass/fail gate): walks the intake wizard review step (CP-377)
 * and the Results "Your Case Snapshot" page + tabs (CP-378) at a narrow mobile
 * viewport and reports the deepest DOM nodes that extend past the viewport's
 * right edge, so the actual overflowing element can be fixed precisely.
 */

const OUT = path.join(process.cwd(), 'e2e', '__screens__')
fs.mkdirSync(OUT, { recursive: true })

async function audit(page: Page, label: string) {
  const vw = page.viewportSize()?.width || 0
  const offenders = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth
    const all = Array.from(document.querySelectorAll('body *')) as HTMLElement[]
    const over = all.filter((el) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return false
      return r.right > docW + 1
    })
    // Keep only the deepest offenders (no descendant also overflows).
    const deepest = over.filter((el) => !over.some((o) => o !== el && el.contains(o)))
    // Outermost offenders: overflow but no ancestor overflows — the actual too-wide containers.
    const outermost = over.filter((el) => !over.some((o) => o !== el && o.contains(el)))
    const scrollOverflow = document.documentElement.scrollWidth - docW
    const describe = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 160),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        overBy: Math.round(r.right - docW),
        overflowX: cs.overflowX,
        ml: cs.marginLeft,
        mr: cs.marginRight,
        minW: cs.minWidth,
      }
    }
    // Ancestor chain of the first outermost offender, from body down to it.
    let chain: any[] = []
    if (outermost[0]) {
      const path: HTMLElement[] = []
      let cur: HTMLElement | null = outermost[0]
      while (cur && cur !== document.body) {
        path.unshift(cur)
        cur = cur.parentElement
      }
      chain = path.map(describe)
    }
    return {
      docW,
      scrollOverflow,
      count: deepest.length,
      outermost: outermost.slice(0, 8).map(describe),
      chain,
      nodes: deepest.slice(0, 12).map(describe),
    }
  })
  // eslint-disable-next-line no-console
  console.log(`\n===== OVERFLOW @ ${label} (vw=${vw}) =====`)
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(offenders, null, 2))
  await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: false })
}

test('mobile overflow audit — intake review (CP-377) + results snapshot (CP-378)', async ({ page }) => {
  test.setTimeout(360000)
  await page.setViewportSize({ width: 360, height: 800 })
  await page.route('https://ipapi.co/**', (route) => route.abort())
  // Speed up rendering under a loaded dev machine by dropping heavy assets.
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf}', (route) => route.abort())

  await page.goto('/assess?fresh=1', { waitUntil: 'domcontentloaded', timeout: 120000 })

  // Step 1 — Injury type
  await page.getByRole('button', { name: /vehicle accident/i }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  // Step 2 — Incident & Location (date + venue + narrative + medical care)
  await page.getByRole('button', { name: /^today$/i }).click()
  await page.getByRole('combobox').first().selectOption('CA')
  await page.getByRole('combobox').nth(1).selectOption('Los Angeles')
  await page.getByPlaceholder('e.g., Glendale').fill('Glendale')
  await page.locator('textarea').first().fill(
    'A fake plaintiff intake for end-to-end testing after a rear-end collision in Glendale, with significant medical treatment and lost wages.'
  )
  // Medical care requires at least one selection.
  await page.getByRole('button', { name: /physical therapy/i }).click().catch(() => {})
  await page.getByRole('button', { name: /er visit/i }).click().catch(() => {})
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  // Adaptively advance the remaining steps until we reach the review/consent step
  // (identified by the Terms & Privacy consent checkbox), auditing nothing until
  // then. Fill any money fields with large values to stress-test currency widths.
  const isReview = async () =>
    (await page.getByLabel(/terms & privacy policy/i).count()) > 0

  for (let step = 0; step < 6; step += 1) {
    if (await isReview()) break
    await page.waitForTimeout(800)
    // Large currency values anywhere on the current step.
    const money = page.locator('input[inputmode="numeric"], input[type="number"]')
    const moneyCount = await money.count()
    for (let i = 0; i < moneyCount; i += 1) {
      await money.nth(i).fill('1250000').catch(() => {})
    }
    if (await isReview()) break
    // Prefer explicit progression; fall back to skipping optional steps.
    const next = page.getByRole('button', { name: 'Next', exact: true })
    const cont = page.getByRole('button', { name: /^continue/i })
    const skip = page.getByRole('button', { name: /skip for now/i })
    if (await next.count()) await next.first().click().catch(() => {})
    else if (await cont.count()) await cont.first().click().catch(() => {})
    else if (await skip.count()) await skip.first().click().catch(() => {})
    await page.waitForTimeout(600)
    // If a required-selection alert blocked us, pick the first option and retry.
    if (!(await isReview())) {
      const optionBtns = page.locator('main button').filter({ hasNotText: /back|next|continue|skip|start over/i })
      const oc = await optionBtns.count()
      if (oc > 0) await optionBtns.first().click().catch(() => {})
    }
  }

  // ===== Review / consent step (CP-377) =====
  await page.waitForTimeout(1500)
  await audit(page, 'cp377-intake-review')

  // Submit → Results (best-effort; skipped cleanly if the API isn't up).
  try {
    const createAssessmentResponse = page.waitForResponse(
      (r) => r.url().includes('/v1/assessments') && r.request().method() === 'POST' && r.ok(),
      { timeout: 45000 }
    )
    await page.getByLabel(/terms & privacy policy/i).check().catch(() => {})
    await page.getByLabel(/ai-assisted case analysis/i).check().catch(() => {})
    await page.getByRole('button', { name: /generate my free report|view my case report/i }).click()
    const created = await createAssessmentResponse
    const assessmentId = String((await created.json()).assessment_id)
    await expect(page).toHaveURL(new RegExp(`/results/${assessmentId}$`), { timeout: 60000 })
    await expect(page.getByRole('heading', { name: /your case snapshot/i })).toBeVisible({ timeout: 60000 })
    await page.waitForTimeout(1500)

    for (const name of ['Case Overview', 'Medical Story', 'Damages & Valuation', 'Next Steps']) {
      const tab = page.locator('nav button', { hasText: name }).first()
      if (await tab.count()) {
        await tab.scrollIntoViewIfNeeded().catch(() => {})
        await tab.click().catch(() => {})
        await page.waitForTimeout(1000)
        await audit(page, `cp378-tab-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`\n[results audit skipped] ${(err as Error).message.split('\n')[0]}`)
  }
})
