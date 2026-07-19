// Generates PWA icons from the ClearCaseIQ brand mark.
// Run: node scripts/gen-pwa-icons.mjs
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '..', 'public')

const GRAD = `
  <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
    <stop stop-color="#456997"/>
    <stop offset=".45" stop-color="#34547a"/>
    <stop offset="1" stop-color="#1e3045"/>
  </linearGradient>`

// Document + amber check glyph in the original 32-unit coordinate space.
const GLYPH = `
  <path fill="#fff" fill-opacity=".97" d="M10.25 6.25h7.2L22 10.8v15.2c0 1.1-.9 2-2 2h-9.75c-1.1 0-2-.9-2-2V8.25c0-1.1.9-2 2-2z"/>
  <path fill="#fff" fill-opacity=".72" d="M17.45 6.25v5.05h4.4l-4.4-5.05z"/>
  <path stroke="#f59e0b" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.2 17.2l2.35 2.35 4.9-6.15"/>
  <circle cx="23.5" cy="9" r="1.35" fill="#fbbf24" fill-opacity=".95"/>`

// "any"-purpose icon: rounded-square navy tile + glyph (favicon style), full bleed.
const svgAny = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <defs>${GRAD}</defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <g transform="scale(16)">${GLYPH}</g>
</svg>`

// "maskable"-purpose icon: full-bleed navy background + centered glyph within the safe zone.
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <defs>${GRAD}</defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(41,34) scale(13)">${GLYPH}</g>
</svg>`

// apple-touch-icon: opaque, slightly larger glyph (iOS applies its own rounding).
const svgApple = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <defs>${GRAD}</defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(28,20) scale(14)">${GLYPH}</g>
</svg>`

async function render(svg, size, outfile) {
  const buf = Buffer.from(svg)
  await sharp(buf, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, outfile))
  console.log('wrote', outfile, `${size}x${size}`)
}

async function main() {
  await fs.mkdir(publicDir, { recursive: true })
  // Keep an SVG maskable source for modern browsers.
  await fs.writeFile(path.join(publicDir, 'icon-maskable.svg'), svgMaskable)
  await render(svgAny, 192, 'icon-192.png')
  await render(svgAny, 512, 'icon-512.png')
  await render(svgMaskable, 512, 'icon-maskable-512.png')
  await render(svgApple, 180, 'apple-touch-icon.png')
  await render(svgApple, 512, 'icon-apple-512.png')
  console.log('PWA icons generated.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
