import { prisma } from '../src/lib/prisma'

function parseTier(): number | null {
  const args = process.argv.slice(2)
  if (args.includes('--all') || args.includes('-a')) {
    return null
  }
  const tierFlagIndex = args.findIndex(arg => arg === '--tier' || arg === '-t')

  if (tierFlagIndex !== -1 && args[tierFlagIndex + 1]) {
    const parsed = Number(args[tierFlagIndex + 1])
    return Number.isFinite(parsed) ? parsed : null
  }

  if (args[0]) {
    const parsed = Number(args[0])
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

async function main() {
  const tierNumber = parseTier()

  const where = tierNumber
    ? { caseTier: { tierNumber } }
    : {}

  const assessments = await prisma.assessment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      claimType: true,
      venueState: true,
      venueCounty: true,
      status: true,
      createdAt: true,
      caseTier: {
        select: {
          tierNumber: true
        }
      }
    }
  })

  if (assessments.length === 0) {
    console.log('No cases found for the requested tier.')
    return
  }

  const rows = assessments.map(assessment => ({
    caseId: assessment.id,
    tier: assessment.caseTier?.tierNumber ?? null,
    claimType: assessment.claimType,
    venueState: assessment.venueState,
    venueCounty: assessment.venueCounty ?? '',
    status: assessment.status,
    createdAt: assessment.createdAt.toISOString()
  }))

  console.table(rows)
}

main()
  .catch(error => {
    console.error('List tier cases failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
