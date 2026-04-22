import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  const total = await prisma.attorney.count({
    where: {
      venues: { contains: 'CA' }
    }
  })

  console.log(`✅ Total California attorneys: ${total}\n`)

  // Get sample with jurisdictions
  const sample = await prisma.attorney.findMany({
    where: {
      venues: { contains: 'CA' }
    },
    include: {
      attorneyProfile: {
        select: {
          jurisdictions: true,
          firmName: true,
          subscriptionTier: true
        }
      }
    },
    take: 10
  })

  console.log('Sample firms:')
  sample.forEach((attorney, i) => {
    const jurisdictions = attorney.attorneyProfile?.jurisdictions 
      ? JSON.parse(attorney.attorneyProfile.jurisdictions)
      : []
    const counties = jurisdictions
      .map(j => `${j.counties?.join(', ') || 'All'} County`)
      .join('; ')
    
    console.log(`\n${i + 1}. ${attorney.name} - ${attorney.attorneyProfile?.firmName || 'N/A'}`)
    console.log(`   Email: ${attorney.email}`)
    console.log(`   Jurisdictions: ${counties || 'CA (all counties)'}`)
    console.log(`   Subscription Tier: ${attorney.attorneyProfile?.subscriptionTier || 'pay-per-case'}`)
    console.log(`   Verified: ${attorney.isVerified ? 'Yes' : 'No'}`)
  })

  // Count by subscription tier
  const byTier = await prisma.attorneyProfile.groupBy({
    by: ['subscriptionTier'],
    where: {
      attorney: {
        venues: { contains: 'CA' }
      }
    },
    _count: true
  })

  console.log('\n\n📊 Distribution by Subscription Tier:')
  byTier.forEach(tier => {
    console.log(`   ${tier.subscriptionTier || 'pay-per-case'}: ${tier._count}`)
  })

  // Count unique jurisdictions
  const allAttorneys = await prisma.attorney.findMany({
    where: { venues: { contains: 'CA' } },
    include: {
      attorneyProfile: {
        select: { jurisdictions: true }
      }
    }
  })

  const allCounties = new Set()
  allAttorneys.forEach(a => {
    if (a.attorneyProfile?.jurisdictions) {
      const jurisdictions = JSON.parse(a.attorneyProfile.jurisdictions)
      jurisdictions.forEach(j => {
        if (j.counties) {
          j.counties.forEach(county => allCounties.add(county))
        }
      })
    }
  })

  console.log(`\n📍 Unique counties covered: ${allCounties.size}`)
  console.log(`   Counties: ${Array.from(allCounties).slice(0, 10).join(', ')}${allCounties.size > 10 ? '...' : ''}`)

  await prisma.$disconnect()
}

verify().catch(console.error)
