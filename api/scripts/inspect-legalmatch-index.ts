import { chromium } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  })

  try {
    await page.goto('https://www.legalmatch.com/law-library/attorney-profile/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined)

    const pageNumbers = await page.locator('.js-pagination-page').evaluateAll((elements) =>
      Array.from(
        new Set(
          elements
            .map((element) => Number.parseInt((element.textContent || '').trim(), 10))
            .filter((value) => Number.isFinite(value) && value > 0)
        )
      ).sort((a, b) => a - b)
    )

    const controls = await page.locator('a, button, [role="button"]').evaluateAll((elements) =>
      elements
        .map((element) => ({
          tag: element.tagName,
          text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
          href: element instanceof HTMLAnchorElement ? element.href : null,
          aria: element.getAttribute('aria-label'),
          className: element.getAttribute('class'),
        }))
        .filter(
          (item) =>
            /(^[1-9]$|next|prev|apply|clear|sort|page)/i.test(item.text) ||
            /page/i.test(item.aria || '') ||
            /\bpaginate|\bpager|\bpage/i.test(item.className || '')
        )
    )

    const attorneyLinks = await page
      .locator('a[href*="/law-library/attorney-profile/"]')
      .evaluateAll((elements) =>
        elements.map((element) => ({
          text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
          href: element instanceof HTMLAnchorElement ? element.href : null,
        }))
      )

    const pageSnapshots: Array<{ pageNumber: number; urls: string[] }> = []

    for (const pageNumber of pageNumbers) {
      if (pageNumber > 1) {
        await page.locator('.js-dropdown-select-button').first().click().catch(() => undefined)
        await page.evaluate((targetPage: number) => {
          const option = Array.from(document.querySelectorAll<HTMLElement>('.js-pagination-page')).find(
            (element) => element.textContent?.replace(/\s+/g, ' ').trim() === String(targetPage)
          )
          option?.click()
        }, pageNumber)
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => undefined)
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined)
        await page.waitForTimeout(1000)
      }

      let urls: string[] = []
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          urls = await page.locator('a[href*="/law-library/attorney-profile/"]').evaluateAll((elements) =>
            Array.from(
              new Set(
                elements
                  .map((element) => (element instanceof HTMLAnchorElement ? element.href : null))
                  .filter((href): href is string => Boolean(href))
              )
            )
          )
          break
        } catch (error) {
          if (attempt === 1) throw error
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => undefined)
          await page.waitForTimeout(1000)
        }
      }

      pageSnapshots.push({ pageNumber, urls })
    }

    console.log(
      JSON.stringify(
        {
          url: page.url(),
          pageNumbers,
          controls,
          attorneyLinks,
          pageSnapshots,
        },
        null,
        2
      )
    )
  } finally {
    await page.close().catch(() => undefined)
    await browser.close().catch(() => undefined)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
