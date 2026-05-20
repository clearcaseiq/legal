import { processEvidenceFileForExtraction } from '../src/lib/evidence-processing'

const fileId = process.argv[2]
if (!fileId) {
  console.error('Usage: tsx scripts/reprocess-evidence.ts <evidenceFileId>')
  process.exit(1)
}

processEvidenceFileForExtraction(fileId)
  .then((data) => {
    console.log('Done', {
      confidence: data.confidence,
      timelineCount: data.timeline?.length,
    })
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
