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

type ToneKey = 'strong' | 'moderate' | 'weak'

type ResultsReportInput = {
  referenceId?: string | null
  generatedAt?: string
  claimLabel: string
  jurisdiction: string
  incidentDate: string
  caseStrengthScore: number
  successProbability: number
  evidenceCompletionPercent: number
  solRemaining: string
  solDeadline?: string | null
  estimatedTimeline: string
  settlementRangeText: string
  settlementExpectedText: string
  estimateConfidenceLevel: string
  trialValueText: string
  trialExpectedText: string
  liabilityLabel: string
  liabilitySummary: string
  liabilityChecklist: { label: string; ok: boolean }[]
  liabilityPercent: number
  attorneyInterestWord: string
  attorneyInterestSummary: string
  attorneyInterestMissing: string[]
  caseDetails: { label: string; value: string; tone: ToneKey; desc: string }[]
  topActions: { title: string; desc: string; boost: string }[]
  aiSummaryBullets: string[]
  valueDrivers: { label: string; level: string }[]
  deadlineWarning?: string | null
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
  let cursorTop: number = PAGE.marginTop

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
  // Revoking synchronously right after click() can cancel the download in some
  // browsers before it starts, so the file appears to never download (#17).
  // Defer the cleanup well past the point the browser has started the save (or
  // loaded the fallback tab) rather than the next tick.
  const cleanup = () => setTimeout(() => URL.revokeObjectURL(url), 60_000)

  // Fallback when the anchor download is unsupported or blocked: open the PDF in
  // a new tab so the user can still view/save it. As a last resort (popup
  // blocked), navigate the current tab.
  const openFallback = () => {
    const opened = window.open(url, '_blank', 'noopener')
    if (!opened) window.location.href = url
  }

  try {
    const link = document.createElement('a')
    if (!('download' in link)) {
      openFallback()
      cleanup()
      return
    }
    link.href = url
    link.download = fileName
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    cleanup()
  } catch {
    openFallback()
    cleanup()
  }
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

type RGB = [number, number, number]

/** Snapshot-matched palette (0..1 RGB). */
const COLORS = {
  ink: [0.118, 0.137, 0.169] as RGB,
  muted: [0.42, 0.45, 0.5] as RGB,
  faint: [0.6, 0.63, 0.68] as RGB,
  white: [1, 1, 1] as RGB,
  headerBg: [0.063, 0.094, 0.165] as RGB,
  brand: [0.16, 0.27, 0.62] as RGB,
  brandSoft: [0.93, 0.95, 0.99] as RGB,
  emerald: [0.02, 0.59, 0.41] as RGB,
  emeraldSoft: [0.9, 0.97, 0.93] as RGB,
  amber: [0.79, 0.45, 0.05] as RGB,
  amberSoft: [0.99, 0.95, 0.85] as RGB,
  rose: [0.83, 0.16, 0.27] as RGB,
  roseSoft: [0.99, 0.92, 0.93] as RGB,
  violet: [0.46, 0.3, 0.77] as RGB,
  violetSoft: [0.95, 0.93, 0.99] as RGB,
  card: [0.985, 0.99, 0.995] as RGB,
  border: [0.89, 0.91, 0.94] as RGB,
} as const

const fmt = formatPdfNumber
const rgb = (c: RGB) => `${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])}`
const approxTextWidth = (text: string, size: number, font: PdfFontName) =>
  toPdfAscii(text).length * size * (font === 'F2' ? 0.55 : 0.5)

const CONTENT_WIDTH = PAGE.width - PAGE.marginX * 2

function createRichDocument() {
  const pages: string[][] = [[]]
  let pageIndex = 0
  let cursorTop: number = PAGE.marginTop
  const currentPage = () => pages[pageIndex]

  const newPage = () => {
    pages.push([])
    pageIndex += 1
    cursorTop = PAGE.marginTop
  }
  const ensureSpace = (height: number) => {
    if (cursorTop + height > PAGE.height - PAGE.marginBottom) newPage()
  }
  const fillRect = (x: number, top: number, w: number, h: number, color: RGB) => {
    const y = PAGE.height - (top + h)
    currentPage().push(`${rgb(color)} rg ${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re f`)
  }
  const strokeRect = (x: number, top: number, w: number, h: number, color: RGB, lineWidth = 0.8) => {
    const y = PAGE.height - (top + h)
    currentPage().push(`${fmt(lineWidth)} w ${rgb(color)} RG ${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)} re S`)
  }
  const textAt = (
    text: string,
    x: number,
    baselineTop: number,
    opts: { font?: PdfFontName; size?: number; color?: RGB } = {}
  ) => {
    const size = opts.size ?? 11
    const font = opts.font ?? 'F1'
    const color = opts.color ?? COLORS.ink
    const y = PAGE.height - baselineTop
    currentPage().push(
      `BT ${rgb(color)} rg /${font} ${fmt(size)} Tf 1 0 0 1 ${fmt(x)} ${fmt(y)} Tm (${escapePdfText(text)}) Tj ET`
    )
  }

  return {
    pages,
    get cursorTop() {
      return cursorTop
    },
    set cursorTop(v: number) {
      cursorTop = v
    },
    newPage,
    ensureSpace,
    fillRect,
    strokeRect,
    textAt,
    currentPage,
  }
}

type RichDoc = ReturnType<typeof createRichDocument>

/** Buffered block: measure first, then paint background, then text (so fills don't cover text). */
function makeBlock(pad = 14) {
  const innerWidth = CONTENT_WIDTH - pad * 2
  let localTop = 0
  const ops: Array<(panelTop: number, doc: RichDoc) => void> = []
  const lineHeight = (size: number) => size + 6

  const api = {
    get height() {
      return localTop
    },
    get pad() {
      return pad
    },
    get innerWidth() {
      return innerWidth
    },
    get ops() {
      return ops
    },
    gap(n: number) {
      localTop += n
    },
    text(
      text: string,
      opts: { x?: number; font?: PdfFontName; size?: number; color?: RGB } = {}
    ) {
      const size = opts.size ?? 11
      const yOff = localTop
      ops.push((panelTop, doc) =>
        doc.textAt(text, PAGE.marginX + pad + (opts.x ?? 0), panelTop + yOff + size, {
          font: opts.font,
          size,
          color: opts.color,
        })
      )
      localTop += lineHeight(size)
    },
    wrapped(
      text: string,
      opts: { font?: PdfFontName; size?: number; color?: RGB; indent?: number } = {}
    ) {
      const size = opts.size ?? 11
      const font = opts.font ?? 'F1'
      const indent = opts.indent ?? 0
      const maxChars = Math.max(20, Math.floor((innerWidth - indent) / (size * (font === 'F2' ? 0.55 : 0.5))))
      for (const line of wrapText(text, maxChars)) {
        api.text(line || ' ', { x: indent, font, size, color: opts.color })
      }
    },
    bullet(text: string, opts: { color?: RGB; markColor?: RGB; size?: number } = {}) {
      const size = opts.size ?? 11
      const markTop = localTop
      ops.push((panelTop, doc) =>
        doc.textAt('-', PAGE.marginX + pad, panelTop + markTop + size, {
          font: 'F2',
          size,
          color: opts.markColor ?? COLORS.emerald,
        })
      )
      api.wrapped(text, { size, color: opts.color, indent: 14 })
    },
    /** Label left, value right (optionally with a tinted badge behind the value). */
    row(
      left: string,
      right: string,
      opts: {
        size?: number
        leftColor?: RGB
        rightColor?: RGB
        leftFont?: PdfFontName
        rightFont?: PdfFontName
        badge?: RGB
      } = {}
    ) {
      const size = opts.size ?? 11
      const yOff = localTop
      const rightFont = opts.rightFont ?? 'F2'
      ops.push((panelTop, doc) => {
        const baseline = panelTop + yOff + size
        doc.textAt(left, PAGE.marginX + pad, baseline, {
          font: opts.leftFont ?? 'F1',
          size,
          color: opts.leftColor ?? COLORS.ink,
        })
        const rw = approxTextWidth(right, size, rightFont)
        const rx = PAGE.marginX + CONTENT_WIDTH - pad - rw
        if (opts.badge) {
          doc.fillRect(rx - 6, panelTop + yOff - 2, rw + 12, size + 7, opts.badge)
        }
        doc.textAt(right, rx, baseline, {
          font: rightFont,
          size,
          color: opts.rightColor ?? COLORS.muted,
        })
      })
      localTop += lineHeight(size) + (opts.badge ? 4 : 0)
    },
    divider() {
      const yOff = localTop + 4
      ops.push((panelTop, doc) =>
        doc.fillRect(PAGE.marginX + pad, panelTop + yOff, innerWidth, 0.6, COLORS.border)
      )
      localTop += 12
    },
  }
  return api
}

function toneColors(tone: ToneKey): { text: RGB; soft: RGB } {
  if (tone === 'strong') return { text: COLORS.emerald, soft: COLORS.emeraldSoft }
  if (tone === 'moderate') return { text: COLORS.amber, soft: COLORS.amberSoft }
  return { text: COLORS.rose, soft: COLORS.roseSoft }
}

function drawPanel(doc: RichDoc, block: ReturnType<typeof makeBlock>, opts: { fill?: RGB; border?: RGB; accent?: RGB } = {}) {
  const height = block.height + block.pad * 2 - 6
  doc.ensureSpace(height + 12)
  const top = doc.cursorTop
  doc.fillRect(PAGE.marginX, top, CONTENT_WIDTH, height, opts.fill ?? COLORS.card)
  doc.strokeRect(PAGE.marginX, top, CONTENT_WIDTH, height, opts.border ?? COLORS.border)
  if (opts.accent) doc.fillRect(PAGE.marginX, top, 3, height, opts.accent)
  const contentTop = top + block.pad
  for (const op of block.ops) op(contentTop, doc)
  doc.cursorTop = top + height + 12
}

function drawSectionTitle(doc: RichDoc, title: string) {
  doc.ensureSpace(26)
  const top = doc.cursorTop
  doc.fillRect(PAGE.marginX, top + 1, 3.5, 13, COLORS.brand)
  doc.textAt(title, PAGE.marginX + 10, top + 12, { font: 'F2', size: 13, color: COLORS.ink })
  doc.cursorTop = top + 24
}

function drawStatCards(doc: RichDoc, cards: { label: string; value: string; color: RGB }[]) {
  const gap = 10
  const cardW = (CONTENT_WIDTH - gap * (cards.length - 1)) / cards.length
  const cardH = 56
  doc.ensureSpace(cardH + 12)
  const top = doc.cursorTop
  cards.forEach((card, i) => {
    const x = PAGE.marginX + i * (cardW + gap)
    doc.fillRect(x, top, cardW, cardH, COLORS.card)
    doc.strokeRect(x, top, cardW, cardH, COLORS.border)
    doc.textAt(card.label.toUpperCase(), x + 10, top + 18, { font: 'F2', size: 7.5, color: COLORS.muted })
    const valueSize = card.value.length > 11 ? 12 : card.value.length > 8 ? 14 : 17
    doc.textAt(card.value, x + 10, top + 42, { font: 'F2', size: valueSize, color: card.color })
  })
  doc.cursorTop = top + cardH + 14
}

export async function downloadResultsCaseReportPdf(input: ResultsReportInput) {
  const doc = createRichDocument()
  const generatedAt = input.generatedAt || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // ---- Header band ----
  const bandH = 96
  doc.fillRect(0, 0, PAGE.width, bandH, COLORS.headerBg)
  doc.fillRect(0, bandH, PAGE.width, 4, COLORS.brand)
  doc.textAt('ClearCaseIQ', PAGE.marginX, 30, { font: 'F2', size: 17, color: COLORS.white })
  doc.textAt('PRELIMINARY ASSESSMENT  -  CONFIDENTIAL', PAGE.marginX, 46, { font: 'F1', size: 7.5, color: COLORS.faint })
  doc.textAt('Your Case Snapshot', PAGE.marginX, 78, { font: 'F2', size: 22, color: COLORS.white })
  if (input.referenceId) {
    const refLabel = `Reference ${input.referenceId}`
    doc.textAt(refLabel, PAGE.width - PAGE.marginX - approxTextWidth(refLabel, 9, 'F1'), 30, { font: 'F1', size: 9, color: COLORS.faint })
    doc.textAt(generatedAt, PAGE.width - PAGE.marginX - approxTextWidth(generatedAt, 9, 'F1'), 44, { font: 'F1', size: 9, color: COLORS.faint })
  }
  doc.cursorTop = bandH + 22
  doc.textAt("Here's how your case looks based on the information you've provided.", PAGE.marginX, doc.cursorTop, { font: 'F1', size: 10, color: COLORS.muted })
  doc.cursorTop += 20

  // ---- Fact row ----
  const facts = makeBlock(12)
  facts.row('Case Type', input.claimLabel, { leftColor: COLORS.muted, rightColor: COLORS.ink })
  facts.row('Jurisdiction', input.jurisdiction, { leftColor: COLORS.muted, rightColor: COLORS.ink })
  facts.row('Incident Date', input.incidentDate, { leftColor: COLORS.muted, rightColor: COLORS.ink })
  drawPanel(doc, facts, { fill: COLORS.brandSoft, border: COLORS.border })

  // ---- Key metric cards ----
  drawStatCards(doc, [
    { label: 'Case Strength', value: `${input.caseStrengthScore}/100`, color: COLORS.brand },
    { label: 'Success Probability', value: `${input.successProbability}%`, color: COLORS.emerald },
    { label: 'Documentation', value: `${input.evidenceCompletionPercent}%`, color: COLORS.ink },
    { label: 'Time to File', value: input.solRemaining, color: COLORS.amber },
  ])

  // ---- Settlement estimate ----
  drawSectionTitle(doc, 'Settlement Estimate')
  const settle = makeBlock()
  settle.row('Most likely range', input.settlementRangeText, { rightColor: COLORS.emerald, size: 12 })
  settle.row('Most likely amount', input.settlementExpectedText, { rightColor: COLORS.ink })
  settle.row('Confidence', input.estimateConfidenceLevel, { rightColor: COLORS.ink })
  settle.divider()
  settle.text('IF YOUR CASE GOES TO TRIAL', { font: 'F2', size: 8, color: COLORS.muted })
  settle.row('Trial range', input.trialValueText, { rightColor: COLORS.ink })
  settle.row('Trial most likely', input.trialExpectedText, { rightColor: COLORS.ink })
  settle.wrapped('Trials can result in higher awards, but carry more time, risk, and uncertainty, and may be limited by collectability or policy limits.', { size: 9, color: COLORS.muted })
  drawPanel(doc, settle, { accent: COLORS.emerald })

  // ---- Liability ----
  drawSectionTitle(doc, 'Liability')
  const liab = makeBlock()
  liab.row('Assessment', input.liabilityLabel, { rightColor: COLORS.brand, badge: COLORS.brandSoft })
  liab.wrapped(input.liabilitySummary, { size: 10, color: COLORS.ink })
  if (input.liabilityChecklist.length) {
    liab.gap(4)
    for (const item of input.liabilityChecklist) {
      liab.row(item.label, item.ok ? 'Yes' : 'Not added', {
        size: 10,
        leftColor: COLORS.ink,
        rightColor: item.ok ? COLORS.emerald : COLORS.faint,
      })
    }
  }
  liab.divider()
  liab.row('Liability strength', `${input.liabilityPercent}%`, { rightColor: COLORS.brand })
  drawPanel(doc, liab, { accent: COLORS.brand })

  // ---- Attorney interest ----
  drawSectionTitle(doc, 'Attorney Interest')
  const atty = makeBlock()
  atty.row('Interest level', input.attorneyInterestWord, { rightColor: COLORS.violet, badge: COLORS.violetSoft })
  atty.wrapped(input.attorneyInterestSummary, { size: 10, color: COLORS.ink })
  if (input.attorneyInterestMissing.length) {
    atty.gap(4)
    atty.text("What's holding it back?", { font: 'F2', size: 9.5, color: COLORS.muted })
    for (const item of input.attorneyInterestMissing) atty.bullet(item, { size: 10, markColor: COLORS.amber, color: COLORS.ink })
  }
  drawPanel(doc, atty, { accent: COLORS.violet })

  // ---- Case details breakdown ----
  drawSectionTitle(doc, 'Case Details Breakdown')
  const details = makeBlock()
  input.caseDetails.forEach((row, i) => {
    if (i > 0) details.gap(3)
    const tone = toneColors(row.tone)
    details.row(row.label, row.value, { size: 10.5, leftColor: COLORS.ink, rightColor: tone.text, badge: tone.soft })
    details.wrapped(row.desc, { size: 9, color: COLORS.muted })
  })
  drawPanel(doc, details)

  // ---- Top actions ----
  if (input.topActions.length) {
    drawSectionTitle(doc, 'Top Actions to Strengthen Your Case')
    const actions = makeBlock()
    input.topActions.forEach((action, i) => {
      if (i > 0) actions.divider()
      actions.row(action.title, action.boost ? `${action.boost} impact` : '', { size: 10.5, leftFont: 'F2', leftColor: COLORS.ink, rightColor: COLORS.emerald })
      actions.wrapped(action.desc, { size: 9, color: COLORS.muted })
    })
    drawPanel(doc, actions)
  }

  // ---- AI case summary ----
  if (input.aiSummaryBullets.length) {
    drawSectionTitle(doc, 'AI Case Summary')
    const summary = makeBlock()
    for (const bullet of input.aiSummaryBullets) summary.bullet(bullet, { size: 10, markColor: COLORS.emerald, color: COLORS.ink })
    drawPanel(doc, summary)
  }

  // ---- Value drivers ----
  if (input.valueDrivers.length) {
    drawSectionTitle(doc, 'Value Drivers')
    const drivers = makeBlock()
    input.valueDrivers.forEach((row, i) => {
      if (i > 0) drivers.gap(2)
      const tone: ToneKey = /high|strong/i.test(row.level) ? 'strong' : /medium|moderate|building/i.test(row.level) ? 'moderate' : 'weak'
      const tc = toneColors(tone)
      drivers.row(row.label, row.level, { size: 10.5, leftColor: COLORS.ink, rightColor: tc.text })
    })
    drawPanel(doc, drivers, { fill: COLORS.emeraldSoft, border: COLORS.border })
  }

  // ---- Deadlines & disclaimer ----
  drawSectionTitle(doc, 'Timeline & Deadlines')
  const timeline = makeBlock()
  timeline.row('Estimated timeline', input.estimatedTimeline, { rightColor: COLORS.ink })
  timeline.row('Statute of limitations', `${input.solRemaining} remaining`, { rightColor: COLORS.ink })
  if (input.solDeadline) timeline.row('Filing deadline', input.solDeadline, { rightColor: COLORS.rose })
  if (input.deadlineWarning) {
    timeline.gap(4)
    timeline.wrapped(input.deadlineWarning, { size: 9.5, color: COLORS.rose })
  }
  drawPanel(doc, timeline, { fill: input.deadlineWarning ? COLORS.roseSoft : COLORS.card, border: COLORS.border })

  // ---- Footer note ----
  doc.ensureSpace(28)
  const footer = makeBlock(0)
  footer.wrapped(
    'This is a preliminary, automated estimate based on the information provided and is not legal advice or a guarantee of any outcome. Settlement and trial values are projections that may change as more evidence is added. Generated by ClearCaseIQ - Confidential.',
    { size: 8, color: COLORS.faint }
  )
  drawPanel(doc, footer, { fill: COLORS.white, border: COLORS.white })

  savePdf(buildPdfBytes(doc.pages), `ClearCaseIQ-case-snapshot-${input.assessmentId || 'report'}.pdf`)
}

export async function downloadWageLossTemplatePdf(input: WageLossReportInput) {
  const { pages, drawLine, drawWrappedText } = createPdfDocument()

  drawLine('ClearCaseIQ', { font: 'F2', size: 18 })
  drawLine('Wage Loss Documentation', { font: 'F2', size: 13 })
  drawWrappedText(input.templateText, { gapAfter: 4 })

  savePdf(buildPdfBytes(pages), input.assessmentId ? `wage-loss-${input.assessmentId}.pdf` : 'wage-loss-template.pdf')
}
