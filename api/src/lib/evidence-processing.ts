import { spawn } from 'child_process'
import path from 'path'
import { existsSync, readFileSync } from 'fs'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract'
import { prisma } from './prisma'
import { logger } from './logger'
import { runCaseRecalculation } from './case-recalculation'

type StructuredMedicalEvent = {
  date: string | null
  provider?: string
  visitType: string
  details?: string
  amount?: number
  confidence: 'documented' | 'estimated' | 'needs_review'
  source: 'ocr' | 'upload_metadata'
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim()
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return trimmed

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!slashMatch) return null

  const month = Number(slashMatch[1])
  const day = Number(slashMatch[2])
  const rawYear = Number(slashMatch[3])
  const year = rawYear < 100 ? 2000 + rawYear : rawYear
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Stored paths may be relative to API cwd (upload handlers often persist relative paths). */
function resolveEvidencePath(storedPath: string): string {
  if (!storedPath) return storedPath
  if (path.isAbsolute(storedPath)) return storedPath
  return path.resolve(process.cwd(), storedPath)
}

async function performOCR(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const tesseract = spawn('tesseract', [filePath, 'stdout', '-l', 'eng'])
      let output = ''

      tesseract.stdout.on('data', (data) => {
        output += data.toString()
      })

      tesseract.stderr.on('data', (data) => {
        logger.warn('Tesseract stderr', { error: data.toString() })
      })

      tesseract.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim())
        } else {
          logger.warn(`Tesseract exited with code ${code}, returning empty OCR result`)
          resolve('')
        }
      })

      tesseract.on('error', (error) => {
        logger.warn('Tesseract not available or failed', { error: error.message })
        resolve('')
      })
    } catch (error: any) {
      logger.warn('OCR processing failed, returning empty result', { error: error.message })
      resolve('')
    }
  })
}

async function textractDetectDocumentBytes(bytes: Buffer, contextLabel: string): Promise<string> {
  try {
    const client = new TextractClient({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    })
    const response = await client.send(
      new DetectDocumentTextCommand({
        Document: { Bytes: bytes },
      })
    )
    return (response.Blocks || [])
      .filter((block) => block.BlockType === 'LINE' && block.Text)
      .map((block) => block.Text)
      .join('\n')
      .trim()
  } catch (error: any) {
    logger.warn(
      {
        context: contextLabel,
        message: error?.message || String(error),
        name: error?.name,
        code: error?.Code ?? error?.code,
        requestId: error?.$metadata?.requestId,
        httpStatus: error?.$metadata?.httpStatusCode,
        byteLength: bytes?.length,
      },
      'AWS Textract DetectDocumentText failed'
    )
    return ''
  }
}

async function performAwsTextractOCR(filePath: string): Promise<string> {
  try {
    const bytes = readFileSync(filePath)
    return await textractDetectDocumentBytes(bytes, filePath)
  } catch (error: any) {
    logger.warn({ filePath, message: error?.message }, 'Textract could not read file bytes')
    return ''
  }
}

async function performConfiguredOCR(filePath: string): Promise<string> {
  const provider = (process.env.OCR_PROVIDER || 'tesseract').toLowerCase()
  if (provider === 'aws_textract' || provider === 'textract') {
    return performAwsTextractOCR(filePath)
  }
  return performOCR(filePath)
}

/** Minimum non-whitespace chars before we skip raster OCR for PDFs */
const PDF_EMBEDDED_TEXT_MIN_CHARS = 80

async function extractPdfEmbeddedText(filePath: string): Promise<string> {
  let parser: PDFParse | null = null
  try {
    const data = readFileSync(filePath)
    parser = new PDFParse({ data })
    const result = await parser.getText()
    const raw = typeof result?.text === 'string' ? result.text : ''
    return raw.replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim()
  } catch (error: any) {
    logger.warn('PDF embedded text extraction failed', {
      error: error?.message || String(error),
      filePath,
    })
    return ''
  } finally {
    try {
      await parser?.destroy?.()
    } catch {
      /* ignore */
    }
  }
}

/**
 * Sync DetectDocumentText sometimes rejects PDF bytes; rasterizing page 1 often succeeds.
 */
async function textractRenderedPdfFirstPage(filePath: string): Promise<string> {
  let parser: PDFParse | null = null
  try {
    const data = readFileSync(filePath)
    parser = new PDFParse({ data })
    const shot = await parser.getScreenshot({ scale: 1.75, first: 1 })
    await parser.destroy()
    parser = null

    const page0 = shot.pages?.[0]
    const raw = page0?.data
    if (!raw) {
      logger.warn({ filePath }, 'PDF getScreenshot missing page buffer')
      return ''
    }
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array)
    logger.info({ filePath, pngBytes: buf.length }, 'Textract on rendered PDF page 1')
    return await textractDetectDocumentBytes(buf, `${filePath}#render-page-1`)
  } catch (error: any) {
    logger.warn(
      { filePath, message: error?.message || String(error), name: error?.name },
      'PDF render + Textract fallback failed'
    )
    try {
      await parser?.destroy?.()
    } catch {
      /* ignore */
    }
    return ''
  }
}

async function extractPdfCombined(absPath: string, rasterAllowed: boolean): Promise<string> {
  const strength = (t: string) => (t || '').replace(/\s/g, '').length

  let embedded = await extractPdfEmbeddedText(absPath)
  if (!rasterAllowed) return embedded

  let best = embedded
  if (strength(best) >= PDF_EMBEDDED_TEXT_MIN_CHARS) return best

  const provider = (process.env.OCR_PROVIDER || 'tesseract').toLowerCase()
  const allowTextractFallback = process.env.PDF_TEXTRACT_FALLBACK !== 'false'
  const tryTextract =
    provider === 'aws_textract' || provider === 'textract' || allowTextractFallback

  if (!tryTextract) {
    logger.warn(
      'PDF embedded text thin; Textract skipped (set PDF_TEXTRACT_FALLBACK=true or OCR_PROVIDER=aws_textract)'
    )
    return best
  }

  logger.info(
    { absPath, embeddedNonWsChars: strength(embedded) },
    'PDF thin embedded text; Textract on PDF bytes'
  )

  const txPdf = await performAwsTextractOCR(absPath)
  if (strength(txPdf) > strength(best)) best = txPdf

  if (strength(best) < PDF_EMBEDDED_TEXT_MIN_CHARS) {
    logger.info({ absPath }, 'Textract on PDF bytes still thin; trying rendered page 1')
    const txImg = await textractRenderedPdfFirstPage(absPath)
    if (strength(txImg) > strength(best)) best = txImg
  }

  if (strength(best) === 0) {
    logger.warn(
      { absPath },
      'PDF yielded no extractable text after embedded parse + Textract PDF + rendered page'
    )
  }

  return best
}

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function extractDocxPlainText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath })
    return (result.value || '').trim()
  } catch (error: any) {
    logger.warn('DOCX text extraction failed', {
      error: error?.message || String(error),
      filePath,
    })
    return ''
  }
}

function extractPlaintextFile(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8').trim()
  } catch (error: any) {
    logger.warn('Plain text read failed', { error: error?.message, filePath })
    return ''
  }
}

function extractProvider(ocrText: string): string | undefined {
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const providerLine = lines.find((line) =>
    /\b(hospital|clinic|medical center|urgent care|orthopedic|radiology|imaging|therapy|rehab|doctor|dr\.?)\b/i.test(line)
  )
  return providerLine?.slice(0, 120)
}

function inferVisitType(ocrText: string, category: string) {
  const text = ocrText.toLowerCase()
  if (category === 'bills') return 'Medical bill'
  if (/mri|x-ray|xray|ct scan|radiology|imaging/.test(text)) return 'Imaging'
  if (/physical therapy|therapy|rehab/.test(text)) return 'Physical therapy'
  if (/urgent care|emergency|er\b|emergency room/.test(text)) return 'Emergency or urgent care'
  if (/prescription|medication|pharmacy/.test(text)) return 'Medication'
  if (/follow[- ]?up|office visit|progress note|clinical note/.test(text)) return 'Follow-up visit'
  if (/invoice|statement|balance|amount due|bill/.test(text)) return 'Medical bill'
  return category === 'medical_records' ? 'Medical treatment' : 'Medical document'
}

function summarizeText(ocrText: string) {
  const text = ocrText.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const sentences = text.split(/[.!?]\s+/).filter(Boolean)
  return sentences.slice(0, 2).join('. ').slice(0, 500)
}

function classifyEvidence(filename: string, category: string, ocrText: string) {
  const haystack = `${filename} ${category} ${ocrText}`.toLowerCase()
  if (haystack.includes('police') || haystack.includes('incident report')) return 'police_report'
  if (haystack.includes('invoice') || haystack.includes('bill') || haystack.includes('statement')) return 'bills'
  if (haystack.includes('mri') || haystack.includes('x-ray') || haystack.includes('diagnosis')) return 'medical_records'
  if (haystack.includes('photo') || haystack.includes('image')) return 'photos'
  if (haystack.includes('email') || haystack.includes('correspondence')) return 'correspondence'
  return category || 'other'
}

export function buildStructuredMedicalEvents(params: {
  category: string
  originalName: string
  ocrText: string
  dates: string[]
  totalAmount?: number
}): StructuredMedicalEvent[] {
  const { category, originalName, ocrText, dates, totalAmount } = params
  if (!['medical_records', 'bills'].includes(category)) return []

  const normalizedDates = [...new Set(dates.map(normalizeDate).filter((date): date is string => Boolean(date)))]
  const provider = extractProvider(ocrText)
  const visitType = inferVisitType(ocrText, category)
  const details = summarizeText(ocrText) || originalName

  if (normalizedDates.length === 0) {
    return [{
      date: null,
      provider,
      visitType,
      details,
      amount: totalAmount,
      confidence: 'needs_review',
      source: 'upload_metadata',
    }]
  }

  return normalizedDates.map((date) => ({
    date,
    provider,
    visitType,
    details,
    amount: totalAmount,
    confidence: ocrText ? 'documented' : 'estimated',
    source: 'ocr',
  }))
}

async function processExtractedData(ocrText: string, category: string, originalName: string): Promise<any> {
  try {
    const moneyRegex = /\$[\d,]+\.?\d*/g
    const dollarAmounts = ocrText.match(moneyRegex) || []

    const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g
    const dates = [...new Set(ocrText.match(dateRegex) || [])]

    const icdRegex = /\b[A-Z]\d{2}(?:\.\d+)?\b/g
    const icdCodes = [...new Set(ocrText.match(icdRegex) || [])]

    const cptRegex = /\b\d{5}(?:\.\d+)?\b/g
    const cptCodes = [...new Set(ocrText.match(cptRegex) || [])]

    const totalAmount = dollarAmounts.reduce((sum, amount) => {
      const num = parseFloat(amount.replace(/[$,]/g, ''))
      return sum + (isNaN(num) ? 0 : num)
    }, 0)

    const medicalEvents = buildStructuredMedicalEvents({
      category,
      originalName,
      ocrText,
      dates,
      totalAmount: totalAmount || undefined,
    })

    return {
      dollarAmounts,
      totalAmount,
      dates,
      icdCodes,
      cptCodes,
      timeline: medicalEvents,
      entities: {
        provider: extractProvider(ocrText),
        visitType: inferVisitType(ocrText, category),
      },
      confidence: ocrText ? (medicalEvents.some((event) => event.confidence === 'needs_review') ? 0.45 : 0.82) : 0.2,
      keywords: ocrText.toLowerCase().split(/\s+/).filter(word =>
        word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
      ).slice(0, 20)
    }
  } catch (error) {
    logger.error('Failed to process extracted data', { error })
    return {}
  }
}

function buildHighlights(extractedData: any, ocrText: string) {
  const highlights: string[] = []
  if (extractedData?.timeline?.length) {
    highlights.push(`Medical events: ${extractedData.timeline.length}`)
  }
  if (extractedData?.dollarAmounts?.length) {
    highlights.push(`Amounts: ${(extractedData.dollarAmounts as string[]).slice(0, 3).join(', ')}`)
  }
  if (extractedData?.dates?.length) {
    highlights.push(`Dates: ${(extractedData.dates as string[]).slice(0, 3).join(', ')}`)
  }
  if (extractedData?.icdCodes?.length) {
    highlights.push(`ICD: ${(extractedData.icdCodes as string[]).slice(0, 3).join(', ')}`)
  }
  if (extractedData?.cptCodes?.length) {
    highlights.push(`CPT: ${(extractedData.cptCodes as string[]).slice(0, 3).join(', ')}`)
  }
  if (!highlights.length && ocrText) {
    highlights.push(ocrText.split(/\s+/).slice(0, 15).join(' '))
  }
  return highlights
}

export async function processEvidenceFileForExtraction(fileId: string) {
  const evidenceFile = await prisma.evidenceFile.findUnique({
    where: { id: fileId },
    include: {
      processingJobs: {
        where: { status: { in: ['queued', 'running'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!evidenceFile) {
    throw new Error('Evidence file not found')
  }

  const existingJob = evidenceFile.processingJobs?.[0]
  const job = existingJob || await prisma.evidenceProcessingJob.create({
    data: {
      evidenceFileId: fileId,
      jobType: 'full_processing',
      status: 'queued',
      priority: 5,
    },
  })

  await Promise.all([
    prisma.evidenceProcessingJob.update({
      where: { id: job.id },
      data: { status: 'running', startedAt: new Date(), errorMessage: null },
    }),
    prisma.evidenceFile.update({
      where: { id: fileId },
      data: { processingStatus: 'processing' },
    }),
  ])

  try {
    let ocrText = ''
    /** When false: skip Tesseract / Textract for PDFs and images only (DOCX/text still extracted). */
    const rasterOcrAllowed = process.env.ENABLE_OCR !== 'false'
    const mime = evidenceFile.mimetype

    const resolvedPath = resolveEvidencePath(evidenceFile.filePath)
    if (!existsSync(resolvedPath)) {
      throw new Error(
        `Evidence file not found on disk: ${resolvedPath} (stored path: ${evidenceFile.filePath}, cwd: ${process.cwd()})`
      )
    }

    if (!mime.startsWith('video/')) {
      const isLegacyWord = mime === 'application/msword'

      if (mime === 'application/pdf') {
        logger.info(
          { originalName: evidenceFile.originalName, resolvedPath },
          'Processing PDF evidence'
        )
        ocrText = await extractPdfCombined(resolvedPath, rasterOcrAllowed)
      } else if (mime.startsWith('image/') && rasterOcrAllowed) {
        logger.info('Starting OCR processing for file:', evidenceFile.originalName)
        ocrText = await performConfiguredOCR(resolvedPath)
        logger.info('OCR processing completed for file:', evidenceFile.originalName)
      } else if (mime.startsWith('image/') && !rasterOcrAllowed) {
        logger.info('Raster OCR skipped (ENABLE_OCR=false)')
      } else if (mime === DOCX_MIME) {
        logger.info('Extracting DOCX text for file:', evidenceFile.originalName)
        ocrText = await extractDocxPlainText(resolvedPath)
      } else if (mime === 'text/plain') {
        ocrText = extractPlaintextFile(resolvedPath)
      } else if (isLegacyWord) {
        logger.warn('Legacy .doc uploads are not text-extracted; convert to PDF or DOCX for chronology.')
      }
    }

    const extractedData = await processExtractedData(ocrText, evidenceFile.category, evidenceFile.originalName)
    const aiClassification = classifyEvidence(evidenceFile.originalName, evidenceFile.category, ocrText)
    const aiSummary = summarizeText(ocrText)
    const aiHighlights = buildHighlights(extractedData, ocrText)
    const manualReview = !ocrText || extractedData.confidence < 0.5

    await prisma.$transaction([
      prisma.evidenceFile.update({
        where: { id: fileId },
        data: {
          ocrText,
          processingStatus: 'completed',
          aiClassification,
          aiSummary,
          aiHighlights: aiHighlights.length ? JSON.stringify(aiHighlights) : null,
        },
      }),
      prisma.extractedData.deleteMany({ where: { evidenceFileId: fileId } }),
      prisma.extractedData.create({
        data: {
          evidenceFileId: fileId,
          icdCodes: extractedData.icdCodes ? JSON.stringify(extractedData.icdCodes) : null,
          cptCodes: extractedData.cptCodes ? JSON.stringify(extractedData.cptCodes) : null,
          dollarAmounts: extractedData.dollarAmounts ? JSON.stringify(extractedData.dollarAmounts) : null,
          totalAmount: extractedData.totalAmount,
          dates: extractedData.dates ? JSON.stringify(extractedData.dates) : null,
          timeline: extractedData.timeline ? JSON.stringify(extractedData.timeline) : null,
          entities: extractedData.entities ? JSON.stringify(extractedData.entities) : null,
          keywords: extractedData.keywords ? JSON.stringify(extractedData.keywords) : null,
          confidence: extractedData.confidence ?? 0,
          isManualReview: manualReview,
        },
      }),
      prisma.evidenceProcessingJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          results: JSON.stringify({
            confidence: extractedData.confidence ?? 0,
            timelineCount: extractedData.timeline?.length || 0,
            manualReview,
            textNonWsChars: (ocrText || '').replace(/\s/g, '').length,
            resolvedPath,
          }),
        },
      }),
    ])

    if (evidenceFile.assessmentId) {
      void runCaseRecalculation(evidenceFile.assessmentId, 'evidence_processing')
    }

    return extractedData
  } catch (error: any) {
    await Promise.all([
      prisma.evidenceFile.update({
        where: { id: fileId },
        data: { processingStatus: 'failed' },
      }),
      prisma.evidenceProcessingJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error?.message || 'Processing failed',
        },
      }),
    ])
    throw error
  }
}

/** Debug helper: run each PDF extraction stage without Prisma (CLI / support). */
export async function diagnosePdfExtraction(absPath: string): Promise<{
  resolvedPath: string
  cwd: string
  exists: boolean
  embeddedNonWsChars: number
  textractPdfNonWsChars: number
  textractRenderedNonWsChars: number
  combinedNonWsChars: number
  previews: { embedded: string; textractPdf: string; textractRendered: string }
}> {
  const resolvedPath = resolveEvidencePath(absPath)
  const exists = existsSync(resolvedPath)
  const strength = (t: string) => (t || '').replace(/\s/g, '').length
  let embedded = ''
  let textractPdf = ''
  let textractRendered = ''
  let combined = ''

  if (exists) {
    embedded = await extractPdfEmbeddedText(resolvedPath)
    textractPdf = await performAwsTextractOCR(resolvedPath)
    textractRendered = await textractRenderedPdfFirstPage(resolvedPath)
    combined = await extractPdfCombined(resolvedPath, true)
  }

  const clip = (s: string, n: number) => (s || '').replace(/\s+/g, ' ').slice(0, n)

  return {
    resolvedPath,
    cwd: process.cwd(),
    exists,
    embeddedNonWsChars: strength(embedded),
    textractPdfNonWsChars: strength(textractPdf),
    textractRenderedNonWsChars: strength(textractRendered),
    combinedNonWsChars: strength(combined),
    previews: {
      embedded: clip(embedded, 280),
      textractPdf: clip(textractPdf, 280),
      textractRendered: clip(textractRendered, 280),
    },
  }
}

const AUTO_PROCESS_MIMES = new Set([
  'application/pdf',
  DOCX_MIME,
  'text/plain',
])

/** Auto-run text extraction on upload for medical/bills and any PDF/DOCX/plain file. */
export function shouldAutoProcessEvidence(category: string, mimetype?: string) {
  if (mimetype) {
    if (AUTO_PROCESS_MIMES.has(mimetype)) return true
    if (mimetype.startsWith('image/')) return true
  }
  return ['medical_records', 'bills'].includes(category)
}
