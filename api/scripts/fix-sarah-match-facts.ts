/**
 * Repair the demo Sarah matches whose `facts` were stored as plain prose.
 * The app parses assessment.facts as JSON (SOL check, command center, coach),
 * so prose triggers a 500 when opening the lead. This rewrites them into the
 * canonical structured shape, preserving the original prose as the narrative.
 *
 * Usage:
 *   node ../node_modules/tsx/dist/cli.mjs scripts/fix-sarah-match-facts.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const assessments = await prisma.assessment.findMany({
    where: { referenceCode: { startsWith: 'CCIQ-SJ-' } },
    select: {
      id: true,
      facts: true,
      referenceCode: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (assessments.length === 0) {
    console.log('No CCIQ-SJ- demo assessments found.')
    return
  }

  let fixed = 0
  for (const a of assessments) {
    // Skip anything already valid JSON.
    let alreadyJson = false
    try {
      const parsed = JSON.parse(a.facts)
      alreadyJson = typeof parsed === 'object' && parsed !== null
    } catch {
      alreadyJson = false
    }
    if (alreadyJson) {
      console.log(`  skip ${a.referenceCode} (already JSON)`)
      continue
    }

    const incidentDate = new Date(a.createdAt.getTime() - 45 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const facts = {
      incident: { date: incidentDate, narrative: a.facts },
      injuries: [],
      treatment: [],
      damages: {},
      plaintiffContext: {
        firstName: a.user?.firstName || '',
        lastName: a.user?.lastName || '',
        email: a.user?.email || '',
        phone: '',
      },
      consents: { tos: true, privacy: true, ml_use: true, hipaa: false },
    }

    await prisma.assessment.update({
      where: { id: a.id },
      data: { facts: JSON.stringify(facts) },
    })
    fixed++
    console.log(`  fixed ${a.referenceCode} (${a.user?.firstName} ${a.user?.lastName})`)
  }

  console.log(`\nRepaired ${fixed} of ${assessments.length} demo assessment(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
