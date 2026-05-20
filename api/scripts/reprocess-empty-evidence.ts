import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '../src/lib/prisma'
import { processEvidenceFileForExtraction } from '../src/lib/evidence-processing'

async function main() {
  const files = await prisma.evidenceFile.findMany({
    where: {
      mimetype: { in: ['application/pdf', 'text/plain'] },
      OR: [{ ocrText: null }, { ocrText: '' }],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, originalName: true, filePath: true, processingStatus: true },
  })

  let ok = 0
  let skip = 0
  let fail = 0

  for (const f of files) {
    const resolved = path.isAbsolute(f.filePath)
      ? f.filePath
      : path.resolve(process.cwd(), f.filePath)
    if (!existsSync(resolved)) {
      console.warn('SKIP missing', f.id, f.originalName)
      skip++
      continue
    }
    try {
      await processEvidenceFileForExtraction(f.id)
      console.log('OK', f.id, f.originalName)
      ok++
    } catch (e: any) {
      console.error('FAIL', f.id, f.originalName, e?.message)
      fail++
    }
  }

  console.log({ ok, skip, fail, total: files.length })
}

main().finally(() => prisma.$disconnect())
