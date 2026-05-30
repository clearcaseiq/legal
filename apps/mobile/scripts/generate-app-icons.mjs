/**
 * Generate 1024x1024 app icons: white background, logo without black box, larger scale.
 * Usage: node scripts/generate-app-icons.mjs
 */
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const logoPath = path.join(root, '../../app/public/clearcaseiq-logo.png')
const outDir = path.join(root, 'assets')

/** Turn near-black background transparent; keep colored logo pixels. */
async function logoWithoutBlackBg() {
  const { data, info } = await sharp(logoPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = Buffer.from(data)
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    // Dark flat background (black) → transparent
    if (max < 55 && max - min < 25) {
      pixels[i + 3] = 0
      continue
    }
    // Very dark gray edge on black box
    if (max < 75 && max - min < 20) {
      pixels[i + 3] = Math.min(pixels[i + 3], 80)
    }
  }
  const trimmed = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 10 })
    .png()
    .toBuffer()
  return sharp(trimmed)
}

async function makeIcon(filename, pad = 40) {
  const size = 1024
  const inner = size - pad * 2
  const logo = await (await logoWithoutBlackBg())
    .resize(inner, inner, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, filename))
}

await makeIcon('icon.png')
await makeIcon('adaptive-icon.png')
await makeIcon('splash-icon.png', 64)
console.log('Wrote icon.png, adaptive-icon.png, splash-icon.png (white bg, larger logo, no black box)')
