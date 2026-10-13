import { attorneyGuides, type AttorneyGuide } from './attorneyGuides'

export const ATTORNEY_GUIDES_SOURCE_PATH = 'app/src/data/attorneyGuides.ts'
export const ATTORNEY_GUIDES_EXPORT_COMMAND = 'pnpm --dir app guides:export'

export function guideMarkdownFilename(guide: AttorneyGuide): string {
  return `${guide.slug}.md`
}

function headingAnchor(heading: string, used: Map<string, number>): string {
  const base = heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
  const count = used.get(base) ?? 0
  used.set(base, count + 1)
  return count === 0 ? base : `${base}-${count}`
}

function generatedNotice(): string {
  return `<!-- Generated from ${ATTORNEY_GUIDES_SOURCE_PATH}. Do not edit by hand; run \`${ATTORNEY_GUIDES_EXPORT_COMMAND}\`. -->`
}

function finalize(lines: string[]): string {
  return `${lines.join('\n').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

export function renderGuideMarkdown(guide: AttorneyGuide): string {
  const lines: string[] = [generatedNotice(), '', `# ${guide.title}`, '', guide.summary, '']

  const meta = [`Last updated: ${guide.updated}`]
  if (guide.readMinutes) meta.push(`About ${guide.readMinutes} min read`)
  lines.push(`_${meta.join(' · ')}_`, '')

  const used = new Map<string, number>()
  const anchors = guide.sections.map((section) => headingAnchor(section.heading, used))

  lines.push('## Contents', '')
  guide.sections.forEach((section, i) => {
    lines.push(`- [${section.heading}](#${anchors[i]})`)
  })
  lines.push('')

  for (const section of guide.sections) {
    lines.push(`## ${section.heading}`, '')
    if (section.body) lines.push(section.body, '')
    if (section.steps?.length) {
      section.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`))
      lines.push('')
    }
    for (const tip of section.tips ?? []) {
      lines.push(`> **Tip:** ${tip}`, '')
    }
    if (section.appLink) {
      lines.push(`Where in the app: **${section.appLink.label}** (\`${section.appLink.to}\`)`, '')
    }
  }

  return finalize(lines)
}

export function renderGuidesIndexMarkdown(guides: AttorneyGuide[]): string {
  const lines: string[] = [
    generatedNotice(),
    '',
    '# Attorney user guides',
    '',
    'Step-by-step guides for attorneys and firm staff using ClearCaseIQ. The same guides are available in the attorney dashboard under Help > Guides and publicly at `/attorney-guides`.',
    '',
    `> These files are generated from \`${ATTORNEY_GUIDES_SOURCE_PATH}\`. Edit the guide content there, then run \`${ATTORNEY_GUIDES_EXPORT_COMMAND}\` to regenerate this folder.`,
    '',
    '## Guides',
    '',
  ]

  guides.forEach((guide, i) => {
    lines.push(`${i + 1}. [${guide.title}](./${guideMarkdownFilename(guide)}): ${guide.summary}`)
  })

  return finalize(lines)
}

/** Map of filename (relative to docs/attorney-guides) to file content. */
export function renderAttorneyGuideDocs(guides: AttorneyGuide[] = attorneyGuides): Record<string, string> {
  const files: Record<string, string> = { 'README.md': renderGuidesIndexMarkdown(guides) }
  for (const guide of guides) {
    files[guideMarkdownFilename(guide)] = renderGuideMarkdown(guide)
  }
  return files
}
