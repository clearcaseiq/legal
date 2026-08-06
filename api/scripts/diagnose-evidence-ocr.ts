import { config } from 'dotenv'
import { resolve } from 'path'
import sharp from 'sharp'
import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract'
import { DetectLabelsCommand, RekognitionClient } from '@aws-sdk/client-rekognition'

config({ path: resolve(__dirname, '../.env'), override: false })

import { analyzeImageRelevance, isVisionEnabled } from '../src/lib/evidence-vision'
import { extractDataFromBuffer } from '../src/lib/evidence-processing'

/**
 * Standalone probe for the evidence OCR + validation pipeline. It renders a
 * synthetic "medical bill" PNG and runs it through the exact code paths the
 * upload handler uses, printing the AWS errors the app normally swallows.
 */
async function main() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || '(unset)'
  console.log('--- Config ---')
  console.log('AWS_REGION            :', region)
  console.log('OCR_PROVIDER          :', process.env.OCR_PROVIDER || '(default tesseract)')
  console.log('ENABLE_OCR            :', process.env.ENABLE_OCR ?? '(unset -> enabled)')
  console.log('EVIDENCE_VISION_ENABLED:', process.env.EVIDENCE_VISION_ENABLED ?? '(unset)')
  console.log('AWS_ACCESS_KEY_ID set  :', Boolean(process.env.AWS_ACCESS_KEY_ID))
  console.log('AWS_SECRET set         :', Boolean(process.env.AWS_SECRET_ACCESS_KEY))
  console.log('isVisionEnabled()      :', isVisionEnabled())
  console.log('')

  const svg = `<?xml version="1.0"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700">
    <rect width="100%" height="100%" fill="white"/>
    <text x="60" y="90"  font-size="42" font-family="Arial" fill="black">Springfield Medical Center</text>
    <text x="60" y="170" font-size="30" font-family="Arial" fill="black">Patient: John Doe</text>
    <text x="60" y="230" font-size="30" font-family="Arial" fill="black">Invoice / Statement of Charges</text>
    <text x="60" y="320" font-size="30" font-family="Arial" fill="black">Office Visit .............. $450.00</text>
    <text x="60" y="380" font-size="30" font-family="Arial" fill="black">MRI Lumbar Spine ......... $2,300.00</text>
    <text x="60" y="440" font-size="30" font-family="Arial" fill="black">Physical Therapy ......... $1,750.00</text>
    <text x="60" y="540" font-size="38" font-family="Arial" fill="black">Total Amount Due: $4,500.00</text>
  </svg>`
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  console.log('Synthetic bill PNG bytes:', png.length)
  console.log('')

  // 1) Raw Rekognition DetectLabels — does the credential/permission work at all?
  console.log('--- Rekognition DetectLabels (raw) ---')
  try {
    const rek = new RekognitionClient({ region: process.env.AWS_REGION || 'us-east-1' })
    const jpeg = await sharp(png).jpeg({ quality: 82 }).toBuffer()
    const resp = await rek.send(new DetectLabelsCommand({ Image: { Bytes: jpeg }, MaxLabels: 10, MinConfidence: 50 }))
    console.log('OK. Labels:', (resp.Labels || []).map((l) => `${l.Name}:${Math.round(l.Confidence || 0)}`).join(', '))
  } catch (err: any) {
    console.log('FAILED:', err?.name, '-', err?.message)
    console.log('  httpStatus:', err?.$metadata?.httpStatusCode)
  }
  console.log('')

  // 2) Raw Textract DetectDocumentText — does OCR work?
  console.log('--- Textract DetectDocumentText (raw) ---')
  try {
    const tx = new TextractClient({ region: process.env.AWS_REGION || 'us-east-1' })
    const jpeg = await sharp(png).jpeg({ quality: 82 }).toBuffer()
    const resp = await tx.send(new DetectDocumentTextCommand({ Document: { Bytes: jpeg } }))
    const lines = (resp.Blocks || []).filter((b) => b.BlockType === 'LINE' && b.Text).map((b) => b.Text)
    console.log('OK. Lines read:', lines.length)
    console.log('  Sample:', lines.slice(0, 6).join(' | '))
  } catch (err: any) {
    console.log('FAILED:', err?.name, '-', err?.message)
    console.log('  httpStatus:', err?.$metadata?.httpStatusCode)
  }
  console.log('')

  // 3) The app's own relevance check (Rekognition labels + Textract keyword match).
  console.log('--- analyzeImageRelevance(category=bills) ---')
  const vision = await analyzeImageRelevance({ category: 'bills', buffer: png, mimetype: 'image/png' })
  console.log('  status:', vision.status, '| score:', vision.score.toFixed(2), '| reason:', vision.reason || '-')
  console.log('  message:', vision.message || '(none)')
  console.log('')

  // 4) The app's own value extraction (OCR -> dollar amounts -> total).
  console.log('--- extractDataFromBuffer(category=bills) ---')
  const extracted = await extractDataFromBuffer(png, 'image/png', 'bills', 'synthetic-bill.png')
  console.log('  dollarAmounts:', extracted.dollarAmounts)
  console.log('  totalAmount  :', extracted.totalAmount)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
