/** The Demand Quality Audit as a PDF an attorney can file with the case. */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { auditView } from './service'

type View = Awaited<ReturnType<typeof auditView>>

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 54

/** Standard PDF fonts only cover Latin-1; map typographic punctuation and drop the rest. */
function latin(text: unknown): string {
  return String(text ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00d7/g, 'x')
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, '')
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = []
  for (const para of latin(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= width) line = next
      else {
        if (line) out.push(line)
        line = word
      }
    }
    out.push(line)
  }
  return out
}

export async function buildAuditReportPdf(view: View, meta: { caseLabel: string; letterTitle: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  const write = (text: string, opts: { size?: number; font?: PDFFont; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    const size = opts.size ?? 9.5
    const font = opts.font ?? regular
    const indent = opts.indent ?? 0
    for (const line of wrap(text, font, size, PAGE_W - MARGIN * 2 - indent)) {
      if (y < MARGIN + size) {
        page = doc.addPage([PAGE_W, PAGE_H])
        y = PAGE_H - MARGIN
      }
      page.drawText(line, { x: MARGIN + indent, y, size, font, color: rgb(...(opts.color ?? [0.1, 0.1, 0.12])) })
      y -= size + 3
    }
    y -= opts.gap ?? 0
  }

  const { audit, findings, release } = view
  const s = audit.summary
  write('ClearCaseIQ Demand Quality Audit', { size: 16, font: bold, gap: 4 })
  write(`${meta.caseLabel} - ${meta.letterTitle}`, { size: 11, gap: 8 })
  write(`Release: ${release.ok ? 'ELIGIBLE' : 'BLOCKED'}`, { font: bold, size: 11, color: release.ok ? [0.05, 0.45, 0.2] : [0.7, 0.1, 0.1] })
  for (const r of release.reasons) write(`- ${r}`, { indent: 10 })
  y -= 6
  write(
    [
      `Audit ${audit.id} on letter version ${audit.letterVersion}`,
      `Started ${new Date(audit.startedAt).toISOString()}${audit.completedAt ? `, completed ${new Date(audit.completedAt).toISOString()}` : ''}${audit.requestedByName ? ` by ${audit.requestedByName}` : ''}`,
      `Rules ${audit.ruleVersion}; claim verification ${audit.aiStatus ?? 'n/a'}${audit.modelVersion ? ` (${audit.modelVersion}, ${audit.promptVersion})` : ''}`,
      `Evidence cutoff ${audit.evidenceCutoff ? new Date(audit.evidenceCutoff).toISOString() : 'none'}`,
      `Draft hash ${audit.draftHash}`,
      `Source hash ${audit.sourceHash}`,
    ].join('\n'),
    { size: 8.5, color: [0.35, 0.35, 0.4], gap: 6 },
  )
  if (s) {
    write(
      `Open findings: ${s.critical} critical, ${s.high} high, ${s.medium} medium, ${s.low} low. Resolved: ${s.resolved}. Claims checked: ${s.claims}.`,
      { gap: 10 },
    )
  }

  for (const f of findings) {
    write(`${f.ruleId}  ${f.severity.toUpperCase()}  ${f.status === 'open' ? 'OPEN' : 'RESOLVED'}`, { font: bold, size: 9, color: [0.3, 0.3, 0.35] })
    write(f.title, { font: bold, size: 10 })
    write(f.detail)
    if (f.claim) write(`Letter: "${f.claim}"`, { indent: 10, color: [0.25, 0.25, 0.3] })
    for (const e of f.evidence as any[]) {
      const where = [e.fileName, e.exhibit != null ? `Ex. ${e.exhibit}` : null, e.page != null ? `p. ${e.page}` : null].filter(Boolean).join(', ')
      write(`${e.role === 'conflict' ? 'Conflicts' : 'Source'} (${where}): "${e.quote}"`, { indent: 10, color: [0.25, 0.25, 0.3] })
    }
    if (f.recommendation) write(`Fix: ${f.recommendation}`, { indent: 10 })
    if (f.resolution) {
      write(`Resolved by ${f.resolution.actorName || 'a reviewer'}${f.resolution.actorIsAttorney ? ' (attorney)' : ''} on ${new Date(f.resolution.createdAt).toISOString()} as ${f.resolution.disposition}: ${f.resolution.reason}`, {
        indent: 10,
        color: [0.05, 0.4, 0.2],
      })
    }
    y -= 8
  }
  write('ClearCaseIQ is a technology platform, not a law firm. This audit supports, and does not replace, attorney review.', {
    size: 8,
    color: [0.45, 0.45, 0.5],
  })
  return doc.save()
}
