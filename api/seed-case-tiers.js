import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedCaseTiers() {
  console.log('Seeding case tiers...')

  const tiers = [
    {
      tierNumber: 1,
      name: 'Tier 1',
      color: 'green',
      label: 'Low Severity / High Volume',
      description: 'Commodity cases - Low severity, high volume cases with predictable outcomes',
      minSettlementRange: 0,
      maxSettlementRange: 25000,
      buyingModel: 'Fixed price',
      lawyerProfile: 'High-volume PI shops, solo practitioners',
      goal: 'Liquidity, scale, predictable flow',
      caseTypes: JSON.stringify([
        'Minor auto accidents (soft tissue only)',
        'Rear-end collisions with no ER visit',
        'Parking lot accidents',
        'Minor slip-and-fall with no fracture',
        'Dog bites with no surgery',
        'Low medical bills (<$5K)',
        'Short treatment duration (<4 weeks)'
      ]),
      characteristics: JSON.stringify([
        'No surgery',
        'No hospitalization',
        'Minimal imaging',
        'Clear liability but low damages'
      ]),
      isActive: true
    },
    {
      tierNumber: 2,
      name: 'Tier 2',
      color: 'yellow',
      label: 'Moderate Injury / Core Revenue',
      description: 'Bread-and-butter PI - Moderate injury cases that form the core revenue engine',
      minSettlementRange: 25000,
      maxSettlementRange: 100000,
      buyingModel: 'Fixed price + subscription',
      lawyerProfile: 'Established PI firms',
      goal: 'Platform revenue engine',
      caseTypes: JSON.stringify([
        'Auto accidents with fractures',
        'Slip-and-fall with documented injury',
        'Dog bites requiring stitches or rehab',
        'Premises liability with medical treatment',
        'Moderate motorcycle accidents',
        'Pedestrian accidents without permanent disability',
        'Nursing home neglect (non-fatal, documented injury)'
      ]),
      characteristics: JSON.stringify([
        'ER visit + follow-up treatment',
        'Imaging (X-ray / MRI)',
        'Missed work',
        'Medical bills $10K–$50K',
        'Non-surgical but meaningful damages'
      ]),
      isActive: true
    },
    {
      tierNumber: 3,
      name: 'Tier 3',
      color: 'blue',
      label: 'High Severity / High Value',
      description: 'Strategic cases - High severity cases requiring litigation capability',
      minSettlementRange: 100000,
      maxSettlementRange: 500000,
      buyingModel: 'Fixed price + limited auction',
      lawyerProfile: 'Litigation-capable firms',
      goal: 'Monetize intelligence',
      caseTypes: JSON.stringify([
        'Surgery-related auto accidents',
        'Severe slip-and-fall (spine, head injury)',
        'Medical malpractice (non-fatal)',
        'Product liability with injury',
        'Commercial vehicle accidents',
        'Construction accidents (non-workers comp)',
        'Elder abuse with significant harm',
        'Brain injury (TBI without death)'
      ]),
      characteristics: JSON.stringify([
        'Surgery or invasive procedures',
        'Long-term treatment',
        'Expert testimony likely',
        'Disputed liability',
        'Insurance policy limits matter'
      ]),
      isActive: true
    },
    {
      tierNumber: 4,
      name: 'Tier 4',
      color: 'red',
      label: 'Catastrophic / Premium',
      description: 'Platform-defining cases - Catastrophic cases requiring elite trial capability',
      minSettlementRange: 500000,
      maxSettlementRange: null, // Multi-million, no upper limit
      buyingModel: 'Auction / invite-only / concierge',
      lawyerProfile: 'Elite trial firms',
      goal: 'Maximize value, not volume',
      caseTypes: JSON.stringify([
        'Wrongful death',
        'Fatal medical malpractice',
        'Catastrophic surgery complications',
        'Severe traumatic brain injury',
        'Quadriplegia / paralysis',
        'Amputation cases',
        'Nursing home wrongful death',
        'Aviation accidents',
        'Mass tort individual claims',
        'Defective medical devices (serious harm)'
      ]),
      characteristics: JSON.stringify([
        'Life-altering or fatal outcomes',
        'Complex causation',
        'High emotional sensitivity',
        'Multi-defendant scenarios',
        'Long litigation cycles'
      ]),
      isActive: true
    }
  ]

  for (const tier of tiers) {
    await prisma.caseTier.upsert({
      where: { tierNumber: tier.tierNumber },
      update: tier,
      create: tier
    })
    console.log(`✓ Seeded ${tier.name}: ${tier.label}`)
  }

  console.log('Case tiers seeded successfully!')
}

seedCaseTiers()
  .catch((e) => {
    console.error('Error seeding case tiers:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
