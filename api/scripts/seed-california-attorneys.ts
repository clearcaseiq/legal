/**
 * Create 100 demo attorneys, each tied to a law firm in a different California city.
 * Does not create AttorneyProfile rows (avoids DB/schema drift on older deployments).
 * Usage: pnpm --filter caseiq-api seed:ca-attorneys
 * Re-runs: set SEED_BATCH_ID=myrun2 to avoid slug/email unique collisions, or use a fresh batch (default uses timestamp).
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

const prisma = new PrismaClient()

const PI_CASE_TYPES = [
  'auto', 'slip_and_fall', 'dog_bite', 'premises', 'motorcycle',
  'pedestrian', 'nursing_home_abuse', 'wrongful_death', 'product',
  'medmal', 'construction', 'commercial_vehicle',
]

/** 100 distinct California cities (population-weighted mix). */
const CA_CITIES = [
  'Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland',
  'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Stockton', 'Irvine', 'Chula Vista', 'Fremont',
  'San Bernardino', 'Modesto', 'Fontana', 'Oxnard', 'Moreno Valley', 'Huntington Beach', 'Glendale', 'Santa Clarita',
  'Garden Grove', 'Oceanside', 'Rancho Cucamonga', 'Santa Rosa', 'Ontario', 'Elk Grove', 'Corona', 'Lancaster',
  'Palmdale', 'Salinas', 'Hayward', 'Pomona', 'Escondido', 'Sunnyvale', 'Torrance', 'Pasadena',
  'Orange', 'Fullerton', 'Thousand Oaks', 'Visalia', 'Roseville', 'Concord', 'Simi Valley', 'Santa Clara',
  'Victorville', 'Vallejo', 'Berkeley', 'El Monte', 'Downey', 'Costa Mesa', 'Inglewood', 'Carlsbad',
  'Fairfield', 'Ventura', 'Temecula', 'Antioch', 'Richmond', 'West Covina', 'Murrieta', 'Norwalk',
  'Daly City', 'Burbank', 'Santa Maria', 'El Cajon', 'Rialto', 'San Mateo', 'Compton', 'Clovis',
  'Jurupa Valley', 'Vista', 'South Gate', 'Mission Viejo', 'Vacaville', 'Carson', 'Hesperia', 'Santa Monica',
  'Westminster', 'Redding', 'Santa Barbara', 'San Marcos', 'Chico', 'San Leandro', 'Newport Beach', 'Whittier',
  'Hawthorne', 'Citrus Heights', 'Livermore', 'Tracy', 'Alhambra', 'Indio', 'Menifee', 'Buena Park',
  'Hemet', 'Lakewood', 'Merced', 'Chino', 'Menlo Park', 'Redwood City', 'Lake Forest', 'Napa',
  'Tustin', 'Bellflower', 'Baldwin Park', 'Chino Hills', 'Mountain View', 'Alameda', 'Upland', 'San Ramon',
  'Pleasanton', 'Turlock', 'Manteca',
]

const FIRST_NAMES = [
  'James', 'Maria', 'Michael', 'Elena', 'David', 'Priya', 'Daniel', 'Wei', 'Matthew', 'Sofia',
  'Anthony', 'Amanda', 'Andrew', 'Jordan', 'Joshua', 'Renee', 'Christopher', 'Diego', 'Ryan', 'Fatima',
]

const LAST_NAMES = [
  'Nguyen', 'Patel', 'Hernandez', 'Kim', 'Martinez', 'Thompson', 'Silva', 'Park', 'Garcia', 'Cohen',
  'Robinson', 'Lee', 'Torres', 'Singh', 'Flores', 'Adams', 'Reyes', 'Murphy', 'Rivera', 'Brooks',
]

const FIRM_SUFFIXES = [
  'Injury Law', 'Trial Group', 'Accident Attorneys', 'Legal Advocates', 'PLLC', 'APC', 'Injury Lawyers',
]

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function caZipForIndex(i: number): string {
  const base = 90001 + ((i * 137) % 9600)
  return String(base).padStart(5, '0')
}

function generatePhone(i: number): string {
  const caArea = ['310', '323', '213', '424', '818', '626', '415', '510', '408', '619', '714', '805', '916', '209', '559']
  const area = caArea[i % caArea.length]
  const prefix = 200 + (i % 600)
  const line = String(1000 + (i % 9000)).padStart(4, '0')
  return `(${area}) ${prefix}-${line}`
}

function generateSpecialties(): string[] {
  const count = Math.floor(Math.random() * 3) + 2
  const shuffled = [...PI_CASE_TYPES].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

async function main() {
  const batchId = process.env.SEED_BATCH_ID ?? `b${Date.now().toString(36)}`
  const count = Math.min(100, CA_CITIES.length)
  console.log(`Seeding ${count} California attorneys (batch ${batchId}, one firm per city)…\n`)

  const usedNames = new Set<string>()
  let created = 0

  for (let i = 0; i < count; i++) {
    const city = CA_CITIES[i]
    const slug = `ca-seed-${batchId}-${i + 1}-${slugify(city)}`
    const firmName = `${city} ${randomElement(FIRM_SUFFIXES)}`

    const firm = await prisma.lawFirm.create({
      data: {
        name: firmName,
        slug,
        primaryEmail: `intake+${slug}@caseiq-seed.local`,
        phone: generatePhone(i),
        website: `https://example.test/${slug}`,
        address: `${200 + i} ${randomElement(['Mission', 'Broadway', 'Market', 'El Camino'])} St`,
        city,
        state: 'CA',
        zip: caZipForIndex(i),
      },
    })

    let firstName: string
    let lastName: string
    let fullName: string
    do {
      firstName = randomElement(FIRST_NAMES)
      lastName = randomElement(LAST_NAMES)
      fullName = `${firstName} ${lastName} Esq.`
    } while (usedNames.has(fullName))
    usedNames.add(fullName)

    const specialties = generateSpecialties()
    const email = `ca-demo.${batchId}.${i + 1}@caseiq-seed.local`
    const venues = JSON.stringify(['CA', city])

    const attorney = await prisma.attorney.create({
      data: {
        name: fullName,
        email,
        phone: generatePhone(i + 500),
        specialties: JSON.stringify(specialties),
        venues,
        isActive: true,
        isVerified: i % 4 !== 0,
        responseTimeHours: 2 + (i % 23),
        averageRating: 3.6 + (i % 12) / 10,
        totalReviews: 5 + (i % 95),
        lawFirmId: firm.id,
      },
    })

    await prisma.attorneyDashboard.create({
      data: {
        attorneyId: attorney.id,
        leadFilters: JSON.stringify({ caseTypes: specialties, venues: ['CA'] }),
        exclusivitySettings: JSON.stringify({ preferredAssignment: 'first_look' }),
        totalLeadsReceived: i % 40,
        totalLeadsAccepted: i % 30,
        totalFeesCollected: i * 10_000,
        totalPlatformSpend: i * 500,
        pricingModel: 'per_lead',
      },
    })

    created++
    if (created % 25 === 0) console.log(`  … ${created}/${count}`)
  }

  console.log(`\nDone. Created ${created} firms and ${created} attorneys across California.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
