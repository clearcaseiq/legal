import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listSampleCases() {
  try {
    console.log('Finding the 10 sample cases...\n')

    // Find assessments for the sample users (sample.user1@example.com through sample.user10@example.com)
    const sampleEmails = Array.from({ length: 10 }, (_, i) => `sample.user${i + 1}@example.com`)
    
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: sampleEmails
        }
      },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (users.length === 0) {
      console.log('❌ No sample users found.')
      console.log('   The 10 sample cases may not have been created yet.')
      console.log('   Run: node create-10-sample-cases.js')
      return
    }

    console.log(`✅ Found ${users.length} sample users with cases:\n`)

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.firstName} ${user.lastName})`)
      console.log(`   Password: password123`)
      console.log(`   Cases: ${user.assessments.length}`)
      
      user.assessments.forEach((assessment, caseIndex) => {
        const facts = JSON.parse(assessment.facts || '{}')
        console.log(`      Case ${caseIndex + 1}:`)
        console.log(`        ID: ${assessment.id}`)
        console.log(`        Type: ${assessment.claimType}`)
        console.log(`        Location: ${assessment.venueCounty}, ${assessment.venueState}`)
        console.log(`        Status: ${assessment.status}`)
        if (facts.incident?.date) {
          console.log(`        Incident Date: ${facts.incident.date}`)
        }
      })
      console.log('')
    })

    // Also list all assessments created by these users
    const allAssessments = await prisma.assessment.findMany({
      where: {
        userId: {
          in: users.map(u => u.id)
        }
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`\n📊 Total Cases Found: ${allAssessments.length}\n`)
    console.log('📋 All Cases Summary:')
    console.log('─'.repeat(80))
    allAssessments.forEach((assessment, index) => {
      const facts = JSON.parse(assessment.facts || '{}')
      console.log(`${index + 1}. ${assessment.claimType}`)
      console.log(`   User: ${assessment.user.email} (${assessment.user.firstName} ${assessment.user.lastName})`)
      console.log(`   Location: ${assessment.venueCounty}, ${assessment.venueState}`)
      console.log(`   Status: ${assessment.status}`)
      console.log(`   Assessment ID: ${assessment.id}`)
      if (facts.incident?.date) {
        console.log(`   Incident Date: ${facts.incident.date}`)
      }
      console.log('')
    })

    console.log('\n💡 To view these cases:')
    console.log('   1. Log in as one of the sample users (e.g., sample.user1@example.com)')
    console.log('   2. Go to the Dashboard or Case Tracker page')
    console.log('   3. Or use the API: GET /v1/assessments (with authentication)')
    console.log('\n🔑 Login Credentials:')
    users.forEach((user) => {
      console.log(`   Email: ${user.email} | Password: password123`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listSampleCases()
