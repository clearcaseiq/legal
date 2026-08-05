import '../src/env'
import { prisma } from '../src/lib/prisma'

async function main() {
  const counts = await prisma.$queryRawUnsafe<{ source: string; total: number; pi: number }[]>(
    `SELECT source, COUNT(*)::int as total, COUNT(*) FILTER (WHERE "piRelevant" = true)::int as pi FROM production_attorneys GROUP BY source ORDER BY total DESC`
  )
  console.log('Staging table counts:')
  for (const row of counts) {
    console.log(`  ${row.source}: ${row.total} total, ${row.pi} PI-relevant`)
  }

  const grandTotal = counts.reduce((s, r) => s + r.total, 0)
  console.log(`\nGrand total: ${grandTotal}`)

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect() })
