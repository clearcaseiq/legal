import { prisma } from '../src/lib/prisma'
import { assignCaseTier } from '../src/lib/case-tier-classifier'

async function main() {
  const assessments = await prisma.assessment.findMany({
    where: {
      caseTierId: null
    },
    select: {
      id: true
    }
  })

  if (assessments.length === 0) {
    console.log('No cases without tiers found.')
    return
  }

  let assigned = 0
  for (const assessment of assessments) {
    await assignCaseTier(assessment.id)
    assigned += 1
  }

  console.log(`Assigned tiers to ${assigned} cases.`)
}

main()
  .catch(error => {
    console.error('Assign tiers failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
