import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { processEvidenceFileForExtraction } from '../src/lib/evidence-processing'

// Reprocess medical/bills evidence for one assessment so the corrected
// date + total logic is applied. Pass an assessmentId as argv[2], or it
// defaults to the most recent assessment that has medical/bills files.
async function resolveAssessmentId(): Promise<string | null> {
  const arg = process.argv[2]
  if (arg) return arg
  const latest = await prisma.evidenceFile.findFirst({
    where: { category: { in: ['medical_records', 'bills'] } },
    orderBy: { createdAt: 'desc' },
    select: { assessmentId: true },
  })
  return latest?.assessmentId ?? null
}

async function main() {
  const assessmentId = await resolveAssessmentId()
  if (!assessmentId) {
    console.log('No assessment with medical/bills files found.')
    return
  }
  console.log('Reprocessing assessment:', assessmentId, '\n')

  const files = await prisma.evidenceFile.findMany({
    where: { assessmentId, category: { in: ['medical_records', 'bills'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, originalName: true, extractedData: { take: 1, select: { totalAmount: true, dates: true } } },
  })

  for (const f of files) {
    const beforeTotal = f.extractedData?.[0]?.totalAmount ?? null
    const beforeDates = f.extractedData?.[0]?.dates ?? 'null'
    try {
      const result = await processEvidenceFileForExtraction(f.id)
      const afterTimeline = Array.isArray(result?.timeline) ? result.timeline.length : 0
      console.log('────────────────────────────────────────────')
      console.log('file        :', f.originalName)
      console.log('total  before -> after :', beforeTotal, '->', result?.totalAmount)
      console.log('dates  before          :', beforeDates)
      console.log('dates  after           :', JSON.stringify(result?.dates || []))
      console.log('timelineEvents after   :', afterTimeline, '| confidence:', result?.confidence)
    } catch (e: any) {
      console.log('────────────────────────────────────────────')
      console.log('file        :', f.originalName)
      console.log('❌ reprocess failed:', e?.message)
    }
  }
  console.log('────────────────────────────────────────────')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
