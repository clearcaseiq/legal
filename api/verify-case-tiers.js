import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  const tiers = await prisma.caseTier.findMany({
    orderBy: { tierNumber: 'asc' }
  })
  
  console.log(`Found ${tiers.length} case tiers:\n`)
  
  for (const tier of tiers) {
    console.log(`${tier.name} (${tier.color}): ${tier.label}`)
    console.log(`  Settlement Range: $${tier.minSettlementRange?.toLocaleString() || 0} - $${tier.maxSettlementRange?.toLocaleString() || 'Multi-Million'}`)
    console.log(`  Buying Model: ${tier.buyingModel}`)
    console.log(`  Lawyer Profile: ${tier.lawyerProfile}`)
    console.log(`  Goal: ${tier.goal}`)
    console.log(`  Case Types: ${JSON.parse(tier.caseTypes).length} types`)
    console.log(`  Characteristics: ${JSON.parse(tier.characteristics).length} characteristics`)
    console.log('')
  }
  
  await prisma.$disconnect()
}

verify().catch(console.error)
