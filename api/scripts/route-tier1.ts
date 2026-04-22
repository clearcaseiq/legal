import { prisma } from '../src/lib/prisma'
import { routeTier1Case } from '../src/lib/tier1-routing'
import { assignCaseTier } from '../src/lib/case-tier-classifier'

function parseCaseId(): string | null {
  const args = process.argv.slice(2)
  const caseFlagIndex = args.findIndex(arg => arg === '--caseId' || arg === '-c')

  if (caseFlagIndex !== -1 && args[caseFlagIndex + 1]) {
    return args[caseFlagIndex + 1]
  }

  return args[0] || null
}

async function getLatestTierCase(tierNumber: number): Promise<string | null> {
  const assessment = await prisma.assessment.findFirst({
    where: { caseTier: { tierNumber } },
    orderBy: { createdAt: 'desc' },
    select: { id: true }
  })

  return assessment?.id || null
}

async function ensureTierAssigned(caseId: string): Promise<void> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: caseId },
    include: { caseTier: true }
  })

  if (!assessment) {
    throw new Error(`Case ${caseId} not found`)
  }

  if (!assessment.caseTier) {
    await assignCaseTier(caseId)
  }
}

async function main() {
  const caseId = parseCaseId() || (await getLatestTierCase(1))

  if (!caseId) {
    console.log('No Tier 1 case found. Provide a case id via --caseId <id>.')
    return
  }

  await ensureTierAssigned(caseId)

  const result = await routeTier1Case(caseId)
  console.log(JSON.stringify({ caseId, ...result }, null, 2))
}

main()
  .catch(error => {
    console.error('Tier 1 routing script failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
