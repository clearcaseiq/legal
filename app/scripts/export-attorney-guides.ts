/**
 * Writes the attorney user guides in app/src/data/attorneyGuides.ts to
 * docs/attorney-guides/ as Markdown (README.md index + one file per guide).
 *
 * Usage:
 *   pnpm --dir app guides:export
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderAttorneyGuideDocs } from '../src/data/attorneyGuidesMarkdown'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = join(repoRoot, 'docs', 'attorney-guides')

const files = renderAttorneyGuideDocs()
mkdirSync(outDir, { recursive: true })

for (const name of readdirSync(outDir)) {
  if (name.endsWith('.md') && !(name in files)) {
    rmSync(join(outDir, name))
    console.log(`removed ${relative(repoRoot, join(outDir, name)).replace(/\\/g, '/')}`)
  }
}

for (const [name, content] of Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
  writeFileSync(join(outDir, name), content, 'utf8')
  console.log(`wrote ${relative(repoRoot, join(outDir, name)).replace(/\\/g, '/')}`)
}
