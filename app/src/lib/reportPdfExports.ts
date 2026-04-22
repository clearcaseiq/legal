type DashboardReportInput = {
  incidentSummaryComplete: boolean
  medicalChronologyCount: number
  damagesDocumented: boolean
  evidenceCount: number
  caseScore: number
  caseScoreLabel: string
  estimatedValueText: string
  documentationPercent: number
  assessmentId?: string | null
}

type ResultsReportInput = {
  caseStrengthScore: number
  successProbability: number
  settlementRangeText: string
  trialProbability: number
  estimatedTimeline: string
  solRemaining: string
  evidenceCompletionPercent: number
  assessmentId?: string | null
}

type WageLossReportInput = {
  templateText: string
  assessmentId?: string | null
}

const PAGE = {
  width: 595.28,
  height: 841.89,
  marginX: 48,
  marginTop: 56,
  marginBottom: 48,
} as const

type PdfFontName = 'F1' | 'F2'

function formatPdfNumber(value: number) {
  return Number(value.toFixed(2)).toString()
}

/** PDF uses WinAnsi-ish Helvetica; Unicode dashes/quotes corrupt as mojibake (e.g. â€"). */
function toPdfAscii(value: string): string {
  return value
    .replace(/[\u2013\u2014\u2012\u2212\uFE58\uFE63]/g, '-') // en/em dash -> ASCII hyphen
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
}

function escapePdfText(value: string) {
  const ascii = toPdfAscii(value)
  return ascii
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

function splitLongToken(token: string, maxChars: number) {
  if (token.length <= maxChars) {
    return [token]
  }

  const parts: string[] = []
  for (let index = 0; index < token.length; index += maxChars) {
    parts.push(token.slice(index, index + maxChars))
  }
  return parts
}

function wrapText(text: string, maxChars: number) {
  const lines: string[] = []
  const paragraphs = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }

    const words = paragraph.trim().split(/\s+/)
    let line = ''

    for (const word of words) {
      const tokens = splitLongToken(word, maxChars)

      for (const token of tokens) {
        const nextLine = line ? `${line} ${token}` : token
        if (nextLine.length <= maxChars) {
          line = nextLine
        } else {
          if (line) {
            lines.push(line)
          }
          line = token
        }
      }
    }

    if (line) {
      lines.push(line)
    }
  }

  return lines
}

function estimateMaxChars(size: number, font: PdfFontName) {
  const averageCharWidth = size * (font === 'F2' ? 0.58 : 0.54)
  return Math.max(24, Math.floor((PAGE.width - PAGE.marginX * 2) / averageCharWidth))
}

function createPdfDocument() {
  const pages: string[][] = [[]]
  const bodySize = 12
  let pageIndex = 0
  let cursorTop = PAGE.marginTop

  const currentPage = () => pages[pageIndex]

  const ensureSpace = (heightNeeded: number) => {
    if (cursorTop + heightNeeded > PAGE.height - PAGE.marginBottom) {
      pages.push([])
      pageIndex += 1
      cursorTop = PAGE.marginTop
    }
  }

  const drawLine = (text: string, opts?: { font?: PdfFontName; size?: number }) => {
    const size = opts?.size ?? bodySize
    const font = opts?.font ?? 'F1'
    ensureSpace(size + 6)
    const y = PAGE.height - cursorTop
    currentPage().push(
      `BT /${font} ${formatPdfNumber(size)} Tf 1 0 0 1 ${formatPdfNumber(PAGE.marginX)} ${formatPdfNumber(y)} Tm (${escapePdfText(
        text
      )}) Tj ET`
    )
    cursorTop += size + 6
  }

  const drawWrappedText = (text: string, opts?: { font?: PdfFontName; size?: number; gapAfter?: number }) => {
    const size = opts?.size ?? bodySize
    const font = opts?.font ?? 'F1'
    const lines = wrapText(text, estimateMaxChars(size, font))

    for (const line of lines) {
      if (line) {
        drawLine(line, { font, size })
      } else {
        cursorTop += size * 0.6
      }
    }

    if (opts?.gapAfter) {
      cursorTop += opts.gapAfter
    }
  }

  return { pages, drawLine, drawWrappedText }
}

function buildPdfBytes(pages: string[][]) {
  const encoder = new TextEncoder()
  const objects: string[] = []
  const pageObjectIds: number[] = []
  const contentObjectIds: number[] = []
  let objectId = 3

  for (const page of pages) {
    pageObjectIds.push(objectId)
    contentObjectIds.push(objectId + 1)
    objectId += 2
  }

  const regularFontId = objectId
  const boldFontId = objectId + 1

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`

  for (let index = 0; index < pages.length; index += 1) {
    const pageCommands = pages[index].join('\n')
    const streamLength = encoder.encode(pageCommands).length
    objects[pageObjectIds[index]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(PAGE.width)} ${formatPdfNumber(PAGE.height)}] ` +
      `/Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`
    objects[contentObjectIds[index]] = `<< /Length ${streamLength} >>\nstream\n${pageCommands}\nendstream`
  }

  objects[regularFontId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`
  objects[boldFontId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = encoder.encode(pdf).length
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`
  }

  const xrefOffset = encoder.encode(pdf).length
  pdf += `xref\n0 ${objects.length}\n`
  pdf += `0000000000 65535 f \n`

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return encoder.encode(pdf)
}

function savePdf(bytes: Uint8Array, fileName: string) {
  const blobBytes = new Uint8Array(bytes.byteLength)
  blobBytes.set(bytes)
  const blob = new Blob([blobBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadDashboardCaseReportPdf(input: DashboardReportInput) {
  const { pages, drawLine } = createPdfDocument()

  drawLine('ClearCaseIQ', { font: 'F2', size: 20 })
  drawLine('Case Intelligence Report', { font: 'F2', size: 14 })
  drawLine(`Incident Summary: ${input.incidentSummaryComplete ? 'Complete' : 'Pending'}`)
  drawLine(`Medical Chronology: ${input.medicalChronologyCount > 0 ? `${input.medicalChronologyCount} entries` : 'Pending'}`)
  drawLine(`Damages Summary: ${input.damagesDocumented ? 'Documented' : 'Pending'}`)
  drawLine(`Evidence: ${input.evidenceCount} files`)
  drawLine(`Case Score: ${input.caseScore}/100 (${input.caseScoreLabel})`)
  drawLine(`Estimated Value: ${input.estimatedValueText}`)
  drawLine(`Documentation: ${input.documentationPercent}% complete`)

  savePdf(buildPdfBytes(pages), `ClearCaseIQ-dashboard-report-${input.assessmentId || 'report'}.pdf`)
}

export async function downloadResultsCaseReportPdf(input: ResultsReportInput) {
  const { pages, drawLine } = createPdfDocument()

  drawLine('ClearCaseIQ', { font: 'F2', size: 20 })
  drawLine('Case Intelligence Report', { font: 'F2', size: 14 })
  drawLine(`Case Strength: ${input.caseStrengthScore}/100`)
  drawLine(`Success Probability: ${input.successProbability}%`)
  drawLine(`Settlement Range: ${input.settlementRangeText}`)
  drawLine(`Trial Probability: ${input.trialProbability}%`)
  drawLine(`Timeline: ${input.estimatedTimeline}`)
  drawLine(`Statute of Limitations: ${input.solRemaining} remaining`)
  drawLine(`Documentation: ${input.evidenceCompletionPercent}%`)

  savePdf(buildPdfBytes(pages), `ClearCaseIQ-case-report-${input.assessmentId || 'report'}.pdf`)
}

export async function downloadWageLossTemplatePdf(input: WageLossReportInput) {
  const { pages, drawLine, drawWrappedText } = createPdfDocument()

  drawLine('ClearCaseIQ', { font: 'F2', size: 18 })
  drawLine('Wage Loss Documentation', { font: 'F2', size: 13 })
  drawWrappedText(input.templateText, { gapAfter: 4 })

  savePdf(buildPdfBytes(pages), input.assessmentId ? `wage-loss-${input.assessmentId}.pdf` : 'wage-loss-template.pdf')
}
