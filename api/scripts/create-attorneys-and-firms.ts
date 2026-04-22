/**
 * Create 100 attorneys and 25 law firms, assigning attorneys to firms.
 * Usage: pnpm run create:attorneys-firms
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PI_CASE_TYPES = [
  'auto', 'slip_and_fall', 'dog_bite', 'premises', 'motorcycle',
  'pedestrian', 'nursing_home_abuse', 'wrongful_death', 'product',
  'medmal', 'construction', 'commercial_vehicle'
]

const FIRM_NAME_PATTERNS = [
  '{name} & Associates',
  '{name} Law Group',
  '{name} Legal',
  'The {name} Firm',
  '{name} Injury Lawyers',
  '{name} Personal Injury',
  'Law Offices of {name}',
  '{name} & Partners',
  '{name} Legal Services',
  '{name} Trial Lawyers'
]

const FIRM_NAMES = [
  'Anderson', 'Baker', 'Carter', 'Davis', 'Edwards',
  'Foster', 'Garcia', 'Harris', 'Ingram', 'Johnson',
  'King', 'Lewis', 'Martinez', 'Nelson', 'Owens',
  'Parker', 'Quinn', 'Roberts', 'Smith', 'Thompson',
  'Underwood', 'Valdez', 'Williams', 'Young', 'Zhang'
]

const FIRST_NAMES = [
  'James', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph', 'Thomas',
  'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven',
  'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy',
  'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas',
  'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin',
  'Frank', 'Gregory', 'Raymond', 'Alexander', 'Patrick', 'Jack', 'Dennis', 'Jerry',
  'Tyler', 'Aaron', 'Jose', 'Henry', 'Adam', 'Douglas', 'Nathan', 'Zachary',
  'Kyle', 'Noah', 'Ethan', 'Jeremy', 'Walter', 'Christian', 'Keith', 'Roger',
  'Terry', 'Austin', 'Sean', 'Gerald', 'Carl', 'Harold', 'Dylan', 'Arthur',
  'Lawrence', 'Jordan', 'Jesse', 'Bryan', 'Billy', 'Bruce', 'Gabriel', 'Joe'
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
  'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter',
  'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz',
  'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook',
  'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed',
  'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks'
]

const CITIES = ['Los Angeles', 'San Diego', 'San Francisco', 'Sacramento', 'Oakland', 'Fresno', 'Long Beach', 'San Jose']
const STATES = ['CA', 'CA', 'CA', 'CA', 'CA', 'NY', 'TX', 'FL'] // Mostly CA

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateEmail(firstName: string, lastName: string, i: number): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@lawfirm.com`
}

function generatePhone(): string {
  const area = ['310', '323', '213', '424', '818', '626', '562', '714', '949', '760', '858', '619']
  const prefix = Math.floor(Math.random() * 800) + 200
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `(${randomElement(area)}) ${prefix}-${suffix}`
}

function generateSpecialties(): string[] {
  const count = Math.floor(Math.random() * 4) + 2
  const shuffled = [...PI_CASE_TYPES].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

async function main() {
  console.log('Creating 25 law firms and 100 attorneys...\n')

  const lawFirms: { id: string; name: string }[] = []

  for (let i = 0; i < 25; i++) {
    const baseName = FIRM_NAMES[i]
    const pattern = FIRM_NAME_PATTERNS[i % FIRM_NAME_PATTERNS.length]
    const firmName = pattern.replace(/{name}/g, baseName)
    const slug = `${slugify(firmName)}-${i + 1}`

    const firm = await prisma.lawFirm.create({
      data: {
        name: firmName,
        slug,
        primaryEmail: `contact${i + 1}@${slugify(baseName)}law.com`,
        phone: generatePhone(),
        website: `https://www.${slugify(baseName)}law.com`,
        address: `${100 + i * 10} Legal Ave`,
        city: randomElement(CITIES),
        state: randomElement(STATES),
        zip: `${90000 + i * 100}`.slice(0, 5)
      }
    })
    lawFirms.push({ id: firm.id, name: firmName })
    console.log(`  ✓ Firm ${i + 1}/25: ${firmName}`)
  }

  console.log('\nCreating 100 attorneys (4 per firm)...\n')

  const usedNames = new Set<string>()
  let attorneyIndex = 0

  for (let firmIdx = 0; firmIdx < 25; firmIdx++) {
    const firm = lawFirms[firmIdx]
    for (let j = 0; j < 4; j++) {
      let firstName: string, lastName: string, fullName: string
      do {
        firstName = randomElement(FIRST_NAMES)
        lastName = randomElement(LAST_NAMES)
        fullName = `${firstName} ${lastName}`
      } while (usedNames.has(fullName))
      usedNames.add(fullName)

      attorneyIndex++
      const email = generateEmail(firstName, lastName, attorneyIndex)
      const specialties = generateSpecialties()

      const attorney = await prisma.attorney.create({
        data: {
          name: fullName,
          email,
          phone: generatePhone(),
          specialties: JSON.stringify(specialties),
          venues: JSON.stringify(['CA']),
          isActive: true,
          isVerified: Math.random() > 0.2,
          responseTimeHours: Math.floor(Math.random() * 48) + 2,
          averageRating: Math.random() * 1.5 + 3.5,
          totalReviews: Math.floor(Math.random() * 100),
          lawFirmId: firm.id
        }
      })

      await prisma.attorneyProfile.create({
        data: {
          attorneyId: attorney.id,
          bio: `Personal injury attorney at ${firm.name}.`,
          specialties: JSON.stringify(specialties),
          languages: JSON.stringify(['English', Math.random() > 0.7 ? 'Spanish' : null].filter(Boolean)),
          yearsExperience: Math.floor(Math.random() * 25) + 5,
          totalCases: Math.floor(Math.random() * 400) + 50,
          totalSettlements: Math.random() * 30000000 + 5000000,
          averageSettlement: Math.random() * 150000 + 50000,
          successRate: Math.floor(Math.random() * 25) + 75,
          firmName: firm.name,
          verifiedVerdicts: JSON.stringify([]),
          totalReviews: Math.floor(Math.random() * 80),
          averageRating: Math.random() * 1.5 + 3.5
        }
      })

      await prisma.attorneyDashboard.create({
        data: {
          attorneyId: attorney.id,
          leadFilters: JSON.stringify({ caseTypes: ['auto', 'slip_and_fall'], venues: ['CA'] }),
          exclusivitySettings: JSON.stringify({ preferredAssignment: 'first_look' }),
          totalLeadsReceived: Math.floor(Math.random() * 50),
          totalLeadsAccepted: Math.floor(Math.random() * 40),
          totalFeesCollected: Math.floor(Math.random() * 1000000),
          totalPlatformSpend: Math.floor(Math.random() * 20000),
          pricingModel: 'per_lead'
        }
      })

      if (attorneyIndex % 25 === 0) {
        console.log(`  ✓ Created ${attorneyIndex}/100 attorneys`)
      }
    }
  }

  console.log('\n✅ Done! Created 25 law firms and 100 attorneys (4 per firm).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
