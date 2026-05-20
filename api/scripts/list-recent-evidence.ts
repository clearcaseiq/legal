import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '../src/lib/prisma'

async function main() {
  const files = await prisma.evidenceFile.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      originalName: true,
      category: true,
      mimetype: true,
      processingStatus: true,
      filePath: true,
      ocrText: true,
      createdAt: true,
    },
  })

  for (const f of files) {
    const resolved = path.isAbsolute(f.filePath)
      ? f.filePath
      : path.resolve(process.cwd(), f.filePath)
    const onDisk = existsSync(resolved)
    console.log(
      JSON.stringify({
        id: f.id,
        name: f.originalName,
        category: f.category,
        status: f.processingStatus,
        ocrChars: (f.ocrText || '').replace(/\s/g, '').length,
        onDisk,
        resolvedPath: resolved,
        storedPath: f.filePath,
      })
    )
  }

  const jobs = await prisma.evidenceProcessingJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { status: true, errorMessage: true, results: true, evidenceFileId: true },
  })
  console.log('\nRecent jobs:', JSON.stringify(jobs, null, 2))
}

main()
  .finally(() => prisma.$disconnect())
