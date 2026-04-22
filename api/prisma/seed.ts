import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.attorneyAvailability.deleteMany()
  await prisma.attorneyReview.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.attorney.deleteMany()

  // Create sample attorneys with enhanced profiles
  const attorneys = [
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@lawfirm.com',
      phone: '(555) 123-4567',
      specialties: JSON.stringify(['auto', 'premises']),
      venues: JSON.stringify(['CA', 'NY']),
      profile: JSON.stringify({
        experience: '15 years',
        education: ['JD, Stanford Law School', 'BA, UC Berkeley'],
        languages: ['English', 'Spanish'],
        barNumber: 'CA123456',
        firm: 'Johnson & Associates',
        address: '123 Legal St, Los Angeles, CA 90210',
        website: 'https://sarahjohnsonlaw.com',
        description: 'Experienced personal injury attorney with 15 years of practice.',
        achievements: [
          'Super Lawyers Rising Star 2020-2023',
          'Million Dollar Advocates Forum',
          'AVVO Rating: 10/10'
        ],
        verdicts: [
          { case: 'Auto Accident', amount: 2500000, year: 2022 },
          { case: 'Premises Liability', amount: 1800000, year: 2021 }
        ],
        photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
        consultationTypes: ['in_person', 'phone', 'video'],
        freeConsultation: true,
        consultationDuration: 30
      }),
      meta: JSON.stringify({
        bio: 'Experienced personal injury attorney with 15 years of practice.',
        education: ['JD, Stanford Law School', 'BA, UC Berkeley'],
        certifications: ['Board Certified Personal Injury Specialist'],
        contact: {
          phone: '(555) 123-4567',
          email: 'sarah.johnson@lawfirm.com',
          website: 'https://sarahjohnsonlaw.com'
        },
        outcomes: {
          trials: 25,
          settlements: 150,
          median_recovery: 180000
        },
        fee: { contingency_min: 0.33, contingency_max: 0.40 }
      }),
      isVerified: true,
      responseTimeHours: 4,
      averageRating: 4.8,
      totalReviews: 47
    },
    {
      name: 'Michael Chen',
      specialties: JSON.stringify(['medmal', 'product']),
      venues: JSON.stringify(['CA', 'TX']),
      meta: JSON.stringify({
        bio: 'Medical malpractice specialist with extensive trial experience.',
        education: ['JD, Harvard Law School', 'MD, Johns Hopkins'],
        certifications: ['Medical Malpractice Specialist', 'Board Certified Trial Attorney'],
        contact: {
          phone: '(555) 234-5678',
          email: 'mchen@malpracticelaw.com',
          website: 'https://chenmalpractice.com'
        },
        outcomes: {
          trials: 45,
          settlements: 200,
          median_recovery: 350000
        },
        fee: { contingency_min: 0.30, contingency_max: 0.35 }
      })
    },
    {
      name: 'Maria Rodriguez',
      specialties: JSON.stringify(['auto', 'workers']),
      venues: JSON.stringify(['TX', 'FL']),
      meta: JSON.stringify({
        bio: 'Bilingual attorney specializing in auto accidents and workers compensation.',
        education: ['JD, University of Texas Law', 'BA, Texas A&M'],
        certifications: ['Workers Compensation Specialist'],
        contact: {
          phone: '(555) 345-6789',
          email: 'mrodriguez@workerslaw.com',
          website: 'https://rodriguezworkerslaw.com'
        },
        outcomes: {
          trials: 15,
          settlements: 120,
          median_recovery: 95000
        },
        fee: { contingency_min: 0.25, contingency_max: 0.33 }
      })
    },
    {
      name: 'David Thompson',
      specialties: JSON.stringify(['premises', 'product']),
      venues: JSON.stringify(['NY', 'CA']),
      meta: JSON.stringify({
        bio: 'Premises liability and product liability expert with national recognition.',
        education: ['JD, Yale Law School', 'BA, Columbia University'],
        certifications: ['Product Liability Specialist', 'Premises Liability Expert'],
        contact: {
          phone: '(555) 456-7890',
          email: 'dthompson@premiseslaw.com',
          website: 'https://thompsonpremises.com'
        },
        outcomes: {
          trials: 35,
          settlements: 180,
          median_recovery: 220000
        },
        fee: { contingency_min: 0.30, contingency_max: 0.40 }
      })
    },
    {
      name: 'Jennifer Lee',
      specialties: JSON.stringify(['medmal', 'auto']),
      venues: JSON.stringify(['NY', 'NJ']),
      meta: JSON.stringify({
        bio: 'Medical malpractice and auto accident attorney serving the tri-state area.',
        education: ['JD, NYU Law School', 'BA, Cornell University'],
        certifications: ['Medical Malpractice Specialist'],
        contact: {
          phone: '(555) 567-8901',
          email: 'jlee@malpracticeauto.com',
          website: 'https://leemalpracticeauto.com'
        },
        outcomes: {
          trials: 20,
          settlements: 140,
          median_recovery: 165000
        },
        fee: { contingency_min: 0.33, contingency_max: 0.40 }
      })
    },
    {
      name: 'Robert Martinez',
      specialties: JSON.stringify(['workers', 'auto']),
      venues: JSON.stringify(['FL', 'GA']),
      meta: JSON.stringify({
        bio: 'Workers compensation and auto accident attorney with 20 years experience.',
        education: ['JD, University of Florida Law', 'BA, Florida State'],
        certifications: ['Workers Compensation Specialist'],
        contact: {
          phone: '(555) 678-9012',
          email: 'rmartinez@workersauto.com',
          website: 'https://martinezworkersauto.com'
        },
        outcomes: {
          trials: 18,
          settlements: 110,
          median_recovery: 85000
        },
        fee: { contingency_min: 0.25, contingency_max: 0.33 }
      })
    },
    {
      name: 'Amanda Foster',
      specialties: JSON.stringify(['product', 'premises']),
      venues: JSON.stringify(['CA', 'WA']),
      meta: JSON.stringify({
        bio: 'Product liability and premises liability attorney with tech industry expertise.',
        education: ['JD, UC Berkeley Law', 'BS, Stanford University'],
        certifications: ['Product Liability Specialist'],
        contact: {
          phone: '(555) 789-0123',
          email: 'afoster@productpremises.com',
          website: 'https://fosterproductpremises.com'
        },
        outcomes: {
          trials: 30,
          settlements: 160,
          median_recovery: 195000
        },
        fee: { contingency_min: 0.30, contingency_max: 0.40 }
      })
    }
  ]

  for (const attorney of attorneys) {
    await prisma.attorney.create({
      data: attorney
    })
  }

  console.log(`Created ${attorneys.length} attorneys`)

  // Create a sample assessment for testing
  const sampleAssessment = await prisma.assessment.create({
    data: {
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      status: 'DRAFT',
        facts: JSON.stringify({
        claimType: 'auto',
        venue: { state: 'CA', county: 'Los Angeles' },
        incident: {
          date: '2024-01-15',
          location: 'Intersection of Main St and 1st Ave, Los Angeles, CA',
          narrative: 'Client was rear-ended while stopped at a red light. Other driver was texting and failed to brake in time.',
          parties: ['Client (plaintiff)', 'Other driver (defendant)', 'Insurance company']
        },
        injuries: [
          {
            type: 'whiplash',
            severity: 'moderate',
            description: 'Neck and back pain with limited range of motion'
          }
        ],
        treatment: [
          {
            provider: 'Emergency Room',
            date: '2024-01-15',
            diagnosis: 'Cervical strain, lumbar strain',
            treatment: 'Pain medication, physical therapy referral'
          }
        ],
        damages: {
          med_charges: 8500,
          med_paid: 3200,
          wage_loss: 2400,
          services: 800
        },
        insurance: {
          client_insurance: 'State Farm',
          other_party_insurance: 'Progressive'
        },
        consents: {
          tos: true,
          privacy: true,
          ml_use: true,
          hipaa: true
        }
      })
    }
  })

  console.log(`Created sample assessment: ${sampleAssessment.id}`)

  // Create attorney availability for the first attorney
  const availabilityData = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Monday
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Tuesday
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Wednesday
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Thursday
    { dayOfWeek: 5, startTime: '09:00', endTime: '15:00', isAvailable: true }, // Friday
    { dayOfWeek: 6, startTime: '10:00', endTime: '14:00', isAvailable: true }, // Saturday
    { dayOfWeek: 0, startTime: '10:00', endTime: '14:00', isAvailable: false } // Sunday
  ]

  // Get the first attorney from the database
  const firstAttorney = await prisma.attorney.findFirst()
  
  if (firstAttorney) {
    for (const availability of availabilityData) {
      await prisma.attorneyAvailability.create({
        data: {
          attorneyId: firstAttorney.id,
          ...availability
        }
      })
    }
  }

  console.log('Created attorney availability')

  // Create sample medical providers
  await prisma.medicalProvider.createMany({
    data: [
      {
        name: 'Dr. Michael Chen',
        specialty: 'Orthopedics',
        address: '456 Medical Center Dr',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        phone: '(555) 987-6543',
        email: 'dr.chen@ortho.com',
        acceptsLien: true,
        lienTerms: JSON.stringify({
          rate: 15,
          terms: 'Payment due upon settlement or verdict',
          minimumAmount: 10000
        }),
        averageLienRate: 15,
        isVerified: true,
        rating: 4.8,
        totalReviews: 156,
        serviceRadius: 25
      },
      {
        name: 'Dr. Maria Rodriguez',
        specialty: 'Physical Therapy',
        address: '789 Rehab St',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90211',
        phone: '(555) 456-7890',
        email: 'dr.rodriguez@pt.com',
        acceptsLien: true,
        lienTerms: JSON.stringify({
          rate: 12,
          terms: 'Payment due upon settlement',
          minimumAmount: 5000
        }),
        averageLienRate: 12,
        isVerified: true,
        rating: 4.9,
        totalReviews: 89,
        serviceRadius: 30
      },
      {
        name: 'Dr. James Wilson',
        specialty: 'Chiropractic',
        address: '321 Wellness Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90212',
        phone: '(555) 234-5678',
        email: 'dr.wilson@chiro.com',
        acceptsLien: false,
        isVerified: true,
        rating: 4.6,
        totalReviews: 67,
        serviceRadius: 20
      }
    ]
  })

  console.log('Created medical providers')

  // Create attorney profiles for existing attorneys
  const createdAttorneys = await prisma.attorney.findMany()
  
  for (const attorney of createdAttorneys) {
    let jurisdictions: Array<{ state: string; counties: string[]; cities: string[] }> = []
    try {
      const venues = attorney.venues ? JSON.parse(attorney.venues) as string[] : []
      jurisdictions = venues
        .filter((state): state is string => typeof state === 'string' && state.length > 0)
        .map((state) => ({ state, counties: [], cities: [] }))
    } catch {
      jurisdictions = []
    }

    await prisma.attorneyProfile.create({
      data: {
        attorneyId: attorney.id,
        bio: 'Experienced personal injury attorney dedicated to helping clients get the compensation they deserve.',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        specialties: JSON.stringify(['Personal Injury', 'Auto Accidents', 'Premises Liability']),
        languages: JSON.stringify(['English', 'Spanish']),
        yearsExperience: Math.floor(Math.random() * 20) + 5,
        totalCases: Math.floor(Math.random() * 500) + 100,
        totalSettlements: Math.floor(Math.random() * 50000000) + 10000000,
        averageSettlement: Math.floor(Math.random() * 500000) + 100000,
        successRate: Math.floor(Math.random() * 20) + 80,
        verifiedVerdicts: JSON.stringify([
          {
            caseType: 'Auto Accident',
            settlementAmount: 2500000,
            description: 'Multi-vehicle accident resulting in severe injuries',
            date: '2023-01-15',
            venue: 'Los Angeles County'
          },
          {
            caseType: 'Premises Liability',
            settlementAmount: 1800000,
            description: 'Slip and fall at commercial property',
            date: '2022-08-22',
            venue: 'Orange County'
          }
        ]),
        isFeatured: Math.random() > 0.7,
        boostLevel: Math.floor(Math.random() * 3),
        totalReviews: Math.floor(Math.random() * 100) + 20,
        averageRating: Math.floor(Math.random() * 20) + 80,
        jurisdictions: JSON.stringify(jurisdictions),
      }
    })

    // Create attorney dashboard
    await prisma.attorneyDashboard.create({
      data: {
        attorneyId: attorney.id,
        leadFilters: JSON.stringify({
          caseTypes: ['auto_accident', 'slip_and_fall'],
          venues: ['CA'],
          minDamages: 10000,
          maxDistance: 50,
          languages: ['English', 'Spanish']
        }),
        exclusivitySettings: JSON.stringify({
          preferredAssignment: 'first_look',
          exclusiveLeads: true,
          sharedLeads: true
        }),
        totalLeadsReceived: Math.floor(Math.random() * 100) + 20,
        totalLeadsAccepted: Math.floor(Math.random() * 80) + 15,
        totalFeesCollected: Math.floor(Math.random() * 2000000) + 500000,
        totalPlatformSpend: Math.floor(Math.random() * 50000) + 10000,
        pricingModel: 'per_lead'
      }
    })
  }

  console.log('Created attorney profiles and dashboards')

  // Settlement repository - benchmark data for case valuation
  const claimTypes = ['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death']
  const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH']
  const settlementRecords: Array<{
    claimType: string
    venueState: string
    venueCounty: string | null
    injurySeverity: number | null
    settlementAmount: number
    medCharges: number | null
    wageLoss: number | null
    treatmentMonths: number | null
    source: string
  }> = []

  for (const claimType of claimTypes) {
    for (const state of states) {
      for (let sev = 0; sev <= 4; sev++) {
        const base = claimType === 'wrongful_death' ? 500000 : claimType === 'medmal' ? 200000 : 50000
        const mult = 0.5 + Math.random() * 2
        const amount = Math.round(base * (1 + sev * 0.5) * mult)
        settlementRecords.push({
          claimType,
          venueState: state,
          venueCounty: null,
          injurySeverity: sev,
          settlementAmount: amount,
          medCharges: Math.round(amount * (0.2 + Math.random() * 0.3)),
          wageLoss: Math.random() > 0.5 ? Math.round(amount * 0.1) : null,
          treatmentMonths: Math.floor(Math.random() * 24) + 1,
          source: 'anonymized'
        })
      }
    }
  }

  const existing = await prisma.settlementRecord.count()
  if (existing === 0) {
    await prisma.settlementRecord.createMany({
      data: settlementRecords
    })
    console.log(`Created ${settlementRecords.length} settlement benchmark records`)
  } else {
    console.log(`Settlement records already exist (${existing}), skipping`)
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
