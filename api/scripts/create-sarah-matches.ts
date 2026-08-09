/**
 * Create N fresh "New Matches" for the demo attorney Sarah Johnson.
 *
 * Each match = a plaintiff User + an Assessment (the case) + a LeadSubmission
 * (status 'submitted', assigned to Sarah) + a PENDING Introduction to Sarah.
 * That satisfies all four New-Matches gates (visible, submitted, non-terminal
 * intro, response window open), so they appear immediately under New Matches.
 *
 * Usage:
 *   node ../node_modules/tsx/dist/cli.mjs scripts/create-sarah-matches.ts
 *   COUNT=10 LOGIN_EMAIL=sarah.johnson@lawfirm.com node ../node_modules/tsx/dist/cli.mjs scripts/create-sarah-matches.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const LOGIN_EMAIL = (process.env.LOGIN_EMAIL || 'sarah.johnson@lawfirm.com').trim()
const COUNT = Number(process.env.COUNT || 10)

// Weighted toward Sarah's specialties (auto / slip_and_fall / workplace_injury).
const CLAIM_TYPES = [
  'auto',
  'slip_and_fall',
  'workplace_injury',
  'auto',
  'premises_liability',
  'slip_and_fall',
  'dog_bite',
  'auto',
  'workplace_injury',
  'product_liability',
]

const PLAINTIFFS = [
  { first: 'Marcus', last: 'Bennett', county: 'Los Angeles' },
  { first: 'Elena', last: 'Vasquez', county: 'Orange' },
  { first: 'David', last: 'Nguyen', county: 'San Diego' },
  { first: 'Priya', last: 'Patel', county: 'Santa Clara' },
  { first: 'James', last: 'Okoro', county: 'Alameda' },
  { first: 'Sofia', last: 'Rossi', county: 'Riverside' },
  { first: 'Tyler', last: 'Brooks', county: 'Sacramento' },
  { first: 'Aisha', last: 'Rahman', county: 'San Bernardino' },
  { first: 'Liam', last: 'Kelly', county: 'Fresno' },
  { first: 'Grace', last: 'Kim', county: 'Contra Costa' },
]

const FACTS: Record<string, string> = {
  auto: 'Rear-ended at a red light on a surface street; airbags deployed. Transported by ambulance with neck and lower-back pain; MRI shows disc bulge. Other driver cited for following too closely.',
  slip_and_fall:
    'Slipped on an unmarked wet floor in a grocery store aisle; no caution signage present. Fractured wrist requiring ORIF surgery. Store incident report was filed on scene.',
  workplace_injury:
    'Fell from an unsecured ladder at a job site due to missing fall protection. Herniated disc and shoulder tear; currently on modified duty. OSHA-reportable incident.',
  premises_liability:
    'Injured by a falling display fixture at a retail store that was negligently stacked. Concussion and lacerations treated in the ER.',
  dog_bite:
    'Attacked by an unleashed dog in a public park; deep puncture wounds to the forearm requiring stitches and a course of antibiotics. Animal control report filed.',
  product_liability:
    'Consumer product malfunctioned during normal use and caused second-degree burns. Product recalled two weeks after the incident.',
}

function refCode(n: number): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `CCIQ-SJ-${String(n).padStart(2, '0')}-${rand}`
}

// The app stores assessment.facts as a JSON string and calls JSON.parse on it
// throughout (SOL check, command center, coach, etc.). Plain prose breaks those,
// so build the canonical structured shape here.
function buildFacts(opts: {
  narrative: string
  daysAgo: number
  first: string
  last: string
  email: string
}): string {
  const incidentDate = new Date(Date.now() - opts.daysAgo * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  return JSON.stringify({
    incident: { date: incidentDate, narrative: opts.narrative },
    injuries: [],
    treatment: [],
    damages: {},
    plaintiffContext: { firstName: opts.first, lastName: opts.last, email: opts.email, phone: '' },
    consents: { tos: true, privacy: true, ml_use: true, hipaa: false },
  })
}

async function main() {
  console.log('DATABASE_URL:', (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':****@'))

  const attorney = await prisma.attorney.findFirst({ where: { email: LOGIN_EMAIL } })
  if (!attorney) {
    console.error(`No attorney resolves by email "${LOGIN_EMAIL}". Aborting.`)
    process.exit(1)
  }
  console.log(`Login attorney: ${attorney.name} <${attorney.email}> (id=${attorney.id})`)

  const now = Date.now()
  let created = 0

  for (let i = 0; i < COUNT; i++) {
    const p = PLAINTIFFS[i % PLAINTIFFS.length]
    const claimType = CLAIM_TYPES[i % CLAIM_TYPES.length]
    const facts = FACTS[claimType] || FACTS.auto
    const stamp = `${now}-${i}`

    const plaintiff = await prisma.user.create({
      data: {
        email: `demo.plaintiff.${stamp}@example.com`,
        firstName: p.first,
        lastName: p.last,
        role: 'client',
        isActive: true,
        emailVerified: true,
        provider: 'local',
      },
    })

    const assessment = await prisma.assessment.create({
      data: {
        userId: plaintiff.id,
        claimType,
        venueState: 'CA',
        venueCounty: p.county,
        status: 'SUBMITTED',
        facts: buildFacts({
          narrative: facts,
          daysAgo: 30 + i * 12,
          first: p.first,
          last: p.last,
          email: plaintiff.email,
        }),
        caseName: `${p.last} v. [Defendant]`,
        referenceCode: refCode(i + 1),
      },
    })

    await prisma.leadSubmission.create({
      data: {
        assessmentId: assessment.id,
        sourceType: 'organic_search',
        assignmentType: 'first_look',
        viabilityScore: 62 + Math.floor(Math.random() * 34),
        liabilityScore: 60 + Math.floor(Math.random() * 38),
        causationScore: 58 + Math.floor(Math.random() * 40),
        damagesScore: 55 + Math.floor(Math.random() * 43),
        hotnessLevel: i % 3 === 0 ? 'hot' : 'warm',
        status: 'submitted',
        lifecycleState: 'routing_active',
        routingLocked: false,
        assignedAttorneyId: attorney.id,
      },
    })

    await prisma.introduction.create({
      data: {
        assessmentId: assessment.id,
        attorneyId: attorney.id,
        status: 'PENDING',
        message: `New ${claimType.replace(/_/g, ' ')} match routed to ${attorney.name}.`,
        requestedAt: new Date(),
        waveNumber: 1,
      },
    })

    created++
    console.log(`  ${created}. ${p.first} ${p.last} — ${claimType} (${p.county} County) [${assessment.referenceCode}]`)
  }

  console.log(`\nCreated ${created} fresh New Match(es) for ${attorney.email}.`)
  console.log('Open /attorney-dashboard/leadgen/matches to see them.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
