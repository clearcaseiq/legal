/**
 * Backfill human-friendly reference codes for assessments created before the
 * feature existed. Idempotent: only touches rows where referenceCode is null.
 *
 * Run:  node ../node_modules/tsx/dist/cli.mjs scripts/backfill-reference-codes.ts
 */
import { prisma } from '../src/lib/prisma'
import { assignReferenceCode } from '../src/lib/case-reference'

async function main() {
  const missing = await prisma.assessment.findMany({
    where: { referenceCode: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Assessments missing a reference code: ${missing.length}`)
  let ok = 0
  let failed = 0
  for (const { id } of missing) {
    const code = await assignReferenceCode(id)
    if (code) {
      ok++
      console.log(`  ${id} -> ${code}`)
    } else {
      failed++
      console.warn(`  ${id} -> FAILED`)
    }
  }
  console.log(`Done. Assigned ${ok}, failed ${failed}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
