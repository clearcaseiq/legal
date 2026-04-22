/**
 * Create 100 sample assessments for California only, with varied case types.
 * Usage: pnpm run create:ca-cases
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CASE_TYPES = [
  'auto',
  'slip_and_fall',
  'dog_bite',
  'medmal',
  'product',
  'nursing_home_abuse',
  'wrongful_death',
  'high_severity_surgery'
] as const

const CA_COUNTIES = [
  'Los Angeles', 'San Diego', 'Orange', 'Riverside', 'San Bernardino',
  'Santa Clara', 'Alameda', 'Sacramento', 'Contra Costa', 'Fresno',
  'Kern', 'Ventura', 'San Francisco', 'San Mateo', 'Stanislaus',
  'Sonoma', 'Tulare', 'Santa Barbara', 'Solano', 'Monterey'
]

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee']

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function generateCaseFacts(
  claimType: string,
  county: string,
  incidentDate: Date,
  firstName: string,
  lastName: string,
  caseNum: number
): Record<string, unknown> {
  const baseDate = new Date(incidentDate)
  const dateStr = baseDate.toISOString().split('T')[0]

  const narratives: Record<string, { location: string; narrative: string; parties: string[]; fault: string; evidence: string[] }> = {
    auto: {
      location: `${1000 + caseNum} Main St, ${county}, CA`,
      narrative: `Rear-end collision at traffic light. ${firstName} was stopped when another vehicle failed to stop.`,
      parties: [`${firstName} ${lastName} (plaintiff)`, 'Other Driver (defendant)'],
      fault: 'other_party',
      evidence: ['Police report', 'Witness statements', 'Vehicle damage photos']
    },
    slip_and_fall: {
      location: `${randomElement(['Grocery Store', 'Restaurant', 'Mall'])} - ${county}, CA`,
      narrative: `Slipped on wet floor without warning signs. ${firstName} fell and injured wrist and hip.`,
      parties: [`${firstName} ${lastName} (plaintiff)`, 'Store (defendant)'],
      fault: 'premises_owner',
      evidence: ['Surveillance footage', 'Witness statements', 'Incident report']
    },
    dog_bite: {
      location: `Neighbor's property - ${county}, CA`,
      narrative: `Neighbor's dog escaped and attacked ${firstName} while walking. Deep puncture wounds requiring stitches.`,
      parties: [`${firstName} ${lastName} (plaintiff)`, 'Neighbor (defendant)'],
      fault: 'dog_owner',
      evidence: ['Animal control report', 'Medical records', 'Photos of injuries']
    },
    medmal: {
      location: `${randomElement(['City Hospital', 'Medical Center'])} - ${county}, CA`,
      narrative: `Surgical error during procedure. ${firstName} required corrective surgery and extended recovery.`,
      parties: [`${firstName} ${lastName} (plaintiff)`, 'Surgeon (defendant)', 'Hospital (defendant)'],
      fault: 'medical_provider',
      evidence: ['Medical records', 'Surgical reports', 'Expert opinions']
    },
    product: {
      location: `${firstName}'s home - ${county}, CA`,
      narrative: `Defective product caused ${randomElement(['burns', 'lacerations', 'electrical shock'])}.`,
      parties: [`${firstName} ${lastName} (plaintiff)`, 'Manufacturer (defendant)'],
      fault: 'product_manufacturer',
      evidence: ['Product defect docs', 'Medical records', 'Expert reports']
    },
    nursing_home_abuse: {
      location: `${randomElement(['Sunset', 'Golden', 'Maple'])} Nursing Home - ${county}, CA`,
      narrative: `Neglect and ${randomElement(['bedsores', 'falls', 'medication errors'])} while in facility care.`,
      parties: [`${firstName} ${lastName} (plaintiff)`, 'Nursing Home (defendant)'],
      fault: 'nursing_home',
      evidence: ['Medical records', 'Facility records', 'State inspection reports']
    },
    wrongful_death: {
      location: `${randomElement(['Highway', 'Intersection', 'Workplace'])} - ${county}, CA`,
      narrative: `Wrongful death of ${firstName}'s ${randomElement(['spouse', 'parent', 'child'])} in ${randomElement(['car accident', 'workplace accident'])}.`,
      parties: [`${firstName} ${lastName} (plaintiff)`, 'At-Fault Party (defendant)'],
      fault: 'other_party',
      evidence: ['Death certificate', 'Police report', 'Medical records']
    },
    high_severity_surgery: {
      location: `Medical Center - ${county}, CA`,
      narrative: `${randomElement(['Spinal', 'Cardiac', 'Neurological'])} surgery with complications requiring extended care.`,
      parties: [`${firstName} ${lastName} (plaintiff)`, 'Surgeon (defendant)', 'Hospital (defendant)'],
      fault: 'medical_provider',
      evidence: ['Surgical records', 'Medical records', 'Expert opinions']
    }
  }

  const n = narratives[claimType] || narratives.auto
  const medCharges = 5000 + Math.floor(Math.random() * 45000)
  const wageLoss = Math.floor(Math.random() * 15000)

  return {
    claimType,
    venue: { state: 'CA', county },
    incident: {
      date: dateStr,
      location: n.location,
      narrative: n.narrative,
      parties: n.parties
    },
    liability: { fault: n.fault, evidence: n.evidence, notes: 'Liability established.' },
    injuries: [{ type: 'injury', severity: 2 + Math.floor(Math.random() * 2), description: 'Documented injury', diagnosed: true, ongoing: true, date: dateStr }],
    treatment: [
      { date: dateStr, provider: 'Emergency Room', type: 'emergency', diagnosis: 'Initial treatment', treatment: 'Evaluation and care', charges: Math.floor(medCharges * 0.3) },
      { date: dateStr, provider: 'Dr. Specialist', type: 'specialist', diagnosis: 'Follow-up', treatment: 'Ongoing care', charges: Math.floor(medCharges * 0.7) }
    ],
    damages: {
      med_charges: medCharges,
      med_paid: Math.floor(medCharges * 0.3),
      wage_loss: wageLoss,
      services: Math.floor(Math.random() * 2000) + 500
    },
    insurance: {
      at_fault_party: randomElement(['State Farm', 'Allstate', 'Progressive', 'Geico', 'Farmers']),
      policy_limit: 25000 + Math.floor(Math.random() * 975000),
      own_insurance: randomElement(['Aetna', 'Blue Cross', 'Cigna', 'Kaiser']),
      uninsured: false
    },
    consents: { tos: true, privacy: true, ml_use: true, hipaa: true }
  }
}

async function main() {
  console.log('Creating 100 California-only sample assessments (varied case types)...\n')

  let user = await prisma.user.findFirst({ where: { role: 'client' } })
  if (!user) {
    const passwordHash = await bcrypt.hash('password1234', 12)
    user = await prisma.user.create({
      data: {
        email: 'sample.client@example.com',
        passwordHash,
        firstName: 'Sample',
        lastName: 'Client',
        phone: '(555) 000-0000',
        role: 'client',
        isActive: true,
        emailVerified: true
      }
    })
    console.log('Created sample user: sample.client@example.com (password: password1234)\n')
  }

  const startDate = new Date(2023, 0, 1)
  const endDate = new Date(2024, 11, 31)
  const typeCounts: Record<string, number> = {}

  for (let i = 0; i < 100; i++) {
    const claimType = randomElement([...CASE_TYPES])
    const county = randomElement(CA_COUNTIES)
    const firstName = randomElement(FIRST_NAMES)
    const lastName = randomElement(LAST_NAMES)
    const incidentDate = randomDate(startDate, endDate)
    const facts = generateCaseFacts(claimType, county, incidentDate, firstName, lastName, i + 1)

    await prisma.assessment.create({
      data: {
        userId: user!.id,
        claimType,
        venueState: 'CA',
        venueCounty: county,
        status: i < 80 ? 'COMPLETED' : (i < 90 ? 'SUBMITTED' : 'DRAFT'),
        facts: JSON.stringify(facts)
      }
    })

    typeCounts[claimType] = (typeCounts[claimType] || 0) + 1
  }

  console.log('Created 100 assessments:\n')
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }
  console.log('\n✅ Done! All 100 cases are in California.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
