/**
 * Print the facts blob a case is valued from, so the engine can be re-run
 * against real inputs somewhere other than production.
 *
 * Read-only. Emits JSON on stdout and nothing else, so the caller can pipe it.
 *
 * Usage (inside the api container):
 *   docker exec -e ASSESSMENT_ID=<id> clearcaseiq-prod-api \
 *     node /node_modules/tsx/dist/cli.mjs scripts/dump-case-facts.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const id = (process.env.ASSESSMENT_ID || '').trim()
  if (!id) throw new Error('ASSESSMENT_ID is required')

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    select: {
      id: true,
      claimType: true,
      venueState: true,
      venueCounty: true,
      facts: true,
    },
  })
  if (!assessment) throw new Error(`No assessment ${id}`)

  const evidenceFiles = await prisma.evidenceFile.findMany({
    where: { assessmentId: id },
    select: {
      category: true,
      originalName: true,
      aiClassification: true,
      aiSummary: true,
    },
  })

  process.stdout.write(
    JSON.stringify(
      {
        id: assessment.id,
        claimType: assessment.claimType,
        venueState: assessment.venueState,
        venueCounty: assessment.venueCounty,
        facts:
          typeof assessment.facts === 'string'
            ? JSON.parse(assessment.facts)
            : assessment.facts,
        evidenceFiles,
      },
      null,
      0,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
