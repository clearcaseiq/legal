/**
 * Diagnostic for evidence VIDEO relevance validation.
 *
 * Generates a short synthetic MP4 with ffmpeg (a "car"-ish colored scene isn't
 * guaranteed to trigger vehicle labels — the point is to prove the pipeline runs:
 * ffmpeg frame extraction -> Rekognition DetectLabels -> assessRelevance).
 *
 * Run: pnpm diagnose:video
 */
import 'dotenv/config'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { analyzeVideoRelevance, isVisionEnabled } from '../src/lib/evidence-vision'

async function main() {
  console.log('--- Config ---')
  console.log('AWS_REGION            :', process.env.AWS_REGION || '(unset)')
  console.log('isVisionEnabled()     :', isVisionEnabled())

  const bin = process.env.FFMPEG_PATH || 'ffmpeg'
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'diag-vid-'))
  const videoPath = path.join(tmpDir, 'sample.mp4')

  try {
    // 4-second 640x360 test clip using ffmpeg's testsrc pattern.
    const gen = spawnSync(bin, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=15:duration=4',
      '-pix_fmt', 'yuv420p', videoPath,
    ], { encoding: 'utf8' })
    if (gen.status !== 0 || !existsSync(videoPath)) {
      console.error('ffmpeg test-clip generation failed:', gen.stderr || gen.error)
      process.exit(1)
    }
    console.log('\nSynthetic MP4 created:', videoPath)

    console.log('\n--- analyzeVideoRelevance(category=video) ---')
    const result = await analyzeVideoRelevance({ category: 'video', filePath: videoPath })
    console.log('  status  :', result.status)
    console.log('  score   :', result.score.toFixed(2))
    console.log('  reason  :', result.reason || '-')
    console.log('  expected:', result.expected)
    console.log('  topLabels:', result.topLabels.map((l) => `${l.name}:${Math.round(l.confidence)}`).join(', ') || '(none)')
    console.log('  message :', result.message || '(none)')
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
