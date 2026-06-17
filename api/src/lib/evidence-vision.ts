import path from 'path'
import { existsSync, readFileSync } from 'fs'
import sharp from 'sharp'
import { DetectLabelsCommand, RekognitionClient } from '@aws-sdk/client-rekognition'
import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract'
import { logger } from './logger'
import { loadPDFParse, type PDFParseInstance } from './pdf-parse-client'

/**
 * AWS Rekognition based relevance validation for uploaded evidence images.
 *
 * Goal: catch obviously off-topic images (e.g. a photo of a giraffe uploaded as
 * accident "Photos"). We do NOT hard-reject — we return a verdict the caller can
 * surface as a soft warning and/or use to flag the file for manual review.
 */

export type VisionRelevanceStatus = 'relevant' | 'review' | 'mismatch' | 'skipped' | 'error'

export interface DetectedLabel {
  name: string
  confidence: number
}

export interface VisionRelevanceResult {
  status: VisionRelevanceStatus
  /** 0..1 confidence that the image matches the expected evidence category. */
  score: number
  category: string
  matchedLabels: string[]
  topLabels: DetectedLabel[]
  /** Human phrase describing what we expected for this category. */
  expected: string
  /** User-facing message when the image looks off-topic; null when fine/unevaluated. */
  message: string | null
  provider: 'aws_rekognition'
  checkedAt: string
  /** Set when status is 'skipped' or 'error'. */
  reason?: string
}

// Rekognition synchronous DetectLabels accepts image bytes up to 5MB and JPEG/PNG only.
const REKOGNITION_MAX_BYTES = 5 * 1024 * 1024
const JPEG_RESIZE_WIDTHS = [2048, 1600, 1200, 900, 640]

// ---- Label vocabularies (lowercase) -------------------------------------------------

const VEHICLE_LABELS = [
  'car', 'vehicle', 'automobile', 'auto', 'transportation', 'truck', 'suv', 'van', 'minivan',
  'motorcycle', 'motorbike', 'moped', 'scooter', 'bicycle', 'bike', 'bus', 'wheel', 'tire', 'tyre',
  'car wheel', 'bumper', 'windshield', 'windscreen', 'hubcap', 'spoke', 'machine', 'sedan', 'coupe',
  'pickup truck', 'sports car', 'license plate', 'vehicle registration plate', 'brake light',
  'headlight', 'taillight', 'fender', 'dent', 'wreck', 'tow truck', 'trailer', 'engine',
]

// Specific injury indicators (strong signal). Excludes generic body parts, which
// appear in ANY photo of a person and would otherwise mark documents/selfies relevant.
const INJURY_LABELS = [
  'wound', 'bruise', 'injury', 'bandage', 'first aid', 'blood', 'x-ray', 'xray', 'mri', 'ct scan',
  'cast', 'crutch', 'sling', 'stitch', 'suture', 'scar', 'burn', 'swelling', 'laceration',
  'abrasion', 'fracture', 'wheelchair', 'bloodstain', 'stretcher', 'ambulance',
]

// Generic body parts (weak signal): plausible for an injury photo but not sufficient
// on their own, since faces/hands/arms show up in nearly every photo of people.
const BODY_LABELS = [
  'skin', 'arm', 'leg', 'foot', 'ankle', 'knee', 'hand', 'finger', 'wrist', 'elbow', 'shoulder',
  'neck', 'back', 'head', 'face', 'body part', 'bone',
]

// Note: intentionally excludes overly generic terms (path, sign, symbol, lane) that
// match nature trails / arbitrary signage and produce false "relevant" verdicts.
const SCENE_LABELS = [
  'road', 'tarmac', 'asphalt', 'intersection', 'street', 'highway', 'freeway', 'traffic light',
  'traffic signal', 'stoplight', 'road sign', 'traffic sign', 'stop sign', 'accident', 'crash',
  'collision', 'debris', 'guard rail', 'sidewalk', 'crosswalk', 'pothole', 'barricade',
  'traffic cone', 'skid mark', 'parking lot', 'parking', 'curb', 'gutter',
]

const PERSON_LABELS = ['person', 'human', 'face', 'people', 'man', 'woman']

const DOCUMENT_LABELS = [
  'text', 'document', 'page', 'paper', 'receipt', 'invoice', 'id cards', 'driving license',
  'drivers license', 'passport', 'license', 'letter', 'envelope', 'file', 'file binder', 'file folder',
  'menu', 'diploma', 'certificate', 'contract', 'number', 'handwriting', 'calendar', 'spreadsheet',
  'report', 'form', 'statement', 'label', 'ticket', 'business card', 'driving licence',
]

type LabelGroup = 'vehicle' | 'injury' | 'scene' | 'person' | 'body' | 'document'

const GROUP_LABELS: Record<LabelGroup, string[]> = {
  vehicle: VEHICLE_LABELS,
  injury: INJURY_LABELS,
  scene: SCENE_LABELS,
  person: PERSON_LABELS,
  body: BODY_LABELS,
  document: DOCUMENT_LABELS,
}

// Strong signals: their presence confidently confirms the image matches the category.
const CATEGORY_STRONG_GROUPS: Record<string, LabelGroup[]> = {
  photos: ['vehicle', 'injury', 'scene'],
  video: ['vehicle', 'injury', 'scene'],
  police_report: ['document'],
  medical_records: ['document', 'injury'],
  bills: ['document'],
  insurance_letters: ['document'],
  wage_verification: ['document'],
  correspondence: ['document'],
}

// Weak signals: plausible but not sufficient on their own (e.g. a photo of just a
// person could be anything). These prevent a hard mismatch but don't confirm relevance.
const CATEGORY_WEAK_GROUPS: Record<string, LabelGroup[]> = {
  photos: ['person', 'body'],
  video: ['person', 'body'],
  police_report: ['vehicle', 'scene'],
  medical_records: ['body', 'person'],
  bills: [],
  insurance_letters: [],
  wage_verification: [],
  correspondence: [],
}

const CATEGORY_EXPECTATION: Record<string, string> = {
  photos: 'photos of vehicle damage, injuries, or the accident scene',
  video: 'footage of the vehicle, injuries, or the accident scene',
  police_report: 'a police or incident report',
  medical_records: 'medical records, an X-ray, or a treatment document',
  bills: 'a medical bill or invoice',
  insurance_letters: 'an insurance letter or document',
  wage_verification: 'a pay stub or income document',
  correspondence: 'a letter, email, or document',
}

// Document categories where DetectLabels only says "it's a page of text" -- to tell
// a police report apart from a bill or an unrelated document, we read the actual text
// with Textract and match category-specific keywords.
const DOCUMENT_CATEGORY_TERMS: Record<string, { label: string; terms: string[] }> = {
  police_report: {
    label: 'police report',
    terms: [
      'police', 'sheriff', 'department', 'officer', 'incident', 'crash report', 'collision',
      'accident report', 'case number', 'report number', 'badge', 'dispatch', 'citation',
      'violation', 'highway patrol', 'state patrol', 'narrative', 'complainant', 'driver 1',
      'vehicle 1', 'unit 1', 'traffic', 'investigating', 'law enforcement', 'crash',
    ],
  },
  medical_records: {
    label: 'medical record',
    terms: [
      'patient', 'diagnosis', 'treatment', 'physician', 'provider', 'hospital', 'clinic',
      'medical', 'mrn', 'date of service', 'chief complaint', 'history of present illness',
      'assessment and plan', 'prescription', 'medication', 'radiology', 'x-ray', 'mri',
      'discharge', 'vitals', 'symptoms', 'icd', 'cpt', 'doctor', 'nurse', 'examination',
    ],
  },
  bills: {
    label: 'medical bill or invoice',
    terms: [
      'invoice', 'bill', 'statement', 'amount due', 'balance due', 'total due', 'charges',
      'payment', 'account number', 'billing', 'due date', 'subtotal', 'tax', 'patient responsibility',
      'cpt', 'hcpcs', 'amount', 'total', 'balance', 'pay this amount', 'remit',
    ],
  },
  insurance_letters: {
    label: 'insurance letter',
    terms: [
      'insurance', 'claim number', 'policy number', 'claim', 'policy', 'adjuster', 'coverage',
      'insured', 'carrier', 'deductible', 'liability', 'bodily injury', 'property damage',
      'settlement', 'demand', 'subrogation', 'underwriter', 'reservation of rights',
    ],
  },
  wage_verification: {
    label: 'pay stub or income document',
    terms: [
      'pay', 'wage', 'salary', 'gross pay', 'net pay', 'earnings', 'employer', 'employee',
      'pay period', 'pay date', 'hourly', 'overtime', 'ytd', 'withholding', 'payroll',
      'w-2', 'paystub', 'pay stub', 'income', 'hours worked', 'deductions', 'taxable',
    ],
  },
}

function isDocumentCategory(category: string): boolean {
  return Object.prototype.hasOwnProperty.call(DOCUMENT_CATEGORY_TERMS, category)
}

// Documents that are clearly NOT case evidence of any kind (résumés, marketing, etc.).
// When these dominate, we flag a mismatch even if a stray category keyword appears.
const NON_EVIDENCE_DOC_TERMS = [
  'resume', 'résumé', 'curriculum vitae', 'work experience', 'professional experience',
  'employment history', 'references available', 'career objective', 'core competencies',
  'proficient in', 'cover letter', 'gpa', 'extracurricular', 'volunteer experience',
  'linkedin.com/in', 'portfolio', 'achievements', 'certifications', 'bachelor of', 'master of',
  'newsletter', 'unsubscribe', 'follow us', 'terms of service', 'privacy policy',
]

/** Labels that strongly indicate an off-topic image regardless of category. */
const OFF_TOPIC_LABELS = new Set([
  'animal', 'wildlife', 'pet', 'dog', 'cat', 'bird', 'zoo', 'giraffe', 'horse', 'cattle', 'cow',
  'sheep', 'fish', 'insect', 'reptile', 'mammal', 'tree', 'plant', 'flower', 'garden', 'forest',
  'food', 'meal', 'fruit', 'vegetable', 'dessert', 'drink', 'beverage', 'beach', 'ocean', 'sea',
  'mountain', 'landscape', 'scenery', 'toy', 'cartoon', 'art', 'painting', 'screen', 'monitor',
  'meme', 'logo', 'poster', 'sky', 'cloud',
  // Natural scenery often mistaken as "scene" evidence.
  'nature', 'outdoors', 'pond', 'lake', 'river', 'canal', 'waterfall', 'stream', 'sea',
  'meadow', 'grassland', 'grass', 'jungle', 'desert', 'valley', 'hill', 'cliff', 'sunset',
  'sunrise', 'rainbow', 'park', 'woodland', 'vegetation', 'countryside', 'field',
])

function labelMatches(name: string, accepted: Set<string>): boolean {
  const n = name.toLowerCase().trim()
  if (accepted.has(n)) return true
  const words = n.split(/[^a-z0-9]+/).filter(Boolean)
  if (words.some((w) => accepted.has(w))) return true
  for (const kw of accepted) {
    if (kw.includes(' ') && n.includes(kw)) return true
  }
  return false
}

export function isVisionEnabled(): boolean {
  if (process.env.EVIDENCE_VISION_ENABLED === 'false') return false
  // Need a region for the AWS SDK; credentials come from the default provider chain.
  return Boolean(process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION)
}

let cachedClient: RekognitionClient | null = null
function getClient(): RekognitionClient {
  if (!cachedClient) {
    cachedClient = new RekognitionClient({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    })
  }
  return cachedClient
}

let cachedTextract: TextractClient | null = null
function getTextractClient(): TextractClient {
  if (!cachedTextract) {
    cachedTextract = new TextractClient({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    })
  }
  return cachedTextract
}

/** Read printed text from an image with Textract; returns '' on any failure. */
async function detectDocumentText(jpegBytes: Buffer): Promise<string> {
  try {
    const response = await getTextractClient().send(
      new DetectDocumentTextCommand({ Document: { Bytes: jpegBytes } })
    )
    return (response.Blocks || [])
      .filter((b) => b.BlockType === 'LINE' && b.Text)
      .map((b) => b.Text)
      .join('\n')
      .trim()
  } catch (error: any) {
    logger.warn('Vision: Textract DetectDocumentText failed', {
      error: error?.message || String(error),
      name: error?.name,
    })
    return ''
  }
}

function countTermHits(haystack: string, terms: string[]): number {
  let hits = 0
  for (const term of terms) {
    if (haystack.includes(term)) hits += 1
  }
  return hits
}

/**
 * Verify a document image is the RIGHT kind of document by reading its text. The label
 * check already confirmed it looks like a page of text; here we match category keywords.
 * Returns null when we can't make a confident judgment (caller keeps the label verdict).
 */
function assessDocumentText(
  category: string,
  text: string,
  base: Pick<VisionRelevanceResult, 'category' | 'topLabels' | 'expected' | 'provider' | 'checkedAt'>
): VisionRelevanceResult | null {
  const target = DOCUMENT_CATEGORY_TERMS[category]
  if (!target) return null

  const normalized = text.toLowerCase().replace(/\s+/g, ' ')
  // Too little text to judge -> defer to the label verdict.
  if (normalized.replace(/[^a-z0-9]/g, '').length < 25) return null

  const expectedHits = countTermHits(normalized, target.terms)
  const nonEvidenceHits = countTermHits(normalized, NON_EVIDENCE_DOC_TERMS)

  // Find the best-matching competing document category.
  let competitor: { key: string; label: string; hits: number } | null = null
  for (const [key, def] of Object.entries(DOCUMENT_CATEGORY_TERMS)) {
    if (key === category) continue
    const hits = countTermHits(normalized, def.terms)
    if (!competitor || hits > competitor.hits) competitor = { key, label: def.label, hits }
  }

  // Résumé / marketing markers (e.g. "career objective", "references available") essentially
  // never appear in genuine case documents, so two or more is a near-certain signal that this
  // is not evidence -- even when it also mentions medical/work terms (e.g. a nurse's résumé).
  if (nonEvidenceHits >= 2) {
    return {
      ...base,
      status: 'mismatch',
      score: 0.15,
      matchedLabels: [],
      message: `This looks like a résumé or other non-case document, not ${base.expected}. Please upload the right file or remove it.`,
    }
  }

  // Strong match for the expected category (two or more keywords) -> confirmed relevant.
  if (expectedHits >= 2) {
    return { ...base, status: 'relevant', score: 0.9, matchedLabels: [], message: null }
  }

  // Clearly looks like a different legal document type -> mismatch.
  if (competitor && competitor.hits >= 3 && competitor.hits > expectedHits + 1) {
    return {
      ...base,
      status: 'mismatch',
      score: 0.15,
      matchedLabels: [],
      message: `This reads like ${competitor.label === 'medical record' ? 'a medical record' : `a ${competitor.label}`}, not ${base.expected}. Please upload it under the right section or remove it.`,
    }
  }

  // Fewer than two expected keywords and nothing decisive -> we can't confirm it. Soft
  // warning rather than a green pass, so unrelated documents don't slip through.
  return {
    ...base,
    status: 'review',
    score: 0.4,
    matchedLabels: [],
    message: `This looks like a document, but we couldn't confirm it's ${base.expected}. Please double-check it's the right file.`,
  }
}

/** Convert any supported image into a Rekognition-friendly JPEG under the size limit. */
async function toRekognitionJpeg(input: Buffer | string): Promise<Buffer | null> {
  for (const width of JPEG_RESIZE_WIDTHS) {
    try {
      const buf = await sharp(input)
        .rotate()
        .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer()
      if (buf.length <= REKOGNITION_MAX_BYTES) return buf
    } catch (error: any) {
      logger.warn('Vision: sharp re-encode failed', { error: error?.message || String(error), width })
      return null
    }
  }
  return null
}

async function detectLabels(jpegBytes: Buffer): Promise<DetectedLabel[]> {
  const client = getClient()
  const response = await client.send(
    new DetectLabelsCommand({
      Image: { Bytes: jpegBytes },
      MaxLabels: 30,
      MinConfidence: 50,
    })
  )
  return (response.Labels || [])
    .filter((label) => label.Name && typeof label.Confidence === 'number')
    .map((label) => ({ name: label.Name as string, confidence: Number(label.Confidence) }))
    .sort((a, b) => b.confidence - a.confidence)
}

/**
 * Pure relevance assessment given a category and detected labels. Exported for testing
 * and reuse by both the upload path and the pre-check endpoint.
 */
export function assessRelevance(category: string, labels: DetectedLabel[]): VisionRelevanceResult {
  const base = {
    category,
    topLabels: labels.slice(0, 6),
    expected: CATEGORY_EXPECTATION[category] || 'evidence relevant to your case',
    provider: 'aws_rekognition' as const,
    checkedAt: new Date().toISOString(),
  }

  const strongGroups = CATEGORY_STRONG_GROUPS[category]
  // Unknown/generic category -> we cannot judge relevance; treat as relevant.
  if (!strongGroups) {
    return { ...base, status: 'relevant', score: 1, matchedLabels: [], message: null }
  }

  if (labels.length === 0) {
    return { ...base, status: 'review', score: 0.4, matchedLabels: [], message: null }
  }

  const weakGroups = CATEGORY_WEAK_GROUPS[category] || []
  const strongAccepted = new Set(strongGroups.flatMap((g) => GROUP_LABELS[g]))
  const weakAccepted = new Set(weakGroups.flatMap((g) => GROUP_LABELS[g]))

  // A strong match confidently confirms relevance.
  const strongMatched = labels.filter((l) => labelMatches(l.name, strongAccepted))
  if (strongMatched.length > 0) {
    const score = Math.max(...strongMatched.map((m) => m.confidence)) / 100
    return {
      ...base,
      status: 'relevant',
      score,
      matchedLabels: strongMatched.map((m) => m.name),
      message: null,
    }
  }

  const top3 = labels.slice(0, 3).map((l) => l.name).join(', ')

  // No strong match. Look for the dominant label that is neither strong nor weak --
  // a high-confidence unrelated subject (animal, tree, food, ...) means wrong file.
  const accepted = new Set<string>([...strongAccepted, ...weakAccepted])
  const unrelated = labels.filter((l) => !labelMatches(l.name, accepted))
  const dominantUnrelated = unrelated[0] // labels are sorted by confidence desc
  const hasOffTopic = labels.some(
    (l) => l.confidence >= 70 && labelMatches(l.name, OFF_TOPIC_LABELS)
  )

  if (hasOffTopic || (dominantUnrelated && dominantUnrelated.confidence >= 80)) {
    return {
      ...base,
      status: 'mismatch',
      score: 0.1,
      matchedLabels: [],
      message: `This image looks like ${top3}. We expected ${base.expected}. Please confirm it's the right file or remove it.`,
    }
  }

  // Only weak signals (e.g. a bare person) or low-confidence labels -> ambiguous.
  return {
    ...base,
    status: 'review',
    score: 0.35,
    matchedLabels: [],
    message: `We couldn't confirm this looks like ${base.expected}. Double-check it's the right file.`,
  }
}

interface AnalyzeArgs {
  category: string
  filePath?: string
  buffer?: Buffer
  mimetype?: string
}

/** Run Rekognition DetectLabels for an image and assess relevance to the category. */
export async function analyzeImageRelevance(args: AnalyzeArgs): Promise<VisionRelevanceResult> {
  const { category, filePath, buffer, mimetype } = args
  const skipped = (reason: string): VisionRelevanceResult => ({
    status: 'skipped',
    score: 0,
    category,
    matchedLabels: [],
    topLabels: [],
    expected: CATEGORY_EXPECTATION[category] || 'evidence relevant to your case',
    message: null,
    provider: 'aws_rekognition',
    checkedAt: new Date().toISOString(),
    reason,
  })

  if (!isVisionEnabled()) return skipped('vision_disabled')
  if (mimetype && !mimetype.startsWith('image/')) return skipped('not_an_image')

  let source: Buffer | string | null = null
  if (buffer) {
    source = buffer
  } else if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
    if (!existsSync(resolved)) return skipped('file_missing')
    try {
      source = readFileSync(resolved)
    } catch (error: any) {
      logger.warn('Vision: could not read file', { error: error?.message, filePath })
      return skipped('read_failed')
    }
  }
  if (!source) return skipped('no_source')

  try {
    const jpeg = await toRekognitionJpeg(source)
    if (!jpeg) return skipped('encode_failed')

    const labels = await detectLabels(jpeg)
    let result = assessRelevance(category, labels)

    // For document categories, DetectLabels only confirms "page of text" -- read the
    // actual text with Textract to verify it's the RIGHT kind of document (e.g. a police
    // report vs an unrelated list). Only do this when labels didn't already reject it.
    if (isDocumentCategory(category) && result.status !== 'mismatch') {
      const text = await detectDocumentText(jpeg)
      const textVerdict = assessDocumentText(category, text, {
        category: result.category,
        topLabels: result.topLabels,
        expected: result.expected,
        provider: result.provider,
        checkedAt: result.checkedAt,
      })
      if (textVerdict) result = textVerdict
    }

    logger.info('Vision relevance assessed', {
      category,
      status: result.status,
      score: Number(result.score.toFixed(2)),
      topLabels: result.topLabels.map((l) => `${l.name}:${Math.round(l.confidence)}`),
    })
    return result
  } catch (error: any) {
    logger.warn('Vision: Rekognition DetectLabels failed', {
      error: error?.message || String(error),
      name: error?.name,
      httpStatus: error?.$metadata?.httpStatusCode,
      category,
    })
    return {
      status: 'error',
      score: 0,
      category,
      matchedLabels: [],
      topLabels: [],
      expected: CATEGORY_EXPECTATION[category] || 'evidence relevant to your case',
      message: null,
      provider: 'aws_rekognition',
      checkedAt: new Date().toISOString(),
      reason: error?.name || 'rekognition_error',
    }
  }
}

const PDF_MIN_TEXT_CHARS = 40

/** Extract text from a PDF buffer: embedded text first, then render page 1 + Textract OCR. */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const strength = (t: string) => (t || '').replace(/\s/g, '').length

  // 1) Embedded (digital) text.
  let embedded = ''
  let parser: PDFParseInstance | null = null
  try {
    const PDFParse = await loadPDFParse()
    parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    embedded = (typeof result?.text === 'string' ? result.text : '')
      .replace(/\u0000/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch (error: any) {
    logger.warn('Vision: PDF embedded text extraction failed', { error: error?.message || String(error) })
  } finally {
    try {
      await parser?.destroy?.()
    } catch {
      /* ignore */
    }
  }
  if (strength(embedded) >= PDF_MIN_TEXT_CHARS) return embedded

  // 2) Scanned PDF: render the first page to an image and OCR it with Textract.
  let renderParser: PDFParseInstance | null = null
  try {
    const PDFParse = await loadPDFParse()
    renderParser = new PDFParse({ data: buffer })
    const shot = await renderParser.getScreenshot({ scale: 1.75, first: 1 })
    const raw = shot.pages?.[0]?.data
    if (raw) {
      const pageBuf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array)
      const jpeg = await toRekognitionJpeg(pageBuf)
      const ocr = jpeg ? await detectDocumentText(jpeg) : ''
      if (strength(ocr) > strength(embedded)) return ocr
    }
  } catch (error: any) {
    logger.warn('Vision: PDF render + OCR failed', { error: error?.message || String(error) })
  } finally {
    try {
      await renderParser?.destroy?.()
    } catch {
      /* ignore */
    }
  }

  return embedded
}

/** Assess relevance of a PDF (document) to the evidence category by reading its text. */
export async function analyzePdfRelevance(args: { category: string; buffer: Buffer }): Promise<VisionRelevanceResult> {
  const { category, buffer } = args
  const base = {
    category,
    topLabels: [] as DetectedLabel[],
    expected: CATEGORY_EXPECTATION[category] || 'evidence relevant to your case',
    provider: 'aws_rekognition' as const,
    checkedAt: new Date().toISOString(),
  }
  const skipped = (reason: string): VisionRelevanceResult => ({
    ...base,
    status: 'skipped',
    score: 0,
    matchedLabels: [],
    message: null,
    reason,
  })

  if (!isVisionEnabled()) return skipped('vision_disabled')

  // A PDF in a photo/video slot is the wrong kind of file.
  if (!isDocumentCategory(category)) {
    return {
      ...base,
      status: 'review',
      score: 0.4,
      matchedLabels: [],
      message: `This is a PDF document. We expected ${base.expected}. Please confirm it's the right file.`,
    }
  }

  let text = ''
  try {
    text = await extractPdfText(buffer)
  } catch (error: any) {
    logger.warn('Vision: PDF text extraction error', { error: error?.message || String(error), category })
    return skipped('pdf_read_failed')
  }

  const verdict = assessDocumentText(category, text, base)
  if (verdict) {
    logger.info('Vision PDF relevance assessed', { category, status: verdict.status })
    return verdict
  }

  // Couldn't read enough text to judge -> don't warn (avoid false positives).
  return skipped('pdf_text_insufficient')
}

/** True when a verdict should flag the evidence file for manual review. */
export function shouldFlagForReview(result: VisionRelevanceResult): boolean {
  return result.status === 'mismatch' || result.status === 'review'
}
