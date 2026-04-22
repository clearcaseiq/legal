import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createAttorneyForTestUser() {
  try {
    console.log('Creating attorney record for test@example.com...\n')

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (!user) {
      console.log('❌ User test@example.com not found')
      console.log('   Please create the user first or use a different email.')
      return
    }

    console.log('✅ User found:', user.email)
    console.log(`   Name: ${user.firstName} ${user.lastName}`)

    // Check if attorney already exists
    const existingAttorney = await prisma.attorney.findUnique({
      where: { email: 'test@example.com' }
    })

    if (existingAttorney) {
      console.log('✅ Attorney record already exists for this email')
      console.log(`   Attorney ID: ${existingAttorney.id}`)
      console.log(`   Attorney Name: ${existingAttorney.name}`)
      return
    }

    // Create attorney record
    const attorney = await prisma.attorney.create({
      data: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone || null,
        specialties: JSON.stringify(['Personal Injury', 'Auto Accidents']),
        venues: JSON.stringify([{
          state: 'CA',
          counties: ['Los Angeles', 'Orange']
        }]),
        isActive: true,
        isVerified: false,
        responseTimeHours: 24
      }
    })

    console.log('✅ Created attorney record')
    console.log(`   Attorney ID: ${attorney.id}`)
    console.log(`   Attorney Name: ${attorney.name}`)

    // Create attorney profile
    const attorneyProfile = await prisma.attorneyProfile.create({
      data: {
        attorneyId: attorney.id,
        bio: 'Experienced attorney specializing in personal injury cases.',
        specialties: JSON.stringify(['Personal Injury', 'Auto Accidents']),
        languages: JSON.stringify(['English']),
        yearsExperience: 5,
        totalCases: 0,
        totalSettlements: 0,
        averageSettlement: 0,
        successRate: 0,
        firmName: null,
        firmLocations: null,
        jurisdictions: JSON.stringify([{
          state: 'CA',
          counties: ['Los Angeles', 'Orange']
        }]),
        minInjurySeverity: null,
        excludedCaseTypes: null,
        minDamagesRange: null,
        maxDamagesRange: null,
        maxCasesPerWeek: null,
        maxCasesPerMonth: null,
        intakeHours: null,
        pricingModel: null,
        paymentModel: null,
        subscriptionTier: null
      }
    })

    console.log('✅ Created attorney profile')
    console.log(`   Profile ID: ${attorneyProfile.id}`)

    // Create attorney dashboard
    const attorneyDashboard = await prisma.attorneyDashboard.create({
      data: {
        attorneyId: attorney.id,
        totalLeadsReceived: 0,
        totalLeadsAccepted: 0,
        totalFeesCollected: 0,
        totalPlatformSpend: 0,
        pricingModel: 'per_lead',
        leadFilters: null,
        exclusivitySettings: null,
        volumeDiscounts: null
      }
    })

    console.log('✅ Created attorney dashboard')
    console.log(`   Dashboard ID: ${attorneyDashboard.id}`)

    console.log('\n🎯 Success! test@example.com is now registered as an attorney.')
    console.log('\n📋 Summary:')
    console.log(`   User: ${user.email}`)
    console.log(`   Attorney: ${attorney.name} (ID: ${attorney.id})`)
    console.log(`   Profile: Created (ID: ${attorneyProfile.id})`)
    console.log(`   Dashboard: Created (ID: ${attorneyDashboard.id})`)
    console.log('\n✅ You can now log in to the Attorney Dashboard!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAttorneyForTestUser()
