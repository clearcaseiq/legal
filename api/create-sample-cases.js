import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createSampleCases() {
  try {
    console.log('Creating 3 sample cases...')

    // Find the first user, or create one if none exists
    let user = await prisma.user.findFirst()
    
    if (!user) {
      console.log('No user found, creating a sample user...')
      user = await prisma.user.create({
        data: {
          email: 'sample.user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '(555) 123-4567',
          passwordHash: 'dummy', // Not used for sample data
          isActive: true,
          emailVerified: true
        }
      })
      console.log('Created user:', user.email)
    } else {
      console.log('Using existing user:', user.email)
    }

    // Sample case 1: Auto Accident
    const case1 = {
      userId: user.id,
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      status: 'COMPLETED',
      facts: JSON.stringify({
        claimType: 'auto',
        venue: { state: 'CA', county: 'Los Angeles' },
        incident: {
          date: '2024-01-15',
          location: 'Intersection of Sunset Blvd and Vine St, Los Angeles, CA',
          narrative: 'Rear-end collision at traffic light. Other driver failed to stop and hit my vehicle from behind. I was stopped at a red light when the accident occurred.',
          parties: ['John Doe (plaintiff)', 'Jane Smith (defendant driver)']
        },
        liability: {
          fault: 'other_party',
          evidence: ['Police report', 'Witness statements', 'Traffic camera footage'],
          notes: 'Clear liability - defendant admitted fault at scene'
        },
        injuries: [
          {
            type: 'neck',
            severity: 3,
            description: 'Whiplash and cervical strain',
            diagnosed: true,
            ongoing: true
          },
          {
            type: 'back',
            severity: 2,
            description: 'Lower back pain and stiffness',
            diagnosed: true,
            ongoing: true
          }
        ],
        treatment: [
          {
            provider: 'Dr. Smith, Chiropractor',
            type: 'chiropractic',
            visits: 12,
            startDate: '2024-01-20',
            ongoing: false
          },
          {
            provider: 'Physical Therapy Center',
            type: 'physical_therapy',
            visits: 8,
            startDate: '2024-02-01',
            ongoing: false
          }
        ],
        damages: {
          med_charges: 8500,
          med_paid: 0,
          wage_loss: 3200,
          services: 500
        },
        insurance: {
          at_fault_party: 'State Farm',
          policy_limit: 25000,
          own_insurance: 'Geico',
          uninsured: false
        },
        consents: {
          tos: true,
          privacy: true,
          ml_use: true,
          hipaa: true
        }
      })
    }

    // Sample case 2: Slip and Fall
    const case2 = {
      userId: user.id,
      claimType: 'slip_and_fall',
      venueState: 'NY',
      venueCounty: 'Manhattan',
      status: 'COMPLETED',
      facts: JSON.stringify({
        claimType: 'slip_and_fall',
        venue: { state: 'NY', county: 'Manhattan' },
        incident: {
          date: '2024-02-10',
          location: 'Grocery Store - 123 Main St, New York, NY',
          narrative: 'Slipped on wet floor in grocery store aisle. Store had recently mopped but failed to put up warning signs. Fell and injured my wrist and hip.',
          parties: ['John Doe (plaintiff)', 'ABC Grocery Store (defendant)']
        },
        liability: {
          fault: 'premises_owner',
          evidence: ['Store surveillance footage', 'Witness statements', 'Incident report'],
          notes: 'Store employee confirmed floor was just mopped without warning signs'
        },
        injuries: [
          {
            type: 'wrist',
            severity: 2,
            description: 'Sprained wrist, possible fracture',
            diagnosed: true,
            ongoing: false
          },
          {
            type: 'hip',
            severity: 2,
            description: 'Hip contusion and bruising',
            diagnosed: true,
            ongoing: false
          }
        ],
        treatment: [
          {
            provider: 'Emergency Room - NYU Hospital',
            type: 'emergency',
            visits: 1,
            startDate: '2024-02-10',
            ongoing: false
          },
          {
            provider: 'Dr. Johnson, Orthopedist',
            type: 'specialist',
            visits: 3,
            startDate: '2024-02-15',
            ongoing: false
          }
        ],
        damages: {
          med_charges: 12000,
          med_paid: 2000,
          wage_loss: 1500,
          services: 300
        },
        insurance: {
          at_fault_party: 'Store Insurance - Commercial General Liability',
          policy_limit: 100000,
          own_insurance: 'Aetna',
          uninsured: false
        },
        consents: {
          tos: true,
          privacy: true,
          ml_use: true,
          hipaa: true
        }
      })
    }

    // Sample case 3: Dog Bite
    const case3 = {
      userId: user.id,
      claimType: 'dog_bite',
      venueState: 'FL',
      venueCounty: 'Miami-Dade',
      status: 'DRAFT',
      facts: JSON.stringify({
        claimType: 'dog_bite',
        venue: { state: 'FL', county: 'Miami-Dade' },
        incident: {
          date: '2024-03-05',
          location: 'Neighbor\'s yard - 456 Oak St, Miami, FL',
          narrative: 'Neighbor\'s dog escaped from their yard and bit me while I was walking on the sidewalk. The dog had a history of aggressive behavior. Required emergency medical treatment and stitches.',
          parties: ['John Doe (plaintiff)', 'Neighbor - Bob Johnson (defendant owner)']
        },
        liability: {
          fault: 'dog_owner',
          evidence: ['Animal control report', 'Medical records', 'Photos of injuries'],
          notes: 'Dog owner was aware of dog\'s aggressive tendencies'
        },
        injuries: [
          {
            type: 'arm',
            severity: 3,
            description: 'Deep puncture wounds requiring stitches',
            diagnosed: true,
            ongoing: true
          },
          {
            type: 'emotional',
            severity: 2,
            description: 'Anxiety and fear of dogs',
            diagnosed: false,
            ongoing: true
          }
        ],
        treatment: [
          {
            provider: 'Emergency Room - Miami General Hospital',
            type: 'emergency',
            visits: 1,
            startDate: '2024-03-05',
            ongoing: false
          },
          {
            provider: 'Dr. Martinez, Primary Care',
            type: 'primary_care',
            visits: 2,
            startDate: '2024-03-07',
            ongoing: false
          },
          {
            provider: 'Counseling Services',
            type: 'mental_health',
            visits: 4,
            startDate: '2024-03-10',
            ongoing: true
          }
        ],
        damages: {
          med_charges: 6500,
          med_paid: 500,
          wage_loss: 800,
          services: 200
        },
        insurance: {
          at_fault_party: 'Homeowner\'s Insurance - State Farm',
          policy_limit: 50000,
          own_insurance: 'Blue Cross',
          uninsured: false
        },
        consents: {
          tos: true,
          privacy: true,
          ml_use: true,
          hipaa: true
        }
      })
    }

    // Create the assessments
    const assessment1 = await prisma.assessment.create({ data: case1 })
    const assessment2 = await prisma.assessment.create({ data: case2 })
    const assessment3 = await prisma.assessment.create({ data: case3 })

    console.log('Created assessment 1 (Auto Accident):', assessment1.id)
    console.log('Created assessment 2 (Slip and Fall):', assessment2.id)
    console.log('Created assessment 3 (Dog Bite):', assessment3.id)

    // Create predictions for completed cases
    const prediction1 = await prisma.prediction.create({
      data: {
        assessmentId: assessment1.id,
        modelVersion: 'v1.0',
        viability: JSON.stringify({
          overall: 0.85,
          liability: 0.90,
          causation: 0.80,
          damages: 0.85
        }),
        bands: JSON.stringify({
          low: 15000,
          mid: 25000,
          high: 40000
        }),
        explain: JSON.stringify({
          strengths: ['Clear liability', 'Documented injuries', 'Ongoing treatment'],
          concerns: ['Policy limits may cap recovery'],
          factors: ['Strong evidence of fault', 'Reasonable medical expenses', 'Lost wages documented']
        })
      }
    })

    const prediction2 = await prisma.prediction.create({
      data: {
        assessmentId: assessment2.id,
        modelVersion: 'v1.0',
        viability: JSON.stringify({
          overall: 0.75,
          liability: 0.80,
          causation: 0.70,
          damages: 0.75
        }),
        bands: JSON.stringify({
          low: 20000,
          mid: 35000,
          high: 55000
        }),
        explain: JSON.stringify({
          strengths: ['Premises liability clear', 'Surveillance evidence', 'Medical treatment documented'],
          concerns: ['Injuries may be considered minor'],
          factors: ['Store negligence established', 'Medical bills reasonable', 'Some lost wages']
        })
      }
    })

    console.log('Created predictions for cases 1 and 2')
    console.log('\n✅ Successfully created 3 sample cases!')
    console.log(`   User: ${user.email}`)
    console.log(`   Case 1: Auto Accident (CA) - ${assessment1.id}`)
    console.log(`   Case 2: Slip and Fall (NY) - ${assessment2.id}`)
    console.log(`   Case 3: Dog Bite (FL) - ${assessment3.id}`)

  } catch (error) {
    console.error('Error creating sample cases:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createSampleCases()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })
