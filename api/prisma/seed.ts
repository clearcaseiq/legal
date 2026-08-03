import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Upsert attorneys by email — avoids FK violations from dependent tables
  // while ensuring the seed data is always current.

  const mkMeta = (bio: string, edu: string[], certs: string[], phone: string, email: string, website: string, outcomes: { trials: number; settlements: number; median_recovery: number }, fee: { contingency_min: number; contingency_max: number }) =>
    JSON.stringify({ bio, education: edu, certifications: certs, contact: { phone, email, website }, outcomes, fee })

  const attorneys = [
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@lawfirm.com',
      phone: '(555) 123-4567',
      specialties: JSON.stringify(['auto', 'slip_and_fall', 'workplace_injury']),
      venues: JSON.stringify(['CA', 'NY']),
      profile: JSON.stringify({
        experience: '15 years', education: ['JD, Stanford Law School', 'BA, UC Berkeley'], languages: ['English', 'Spanish'],
        barNumber: 'CA123456', firm: 'Johnson & Associates', address: '123 Legal St, Los Angeles, CA 90210',
        website: 'https://sarahjohnsonlaw.com', description: 'Experienced personal injury attorney with 15 years of practice.',
        achievements: ['Super Lawyers Rising Star 2020-2023', 'Million Dollar Advocates Forum', 'AVVO Rating: 10/10'],
        verdicts: [{ case: 'Auto Accident', amount: 2500000, year: 2022 }, { case: 'Premises Liability', amount: 1800000, year: 2021 }],
        photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
        consultationTypes: ['in_person', 'phone', 'video'], freeConsultation: true, consultationDuration: 30
      }),
      meta: mkMeta('Experienced personal injury attorney with 15 years of practice.', ['JD, Stanford Law School', 'BA, UC Berkeley'], ['Board Certified PI Specialist'], '(555) 123-4567', 'sarah.johnson@lawfirm.com', 'https://sarahjohnsonlaw.com', { trials: 25, settlements: 150, median_recovery: 180000 }, { contingency_min: 0.33, contingency_max: 0.40 }),
      isVerified: true, responseTimeHours: 4, averageRating: 4.8, totalReviews: 47
    },
    {
      name: 'Michael Chen',
      specialties: JSON.stringify(['medmal', 'product', 'wrongful_death']),
      venues: JSON.stringify(['CA', 'TX']),
      meta: mkMeta('Medical malpractice specialist with extensive trial experience.', ['JD, Harvard Law School', 'MD, Johns Hopkins'], ['Medical Malpractice Specialist', 'Board Certified Trial Attorney'], '(555) 234-5678', 'mchen@malpracticelaw.com', 'https://chenmalpractice.com', { trials: 45, settlements: 200, median_recovery: 350000 }, { contingency_min: 0.30, contingency_max: 0.35 }),
      isVerified: true, responseTimeHours: 6, averageRating: 4.9, totalReviews: 62
    },
    {
      name: 'Maria Rodriguez',
      specialties: JSON.stringify(['auto', 'workplace_injury', 'catastrophic']),
      venues: JSON.stringify(['CA', 'TX', 'FL']),
      meta: mkMeta('Bilingual attorney specializing in auto accidents and workplace injuries.', ['JD, University of Texas Law', 'BA, Texas A&M'], ['Workers Compensation Specialist'], '(555) 345-6789', 'mrodriguez@workerslaw.com', 'https://rodriguezworkerslaw.com', { trials: 15, settlements: 120, median_recovery: 95000 }, { contingency_min: 0.25, contingency_max: 0.33 }),
      isVerified: true, responseTimeHours: 3, averageRating: 4.6, totalReviews: 38
    },
    {
      name: 'David Thompson',
      specialties: JSON.stringify(['slip_and_fall', 'product', 'assault']),
      venues: JSON.stringify(['CA', 'NY']),
      meta: mkMeta('Premises liability and product liability expert with national recognition.', ['JD, Yale Law School', 'BA, Columbia University'], ['Product Liability Specialist', 'Premises Liability Expert'], '(555) 456-7890', 'dthompson@premiseslaw.com', 'https://thompsonpremises.com', { trials: 35, settlements: 180, median_recovery: 220000 }, { contingency_min: 0.30, contingency_max: 0.40 }),
      isVerified: true, responseTimeHours: 8, averageRating: 4.7, totalReviews: 55
    },
    {
      name: 'Jennifer Lee',
      specialties: JSON.stringify(['medmal', 'auto', 'nursing_home_abuse']),
      venues: JSON.stringify(['CA', 'NY', 'NJ']),
      meta: mkMeta('Medical malpractice and auto accident attorney serving multiple states.', ['JD, NYU Law School', 'BA, Cornell University'], ['Medical Malpractice Specialist'], '(555) 567-8901', 'jlee@malpracticeauto.com', 'https://leemalpracticeauto.com', { trials: 20, settlements: 140, median_recovery: 165000 }, { contingency_min: 0.33, contingency_max: 0.40 }),
      isVerified: true, responseTimeHours: 5, averageRating: 4.5, totalReviews: 41
    },
    {
      name: 'Robert Martinez',
      specialties: JSON.stringify(['workplace_injury', 'auto', 'toxic']),
      venues: JSON.stringify(['CA', 'FL', 'GA']),
      meta: mkMeta('Workers compensation and auto accident attorney with 20 years experience.', ['JD, University of Florida Law', 'BA, Florida State'], ['Workers Compensation Specialist'], '(555) 678-9012', 'rmartinez@workersauto.com', 'https://martinezworkersauto.com', { trials: 18, settlements: 110, median_recovery: 85000 }, { contingency_min: 0.25, contingency_max: 0.33 }),
      isVerified: true, responseTimeHours: 4, averageRating: 4.4, totalReviews: 33
    },
    {
      name: 'Amanda Foster',
      specialties: JSON.stringify(['product', 'slip_and_fall', 'dog_bite']),
      venues: JSON.stringify(['CA', 'WA']),
      meta: mkMeta('Product liability and premises liability attorney with tech industry expertise.', ['JD, UC Berkeley Law', 'BS, Stanford University'], ['Product Liability Specialist'], '(555) 789-0123', 'afoster@productpremises.com', 'https://fosterproductpremises.com', { trials: 30, settlements: 160, median_recovery: 195000 }, { contingency_min: 0.30, contingency_max: 0.40 }),
      isVerified: true, responseTimeHours: 7, averageRating: 4.7, totalReviews: 44
    },
    {
      name: 'Daniel Park',
      specialties: JSON.stringify(['wrongful_death', 'catastrophic', 'auto']),
      venues: JSON.stringify(['CA', 'NV']),
      meta: mkMeta('Wrongful death and catastrophic injury litigator with a track record of multi-million dollar verdicts.', ['JD, UCLA School of Law', 'BA, USC'], ['Wrongful Death Specialist', 'Board Certified Civil Trial Advocate'], '(555) 890-1234', 'dpark@parklitigation.com', 'https://parklitigation.com', { trials: 40, settlements: 170, median_recovery: 420000 }, { contingency_min: 0.33, contingency_max: 0.40 }),
      isVerified: true, responseTimeHours: 6, averageRating: 4.9, totalReviews: 58
    },
    {
      name: 'Lisa Nguyen',
      specialties: JSON.stringify(['nursing_home_abuse', 'medmal', 'assault']),
      venues: JSON.stringify(['CA', 'OR']),
      meta: mkMeta('Elder abuse and nursing home neglect attorney who fights for the most vulnerable.', ['JD, USC Gould School of Law', 'BA, UCLA'], ['Elder Law Specialist'], '(555) 901-2345', 'lnguyen@elderrights.com', 'https://nguyenelderrights.com', { trials: 22, settlements: 130, median_recovery: 175000 }, { contingency_min: 0.30, contingency_max: 0.35 }),
      isVerified: true, responseTimeHours: 3, averageRating: 4.8, totalReviews: 49
    },
    {
      name: 'James Washington',
      specialties: JSON.stringify(['toxic', 'workplace_injury', 'product']),
      venues: JSON.stringify(['CA', 'AZ']),
      meta: mkMeta('Environmental and toxic tort attorney holding polluters and negligent employers accountable.', ['JD, Georgetown Law', 'MS Environmental Science, Caltech'], ['Environmental Law Specialist'], '(555) 012-3456', 'jwashington@toxictort.com', 'https://washingtontoxictort.com', { trials: 28, settlements: 95, median_recovery: 280000 }, { contingency_min: 0.33, contingency_max: 0.40 }),
      isVerified: true, responseTimeHours: 5, averageRating: 4.6, totalReviews: 36
    },
  ]

  for (const attorney of attorneys) {
    const email = attorney.email || `${attorney.name.toLowerCase().replace(/\s+/g, '.')}@seed.local`
    await prisma.attorney.upsert({
      where: { email },
      update: { ...attorney, email },
      create: { ...attorney, email },
    })
  }

  console.log(`Upserted ${attorneys.length} attorneys`)

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

    const profileData = {
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
        { caseType: 'Auto Accident', settlementAmount: 2500000, description: 'Multi-vehicle accident resulting in severe injuries', date: '2023-01-15', venue: 'Los Angeles County' },
        { caseType: 'Premises Liability', settlementAmount: 1800000, description: 'Slip and fall at commercial property', date: '2022-08-22', venue: 'Orange County' }
      ]),
      isFeatured: Math.random() > 0.7,
      boostLevel: Math.floor(Math.random() * 3),
      totalReviews: Math.floor(Math.random() * 100) + 20,
      averageRating: Math.floor(Math.random() * 20) + 80,
      jurisdictions: JSON.stringify(jurisdictions),
    }
    await prisma.attorneyProfile.upsert({
      where: { attorneyId: attorney.id },
      update: profileData,
      create: { attorneyId: attorney.id, ...profileData },
    })

    const dashData = {
      leadFilters: JSON.stringify({ caseTypes: ['auto_accident', 'slip_and_fall'], venues: ['CA'], minDamages: 10000, maxDistance: 50, languages: ['English', 'Spanish'] }),
      exclusivitySettings: JSON.stringify({ preferredAssignment: 'first_look', exclusiveLeads: true, sharedLeads: true }),
      totalLeadsReceived: Math.floor(Math.random() * 100) + 20,
      totalLeadsAccepted: Math.floor(Math.random() * 80) + 15,
      totalFeesCollected: Math.floor(Math.random() * 2000000) + 500000,
      totalPlatformSpend: Math.floor(Math.random() * 50000) + 10000,
      pricingModel: 'per_lead',
    }
    await prisma.attorneyDashboard.upsert({
      where: { attorneyId: attorney.id },
      update: dashData,
      create: { attorneyId: attorney.id, ...dashData },
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
