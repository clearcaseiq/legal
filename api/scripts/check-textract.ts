/**
 * AWS Textract connectivity check.
 *
 * Rasterizes a small image with known text, sends it to Textract
 * DetectDocumentText, and prints the detected lines. Verifies that the AWS
 * credentials + region in .env can actually reach the OCR service.
 *
 * Run: pnpm --filter caseiq-api exec tsx scripts/check-textract.ts
 */
import 'dotenv/config'
import sharp from 'sharp'
import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract'

async function main() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
  const hasKey = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)

  console.log('--- AWS Textract connectivity check ---')
  console.log('OCR_PROVIDER   :', process.env.OCR_PROVIDER || '(default tesseract)')
  console.log('ENABLE_OCR     :', process.env.ENABLE_OCR ?? '(unset)')
  console.log('AWS_REGION     :', region)
  console.log('Credentials    :', hasKey ? 'present' : 'MISSING (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)')

  if (!hasKey) {
    console.error('\nNo AWS credentials found in the environment. Set them in api/.env.')
    process.exit(1)
  }

  const marker = `CaseIQ Textract OK ${Math.floor(Math.random() * 100000)}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="160">
    <rect width="100%" height="100%" fill="white"/>
    <text x="24" y="96" font-size="44" font-family="Arial, sans-serif" fill="black">${marker}</text>
  </svg>`
  const png = await sharp(Buffer.from(svg)).png().toBuffer()

  const client = new TextractClient({ region })
  const started = Date.now()
  const res = await client.send(new DetectDocumentTextCommand({ Document: { Bytes: png } }))
  const ms = Date.now() - started

  const lines = (res.Blocks || [])
    .filter((b) => b.BlockType === 'LINE' && b.Text)
    .map((b) => b.Text)

  console.log(`\nRequest ID     : ${res.$metadata?.requestId ?? '(none)'}`)
  console.log(`HTTP status    : ${res.$metadata?.httpStatusCode ?? '(none)'}`)
  console.log(`Latency        : ${ms} ms`)
  console.log('Expected text  :', marker)
  console.log('Detected lines :', JSON.stringify(lines))

  const matched = lines.some((l) => l.includes('Textract OK'))
  console.log(`\nAWS Textract connectivity: OK${matched ? ' (text round-tripped)' : ' (reachable, but text did not match)'}`)
}

main().catch((err: any) => {
  console.error('\nAWS Textract connectivity: FAILED')
  console.error('  name   :', err?.name)
  console.error('  code   :', err?.Code ?? err?.code)
  console.error('  message:', err?.message)
  console.error('  status :', err?.$metadata?.httpStatusCode)
  process.exit(1)
})
