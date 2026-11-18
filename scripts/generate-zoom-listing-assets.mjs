import { chromium } from '@playwright/test'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'docs', 'zoom-marketplace', 'listing')
const iconOutput = path.join(outputDir, 'clearcaseiq-app-icon-400.png')
const coverOutput = path.join(outputDir, 'clearcaseiq-cover-1200x780.png')

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 })
const mark = await readFile(path.join(root, 'app', 'public', 'clearcaseiq-mark.svg'), 'utf8')
const markUrl = `data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}`
await page.setContent(`<!doctype html>
  <style>
    * { box-sizing: border-box }
    html, body { margin: 0; width: 400px; height: 400px; overflow: hidden }
    body { display: grid; place-items: center; background: #fff; border-radius: 48px }
    img { width: 344px; height: 344px; object-fit: contain }
  </style>
  <img src="${markUrl}" alt="ClearCaseIQ">`)
await page.screenshot({ path: iconOutput, type: 'png' })
await browser.close()

// The first gallery panel is already an exact 1200×780 product cover and uses
// the same visual system as the remaining Marketplace screenshots.
await copyFile(
  path.join(root, 'docs', 'zoom-marketplace', 'gallery', '01-connect-zoom.png'),
  coverOutput,
)

console.log(`Generated ${iconOutput}`)
console.log(`Generated ${coverOutput}`)
