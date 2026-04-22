import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  const tier2 = await prisma.caseTier.findUnique({
    where: { tierNumber: 2 }
  })
  
  if (!tier2) {
    console.log('Tier 2 not found')
    await prisma.$disconnect()
    return
  }
  
  console.log(`Tier 2: ${tier2.label}\n`)
  
  if (tier2.promotionRules) {
    const rules = JSON.parse(tier2.promotionRules)
    
    console.log('Promotion to Tier 3:')
    if (rules.canPromoteToTier3) {
      rules.canPromoteToTier3.forEach((rule, i) => {
        console.log(`  ${i + 1}. ${rule.description} (${rule.condition})`)
      })
    }
    
    console.log('\nPromotion to Tier 4:')
    if (rules.canPromoteToTier4) {
      rules.canPromoteToTier4.forEach((rule, i) => {
        console.log(`  ${i + 1}. ${rule.description} (${rule.condition})`)
        if (rule.requires) {
          console.log(`     Requires: ${rule.requires.join(', ')}`)
        }
      })
    }
  } else {
    console.log('No promotion rules found')
  }
  
  await prisma.$disconnect()
}

verify().catch(console.error)
