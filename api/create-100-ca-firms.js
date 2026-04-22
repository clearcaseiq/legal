import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// California counties
const CA_COUNTIES = [
  'Los Angeles', 'San Diego', 'Orange', 'Riverside', 'San Bernardino',
  'Santa Clara', 'Alameda', 'Sacramento', 'Contra Costa', 'Fresno',
  'Kern', 'Ventura', 'San Francisco', 'San Mateo', 'Stanislaus',
  'Sonoma', 'Tulare', 'Santa Barbara', 'Solano', 'Monterey',
  'Placer', 'San Joaquin', 'Marin', 'Butte', 'Shasta',
  'El Dorado', 'Yolo', 'Napa', 'Merced', 'Humboldt',
  'Kings', 'Sutter', 'Mendocino', 'Yuba', 'Imperial',
  'Madera', 'Nevada', 'Tehama', 'San Luis Obispo', 'Tuolumne',
  'Lake', 'Amador', 'Calaveras', 'Colusa', 'Glenn',
  'Inyo', 'Lassen', 'Mariposa', 'Modoc', 'Mono',
  'Plumas', 'Sierra', 'Siskiyou', 'Trinity', 'Alpine'
]

// PI case types
const PI_CASE_TYPES = [
  'auto', 'slip_and_fall', 'dog_bite', 'premises', 'motorcycle',
  'pedestrian', 'nursing_home_abuse', 'wrongful_death', 'product',
  'medmal', 'construction', 'commercial_vehicle'
]

// Firm name patterns
const FIRM_NAME_PATTERNS = [
  '{last} & Associates',
  '{last} Law Group',
  '{last} Legal',
  'The {last} Firm',
  '{last} & {last}',
  '{last} Injury Lawyers',
  '{last} Personal Injury',
  'Law Offices of {last}',
  '{last} & Partners',
  '{last} Legal Services'
]

// First names for attorneys
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
  'Lawrence', 'Jordan', 'Jesse', 'Bryan', 'Billy', 'Bruce', 'Gabriel', 'Joe',
  'Logan', 'Alan', 'Juan', 'Wayne', 'Ralph', 'Randy', 'Roy', 'Eugene', 'Louis',
  'Philip', 'Johnny', 'Bobby', 'Howard', 'Willie', 'Russell', 'Albert', 'Mason'
]

// Last names for attorneys
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
  'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks',
  'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price',
  'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'
]

// Generate random email (with unique counter to avoid duplicates)
let emailCounter = 0
function generateEmail(firstName, lastName, domain = 'lawfirm.com') {
  emailCounter++
  const variations = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailCounter}@${domain}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}${emailCounter}@${domain}`,
    `${lastName.toLowerCase()}${emailCounter}@${domain}`,
    `info${emailCounter}@${lastName.toLowerCase()}${domain}`,
    `contact${emailCounter}@${lastName.toLowerCase()}${domain}`
  ]
  return variations[Math.floor(Math.random() * variations.length)]
}

// Generate random phone
function generatePhone() {
  const area = ['310', '323', '213', '424', '818', '626', '562', '714', '949', '760', '858', '619', '805', '661', '209', '559', '916', '707', '510', '925', '408', '831', '650', '415', '707']
  const prefix = Math.floor(Math.random() * 800) + 200
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `(${area[Math.floor(Math.random() * area.length)]}) ${prefix}-${suffix}`
}

// Generate specialties (mix of PI case types)
function generateSpecialties() {
  const count = Math.floor(Math.random() * 4) + 2 // 2-5 specialties
  const shuffled = [...PI_CASE_TYPES].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// Generate jurisdictions (1-3 counties in CA)
function generateJurisdictions() {
  const count = Math.floor(Math.random() * 3) + 1 // 1-3 counties
  const shuffled = [...CA_COUNTIES].sort(() => 0.5 - Math.random())
  const selectedCounties = shuffled.slice(0, count)
  
  return selectedCounties.map(county => ({
    state: 'CA',
    counties: [county] // Each attorney serves specific counties
  }))
}

// Generate firm name
function generateFirmName(lastName) {
  const pattern = FIRM_NAME_PATTERNS[Math.floor(Math.random() * FIRM_NAME_PATTERNS.length)]
  return pattern.replace(/{last}/g, lastName)
}

// Generate subscription tier
function generateSubscriptionTier() {
  const rand = Math.random()
  if (rand < 0.1) return 'enterprise' // 10% enterprise
  if (rand < 0.3) return 'premium'    // 20% premium
  if (rand < 0.6) return 'basic'      // 30% basic
  return null // 40% pay-per-case
}

// Generate pricing model
function generatePricingModel(subscriptionTier) {
  if (subscriptionTier) {
    return subscriptionTier === 'enterprise' ? 'both' : 'subscription'
  }
  return Math.random() < 0.5 ? 'fixed_price' : 'auction'
}

async function create100CAFirms() {
  console.log('Creating 100 California PI firms...\n')

  const createdFirms = []
  const errors = []

  for (let i = 0; i < 100; i++) {
    try {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
      const email = generateEmail(firstName, lastName)
      const phone = generatePhone()
      const firmName = generateFirmName(lastName)
      const specialties = generateSpecialties()
      const jurisdictions = generateJurisdictions()
      const subscriptionTier = generateSubscriptionTier()
      const pricingModel = generatePricingModel(subscriptionTier)

      // Create password hash
      const passwordHash = await bcrypt.hash('Password123!', 10)

      // Create attorney
      const attorney = await prisma.attorney.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: email,
          phone: phone,
          specialties: JSON.stringify(specialties),
          venues: JSON.stringify(['CA']), // All serve California
          isActive: true,
          isVerified: Math.random() > 0.2, // 80% verified
          responseTimeHours: Math.floor(Math.random() * 48) + 2, // 2-50 hours
          averageRating: Math.random() * 1.5 + 3.5, // 3.5-5.0
          totalReviews: Math.floor(Math.random() * 100)
        }
      })

      // Create attorney profile
      const profile = await prisma.attorneyProfile.create({
        data: {
          attorneyId: attorney.id,
          bio: `Experienced personal injury attorney serving ${jurisdictions.map(j => j.counties.join(', ')).join(' and ')} County${jurisdictions.length > 1 ? 'ies' : ''}.`,
          specialties: JSON.stringify(specialties),
          languages: JSON.stringify(['English', Math.random() > 0.7 ? 'Spanish' : null].filter(Boolean)),
          yearsExperience: Math.floor(Math.random() * 30) + 5, // 5-35 years
          totalCases: Math.floor(Math.random() * 500) + 50, // 50-550 cases
          totalSettlements: Math.random() * 50000000 + 5000000, // $5M-$55M
          averageSettlement: Math.random() * 200000 + 50000, // $50K-$250K
          successRate: Math.random() * 30 + 70, // 70-100%
          firmName: firmName,
          jurisdictions: JSON.stringify(jurisdictions),
          minInjurySeverity: Math.random() > 0.5 ? Math.floor(Math.random() * 3) : null, // 0-2 or null
          minDamagesRange: Math.random() > 0.3 ? Math.floor(Math.random() * 50000) + 10000 : null, // $10K-$60K or null
          maxDamagesRange: Math.random() > 0.5 ? Math.floor(Math.random() * 500000) + 100000 : null, // $100K-$600K or null
          maxCasesPerWeek: Math.random() > 0.4 ? Math.floor(Math.random() * 10) + 2 : null, // 2-12 or null
          maxCasesPerMonth: Math.random() > 0.4 ? Math.floor(Math.random() * 30) + 5 : null, // 5-35 or null
          intakeHours: Math.random() > 0.3 ? '24/7' : JSON.stringify([
            { dayOfWeek: 1, startTime: 9, endTime: 17 },
            { dayOfWeek: 2, startTime: 9, endTime: 17 },
            { dayOfWeek: 3, startTime: 9, endTime: 17 },
            { dayOfWeek: 4, startTime: 9, endTime: 17 },
            { dayOfWeek: 5, startTime: 9, endTime: 17 }
          ]),
          pricingModel: pricingModel,
          paymentModel: subscriptionTier ? 'subscription' : (Math.random() > 0.5 ? 'upfront' : 'net_30'),
          subscriptionTier: subscriptionTier,
          licenseNumber: `CA${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
          licenseState: 'CA',
          licenseVerified: Math.random() > 0.2, // 80% verified
          licenseVerificationMethod: Math.random() > 0.5 ? 'state_bar_lookup' : 'manual_upload',
          totalReviews: Math.floor(Math.random() * 100),
          averageRating: Math.random() * 1.5 + 3.5
        }
      })

      // Create user account for attorney
      const user = await prisma.user.create({
        data: {
          email: email,
          passwordHash: passwordHash,
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          emailVerified: true,
          isActive: true
        }
      })

      createdFirms.push({
        id: attorney.id,
        name: attorney.name,
        email: email,
        firmName: firmName,
        jurisdictions: jurisdictions.map(j => `${j.counties.join(', ')} County, CA`).join('; '),
        specialties: specialties.join(', '),
        subscriptionTier: subscriptionTier || 'pay-per-case',
        password: 'Password123!' // For testing
      })

      if ((i + 1) % 10 === 0) {
        console.log(`✓ Created ${i + 1}/100 firms...`)
      }
    } catch (error) {
      console.error(`Error creating firm ${i + 1}:`, error.message)
      errors.push({ index: i + 1, error: error.message })
    }
  }

  console.log(`\n✅ Successfully created ${createdFirms.length} California PI firms!`)
  console.log(`❌ Errors: ${errors.length}\n`)

  // Display summary
  console.log('Sample firms created:')
  createdFirms.slice(0, 5).forEach((firm, i) => {
    console.log(`\n${i + 1}. ${firm.name} - ${firm.firmName}`)
    console.log(`   Email: ${firm.email} | Password: ${firm.password}`)
    console.log(`   Jurisdictions: ${firm.jurisdictions}`)
    console.log(`   Specialties: ${firm.specialties}`)
    console.log(`   Tier: ${firm.subscriptionTier}`)
  })

  // Save to file for reference
  const fs = await import('fs')
  const path = await import('path')
  // process.cwd() is already in api when running from there
  const filePath = path.join(process.cwd(), '100-ca-firms-credentials.json')
  fs.writeFileSync(
    filePath,
    JSON.stringify(createdFirms, null, 2)
  )
  console.log(`\n📄 Full list saved to: ${filePath}`)

  return { created: createdFirms.length, errors }
}

create100CAFirms()
  .catch((e) => {
    console.error('Error creating firms:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
