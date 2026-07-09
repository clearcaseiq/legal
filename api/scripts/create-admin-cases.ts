/**
 * Create a small book of realistic cases for an EXISTING attorney login and
 * attach them so they show up on the attorney dashboard. Built for creating a
 * mix of already-accepted "Active cases" and pre-acceptance "New matches" for a
 * given attorney email (default: admin@ad.com), WITHOUT generating any evidence
 * files (so it runs cleanly against a remote/prod database).
 *
 * A "case" here = plaintiff User -> Assessment(facts) -> Introduction +
 * LeadSubmission (+ FirmCaseAssignment for accepted cases) + Prediction
 * (valuation + viability, via the live engine). This mirrors the real
 * attorney-accept flow used by the app.
 *
 * Usage (prod, inside the api container — recommended):
 *   docker cp api/scripts/create-admin-cases.ts clearcaseiq-api:/app/scripts/create-admin-cases.ts
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs scripts/create-admin-cases.ts
 *
 * Usage (local / any DB via DATABASE_URL):
 *   node ../node_modules/tsx/dist/cli.mjs scripts/create-admin-cases.ts
 *
 * Config (env vars, all optional):
 *   ATTORNEY_EMAIL   default "admin@ad.com"   (must already exist as an Attorney)
 *   NUM_ACTIVE       default 6                 (accepted / "Active cases")
 *   NUM_NEW          default 4                 (pending / "New matches")
 *   NEW_CASE_TYPES   default "auto,slip_and_fall,dog_bite,medmal,product"
 *   FORCE            set to 1 to add cases even if some already exist for this attorney
 *
 * Idempotent: plaintiff emails are deterministic and a slot is skipped if its
 * plaintiff already has an assessment, so re-running tops up rather than
 * duplicating.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ATTORNEY_EMAIL = process.env.ATTORNEY_EMAIL || 'admin@ad.com'
const NUM_ACTIVE = Number(process.env.NUM_ACTIVE || 6)
const NUM_NEW = Number(process.env.NUM_NEW || 4)
const FORCE = process.env.FORCE === '1'
// Short, stable namespace for deterministic demo plaintiff emails.
const EMAIL_NS = 'admin-cases'

// Used only when the attorney/firm must be created (ATTORNEY_EMAIL not found).
const FIRM_NAME = process.env.FIRM_NAME || 'Admin Law Firm'
const FIRM_SLUG = process.env.FIRM_SLUG || 'admin-law-firm'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Password1234!'
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin'
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Attorney'
const LEAD_ATTORNEY_NAME = process.env.LEAD_ATTORNEY_NAME || `${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`

const CASE_TYPES = [
  'auto',
  'slip_and_fall',
  'dog_bite',
  'medmal',
  'product',
  'nursing_home_abuse',
  'wrongful_death',
  'high_severity_surgery',
] as const
type CaseType = typeof CASE_TYPES[number]

const NEW_CASE_TYPES: CaseType[] = (process.env.NEW_CASE_TYPES
  ? process.env.NEW_CASE_TYPES.split(',').map((s) => s.trim()).filter(Boolean)
  : ['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product']
).filter((t): t is CaseType => (CASE_TYPES as readonly string[]).includes(t))

const CA_COUNTIES = [
  'Los Angeles', 'Orange', 'San Diego', 'San Francisco', 'Alameda',
  'Riverside', 'San Bernardino', 'Santa Clara', 'Sacramento', 'Contra Costa',
]
const CA_CITIES: Record<string, string[]> = {
  'Los Angeles': ['Los Angeles', 'Long Beach', 'Glendale', 'Pasadena', 'Torrance'],
  'Orange': ['Anaheim', 'Santa Ana', 'Irvine', 'Huntington Beach', 'Fullerton'],
  'San Diego': ['San Diego', 'Chula Vista', 'Oceanside', 'Escondido', 'Carlsbad'],
  'San Francisco': ['San Francisco'],
  'Alameda': ['Oakland', 'Fremont', 'Hayward', 'Berkeley', 'Alameda'],
  'Riverside': ['Riverside', 'Moreno Valley', 'Corona', 'Temecula', 'Murrieta'],
  'San Bernardino': ['San Bernardino', 'Fontana', 'Rancho Cucamonga', 'Ontario', 'Rialto'],
  'Santa Clara': ['San Jose', 'Sunnyvale', 'Santa Clara', 'Mountain View', 'Palo Alto'],
  'Sacramento': ['Sacramento', 'Elk Grove', 'Folsom', 'Citrus Heights', 'Rancho Cordova'],
  'Contra Costa': ['Concord', 'Richmond', 'Antioch', 'Walnut Creek', 'San Ramon'],
}

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Priya', 'Wei', 'Fatima', 'Carlos', 'Maria', 'Emily']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Nguyen', 'Patel', 'Kim', 'Chen', 'Gonzalez', 'Ramirez', 'Torres']
const INSURERS = ['State Farm', 'Allstate', 'Progressive', 'GEICO', 'Farmers', 'Liberty Mutual', 'Nationwide', 'Mercury', 'USAA', 'Travelers']
const HEALTH_PLANS = ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Kaiser Permanente', 'Anthem', 'Health Net']

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randDate(startYear: number): Date {
  const start = new Date(startYear, 0, 1).getTime()
  const end = new Date().getTime() - 30 * 24 * 3600 * 1000
  return new Date(start + Math.random() * (end - start))
}
function addDays(d: Date, days: number): Date { return new Date(d.getTime() + days * 24 * 3600 * 1000) }
function iso(d: Date): string { return d.toISOString().split('T')[0] }
function clamp01(n: number): number { return Math.max(0, Math.min(1, Number(n) || 0)) }

// -------------------- Per-case-type content templates --------------------
interface TypeTemplate {
  label: string
  locations: (city: string, county: string) => string[]
  narrative: (p: string, city: string) => string
  fault: string
  liabilityEvidence: string[]
  injuries: { type: string; body: string; icd: string; severity: number }[]
  providers: { name: string; type: string; cpt: string; base: number }[]
  wantsPolice: boolean
}

const TEMPLATES: Record<CaseType, TypeTemplate> = {
  auto: {
    label: 'Auto Accident',
    locations: (city, county) => [`${randInt(100, 9999)} ${rand(['Wilshire Blvd', 'Ventura Blvd', 'El Camino Real', 'Mission St', 'Broadway', 'Harbor Blvd'])}, ${city}, CA`, `I-${rand(['5', '10', '405', '110', '210', '80'])} near ${city}, ${county} County`],
    narrative: (p, city) => `${p} was lawfully stopped at a red light on ${city}'s surface streets when the defendant, traveling at an unsafe speed and distracted, failed to brake and rear-ended ${p}'s vehicle. The impact pushed ${p}'s car forward several feet. ${p} experienced immediate neck and lower-back pain and was transported by ambulance for evaluation. The defendant was cited by responding officers for following too closely.`,
    fault: 'other_party',
    liabilityEvidence: ['Traffic collision report (CHP/PD)', 'Independent witness statements', 'Vehicle damage photographs', 'EDR / black-box data', 'Dashcam footage'],
    injuries: [
      { type: 'Cervical strain / whiplash', body: 'neck', icd: 'S13.4XXA', severity: 2 },
      { type: 'Lumbar disc herniation', body: 'lower back', icd: 'M51.26', severity: 3 },
      { type: 'Post-concussive headaches', body: 'head', icd: 'S06.0X0A', severity: 2 },
    ],
    providers: [
      { name: 'City General ER', type: 'emergency', cpt: '99284', base: 4200 },
      { name: 'Advanced Imaging Center (MRI)', type: 'imaging', cpt: '72148', base: 2600 },
      { name: 'Golden State Orthopedics', type: 'specialist', cpt: '99204', base: 1800 },
      { name: 'Pacific Physical Therapy', type: 'therapy', cpt: '97110', base: 3400 },
    ],
    wantsPolice: true,
  },
  slip_and_fall: {
    label: 'Slip & Fall (Premises)',
    locations: (city, county) => [`${rand(['SaveMore Grocery', 'Harbor Mall', 'Bayside Restaurant', 'MegaMart', 'Sunrise Plaza'])} — ${city}, CA`, `Common area, ${city}, ${county} County`],
    narrative: (p, city) => `While shopping at a retail premises in ${city}, ${p} slipped on an unmarked spill of liquid that had been left unattended for an extended period with no wet-floor warning signage. ${p} fell violently onto the tile floor, striking the right hip and wrist. Store surveillance confirmed the hazard existed well before the fall and that employees walked past it repeatedly. ${p} required emergency care and follow-up orthopedic treatment.`,
    fault: 'premises_owner',
    liabilityEvidence: ['Store surveillance footage', 'Incident report', 'Witness statements', 'Photos of the hazard', 'Maintenance / inspection logs'],
    injuries: [
      { type: 'Distal radius (wrist) fracture', body: 'right wrist', icd: 'S52.501A', severity: 3 },
      { type: 'Hip contusion', body: 'right hip', icd: 'S70.01XA', severity: 2 },
      { type: 'Lumbar sprain', body: 'lower back', icd: 'S33.5XXA', severity: 2 },
    ],
    providers: [
      { name: 'City General ER', type: 'emergency', cpt: '99283', base: 3600 },
      { name: 'Radiology Associates (X-ray)', type: 'imaging', cpt: '73110', base: 900 },
      { name: 'Coastal Orthopedic Group', type: 'specialist', cpt: '25607', base: 5200 },
      { name: 'Restore PT & Rehab', type: 'therapy', cpt: '97140', base: 2800 },
    ],
    wantsPolice: true,
  },
  dog_bite: {
    label: 'Dog Bite / Animal Attack',
    locations: (city, county) => [`Residential sidewalk, ${city}, CA`, `Neighbor's property, ${city}, ${county} County`],
    narrative: (p, city) => `${p} was walking on a public sidewalk in ${city} when the defendant's dog, which had a known history of aggression and was not properly restrained, escaped an unlatched gate and attacked. ${p} sustained multiple deep puncture wounds and lacerations to the arms and leg requiring emergency wound care, sutures, and a course of antibiotics and rabies prophylaxis. Animal Control documented the incident and prior complaints about the same animal.`,
    fault: 'dog_owner',
    liabilityEvidence: ['Animal Control report', 'Prior complaint records', 'Photographs of injuries', 'Witness statements', 'Emergency room records'],
    injuries: [
      { type: 'Multiple puncture wounds', body: 'left forearm', icd: 'S51.851A', severity: 3 },
      { type: 'Laceration requiring sutures', body: 'right calf', icd: 'S81.811A', severity: 2 },
      { type: 'Post-traumatic anxiety', body: 'psychological', icd: 'F43.10', severity: 2 },
    ],
    providers: [
      { name: 'City General ER', type: 'emergency', cpt: '99285', base: 5400 },
      { name: 'Wound Care & Plastics', type: 'specialist', cpt: '12034', base: 3100 },
      { name: 'Infectious Disease (rabies ppx)', type: 'specialist', cpt: '90675', base: 2900 },
      { name: 'Behavioral Health Counseling', type: 'therapy', cpt: '90837', base: 1800 },
    ],
    wantsPolice: true,
  },
  medmal: {
    label: 'Medical Malpractice',
    locations: (city, county) => [`${rand(['Mercy Medical Center', 'St. Jude Hospital', 'Valley Regional Hospital'])} — ${city}, CA`, `Surgical suite, ${city}, ${county} County`],
    narrative: (p, city) => `During a procedure at a ${city}-area hospital, the treating physician deviated from the accepted standard of care, resulting in an avoidable surgical injury and a delayed diagnosis of the resulting complication. ${p} required corrective surgery, an extended inpatient stay, and prolonged rehabilitation. A retained medical expert has opined that competent care would more likely than not have avoided the injury.`,
    fault: 'medical_provider',
    liabilityEvidence: ['Complete medical records', 'Operative reports', 'Pathology reports', 'Retained expert opinion', 'Informed-consent documentation'],
    injuries: [
      { type: 'Iatrogenic organ injury', body: 'abdomen', icd: 'S36.90XA', severity: 4 },
      { type: 'Post-surgical infection (sepsis)', body: 'systemic', icd: 'T81.4XXA', severity: 4 },
      { type: 'Chronic pain syndrome', body: 'abdomen', icd: 'G89.28', severity: 3 },
    ],
    providers: [
      { name: 'Corrective Surgery (inpatient)', type: 'surgery', cpt: '49002', base: 42000 },
      { name: 'ICU / Critical Care', type: 'inpatient', cpt: '99291', base: 28000 },
      { name: 'Infectious Disease consult', type: 'specialist', cpt: '99223', base: 6200 },
      { name: 'Rehabilitation services', type: 'therapy', cpt: '97530', base: 7400 },
    ],
    wantsPolice: false,
  },
  product: {
    label: 'Defective Product',
    locations: (city, county) => [`Plaintiff's residence — ${city}, CA`, `${city}, ${county} County`],
    narrative: (p, city) => `${p} was using a consumer product in ${city} in its ordinary and intended manner when the product failed due to a design and/or manufacturing defect, causing ${rand(['severe burns', 'deep lacerations', 'an electrical shock', 'a crush injury'])}. The manufacturer failed to provide adequate warnings and there were feasible safer alternative designs. ${p} required emergency treatment and specialist follow-up.`,
    fault: 'product_manufacturer',
    liabilityEvidence: ['The product itself (preserved)', 'Engineering / defect analysis', 'Prior recall / complaint history', 'Purchase records', 'Medical records'],
    injuries: [
      { type: 'Second-degree burns', body: 'hand & forearm', icd: 'T23.201A', severity: 3 },
      { type: 'Deep laceration', body: 'hand', icd: 'S61.411A', severity: 2 },
      { type: 'Permanent scarring', body: 'forearm', icd: 'L90.5', severity: 2 },
    ],
    providers: [
      { name: 'Regional Burn Center', type: 'specialist', cpt: '16020', base: 14800 },
      { name: 'City General ER', type: 'emergency', cpt: '99284', base: 3900 },
      { name: 'Hand & Reconstructive Surgery', type: 'surgery', cpt: '26418', base: 8700 },
      { name: 'Occupational Therapy', type: 'therapy', cpt: '97535', base: 3200 },
    ],
    wantsPolice: false,
  },
  nursing_home_abuse: {
    label: 'Nursing Home Abuse / Neglect',
    locations: (city, county) => [`${rand(['Sunset', 'Golden Years', 'Maple Grove', 'Bayview'])} Care Center — ${city}, CA`, `Skilled nursing facility, ${city}, ${county} County`],
    narrative: (p, city) => `While a resident of a skilled nursing facility in ${city}, ${p}'s family member suffered neglect that fell below mandated care standards, including ${rand(['stage III/IV pressure ulcers (bedsores)', 'an unwitnessed fall with fracture', 'dehydration and malnutrition', 'medication errors'])}. Facility records reflect understaffing and missed care documentation. State inspection findings corroborate a pattern of deficiencies.`,
    fault: 'nursing_home',
    liabilityEvidence: ['Facility care records', 'State (CDPH) inspection reports', 'Photographs', 'Staffing records', 'Medical records'],
    injuries: [
      { type: 'Stage IV pressure ulcer', body: 'sacrum', icd: 'L89.154', severity: 4 },
      { type: 'Dehydration / malnutrition', body: 'systemic', icd: 'E86.0', severity: 3 },
      { type: 'Fall-related hip fracture', body: 'hip', icd: 'S72.001A', severity: 4 },
    ],
    providers: [
      { name: 'Wound Care Center', type: 'specialist', cpt: '11043', base: 12600 },
      { name: 'Hospital admission', type: 'inpatient', cpt: '99223', base: 18900 },
      { name: 'Orthopedic (hip repair)', type: 'surgery', cpt: '27130', base: 34000 },
      { name: 'Skilled rehab', type: 'therapy', cpt: '97110', base: 6100 },
    ],
    wantsPolice: false,
  },
  wrongful_death: {
    label: 'Wrongful Death',
    locations: (city, county) => [`${rand(['Highway 101', 'Intersection of 3rd & Main', 'Construction site'])} — ${city}, CA`, `${city}, ${county} County`],
    narrative: (p, city) => `${p}'s ${rand(['spouse', 'parent', 'adult child'])} was killed in ${city} due to the defendant's negligence in a ${rand(['multi-vehicle collision', 'workplace accident', 'pedestrian collision'])}. The decedent is survived by ${p} and dependents who have suffered profound economic and non-economic losses, including loss of financial support, guidance, and companionship. Liability is well documented by the investigating agency.`,
    fault: 'other_party',
    liabilityEvidence: ['Death certificate', 'Coroner / autopsy report', 'Police / agency investigation', 'Economic-loss expert report', 'Wage & support records'],
    injuries: [
      { type: 'Fatal traumatic injuries', body: 'multiple', icd: 'T07', severity: 4 },
    ],
    providers: [
      { name: 'Emergency & trauma response', type: 'emergency', cpt: '99285', base: 9800 },
      { name: 'Hospital (final admission)', type: 'inpatient', cpt: '99223', base: 26500 },
      { name: 'Funeral & burial expenses', type: 'other', cpt: 'N/A', base: 14500 },
    ],
    wantsPolice: true,
  },
  high_severity_surgery: {
    label: 'High-Severity Surgical Injury',
    locations: (city, county) => [`${rand(['Neuro Spine Institute', 'Cardiac Center', 'Regional Trauma Center'])} — ${city}, CA`, `${city}, ${county} County`],
    narrative: (p, city) => `${p} underwent a high-acuity ${rand(['spinal fusion', 'cardiac', 'neurosurgical'])} procedure in ${city} that was complicated by a preventable intraoperative error, resulting in serious permanent impairment. ${p} has required additional surgeries, lengthy hospitalization, and ongoing specialized care, with significant future medical needs and diminished earning capacity.`,
    fault: 'medical_provider',
    liabilityEvidence: ['Operative and anesthesia records', 'Imaging studies', 'Life-care plan', 'Retained surgical expert', 'Billing ledgers'],
    injuries: [
      { type: 'Spinal cord / nerve injury', body: 'spine', icd: 'S14.109A', severity: 4 },
      { type: 'Partial paralysis', body: 'lower extremities', icd: 'G82.20', severity: 4 },
      { type: 'Chronic neuropathic pain', body: 'systemic', icd: 'G89.4', severity: 4 },
    ],
    providers: [
      { name: 'Revision surgery (inpatient)', type: 'surgery', cpt: '22633', base: 88000 },
      { name: 'ICU / prolonged stay', type: 'inpatient', cpt: '99291', base: 62000 },
      { name: 'Inpatient rehabilitation', type: 'therapy', cpt: '97530', base: 24500 },
      { name: 'Durable medical equipment', type: 'other', cpt: 'E1161', base: 9600 },
    ],
    wantsPolice: false,
  },
}

function buildFacts(claimType: CaseType, county: string, city: string, incidentDate: Date, first: string, last: string, firmName: string) {
  const t = TEMPLATES[claimType]
  const plaintiff = `${first} ${last}`
  const inj = t.injuries
  const treatment = t.providers.map((p, idx) => {
    const charges = Math.round(p.base * (0.8 + Math.random() * 0.6))
    return {
      date: iso(addDays(incidentDate, idx * randInt(5, 25))),
      provider: p.name, type: p.type, cpt: p.cpt,
      diagnosis: inj[Math.min(idx, inj.length - 1)]?.type || 'Injury evaluation',
      treatment: `${p.type} services`, charges,
    }
  })
  const medCharges = treatment.reduce((s, x) => s + x.charges, 0)
  const medPaid = Math.round(medCharges * (0.15 + Math.random() * 0.25))
  const futureMedical = ['medmal', 'high_severity_surgery', 'nursing_home_abuse', 'wrongful_death'].includes(claimType)
    ? Math.round(medCharges * (0.5 + Math.random()))
    : Math.round(medCharges * Math.random() * 0.4)
  const lostDays = randInt(3, claimType === 'high_severity_surgery' || claimType === 'wrongful_death' ? 320 : 60)
  const dailyWage = randInt(150, 650)
  const wageLoss = lostDays * dailyWage
  const propertyDamage = claimType === 'auto' ? randInt(3500, 28000) : (claimType === 'product' ? randInt(200, 3000) : 0)

  return {
    claimType,
    venue: { state: 'CA', county },
    incident: {
      date: iso(incidentDate),
      time: `${randInt(6, 21)}:${String(randInt(0, 59)).padStart(2, '0')}`,
      location: t.locations(city, county)[0],
      city,
      narrative: t.narrative(plaintiff, city),
      parties: [`${plaintiff} (plaintiff)`, 'Defendant', ...(t.wantsPolice ? ['Investigating agency'] : [])],
      weather: rand(['Clear', 'Overcast', 'Light rain', 'Foggy', 'Sunny']),
      policeCalled: t.wantsPolice,
    },
    emergencyResponse: {
      nineOneOneCalled: t.wantsPolice,
      responders: t.wantsPolice ? rand([['Police'], ['Police', 'EMS/ambulance'], ['Police', 'EMS/ambulance', 'Fire department']]) : [],
    },
    liability: {
      fault: t.fault,
      comparativeFault: `${randInt(0, 15)}%`,
      evidence: t.liabilityEvidence,
      notes: 'Liability well supported; defendant primarily at fault.',
    },
    injuries: inj.map((i) => ({ type: i.type, bodyPart: i.body, icd10: i.icd, severity: i.severity, diagnosed: true, ongoing: i.severity >= 3, date: iso(incidentDate) })),
    treatment,
    damages: {
      med_charges: medCharges,
      med_paid: medPaid,
      med_charges_source: 'documented',
      future_medical: futureMedical,
      wage_loss: wageLoss,
      lost_days: lostDays,
      daily_wage: dailyWage,
      estimated_property_damage: propertyDamage,
      services: randInt(500, 4000),
      pain_suffering_narrative: 'Ongoing pain, limited activities of daily living, sleep disruption, and emotional distress.',
    },
    insurance: {
      at_fault_party: rand(INSURERS),
      policy_limit: rand([25000, 50000, 100000, 250000, 500000, 1000000]),
      own_insurance: rand(INSURERS),
      uninsured: Math.random() < 0.1,
      um_uim: Math.random() < 0.5,
      pip_coverage: Math.random() < 0.3,
      plaintiff_auto_carrier: claimType === 'auto' ? rand(INSURERS) : null,
      health_coverage: rand(HEALTH_PLANS),
      other_party_insured: Math.random() < 0.85,
    },
    plaintiffContext: {
      age: randInt(19, 84),
      occupation: rand(['Teacher', 'Driver', 'Nurse', 'Engineer', 'Retail associate', 'Contractor', 'Retired', 'Student', 'Accountant', 'Chef']),
      priorInjuries: Math.random() < 0.2 ? 'Minor prior history, unrelated' : 'None relevant',
      household: rand(['Single', 'Married', 'Married w/ children', 'Supports dependents']),
    },
    caseTypeValidation: { validatedType: claimType, confidence: Number((0.8 + Math.random() * 0.2).toFixed(2)) },
    consents: { tos: true, privacy: true, ml_use: true, hipaa: true },
    firm: { name: firmName, routedTo: firmName, jurisdiction: 'CA' },
  }
}

// -------------------- Valuation engine (same one the live API uses) --------------------
type Engine = {
  computeFeatures: (a: any) => any
  predictViabilityHeuristic: (features: any) => any
}
async function loadEngine(): Promise<Engine | null> {
  const candidates = [
    './dist/lib/prediction.js',
    '../dist/lib/prediction.js',
    './lib/prediction.js',
    '../src/lib/prediction',
    './src/lib/prediction',
  ]
  for (const candidate of candidates) {
    try {
      const imported: any = await import(candidate)
      const mod = imported?.computeFeatures ? imported : imported?.default ?? imported
      if (mod?.computeFeatures && mod?.predictViabilityHeuristic) return mod as Engine
    } catch { /* try next */ }
  }
  return null
}

// -------------------- Routing (mirrors the real accept flow) --------------------
async function routeCase(params: {
  assessmentId: string; attorneyId: string; firmId: string | null; officeId: string | null; adminUserId: string | null; pending: boolean; firmName: string
}) {
  const { assessmentId, attorneyId, firmId, officeId, adminUserId, pending, firmName } = params

  const lifecycleState = pending
    ? 'attorney_matched'
    : rand(['attorney_matched', 'consultation_scheduled', 'engaged'])
  const status = pending
    ? 'submitted'
    : (lifecycleState === 'engaged' ? 'retained' : (lifecycleState === 'consultation_scheduled' ? 'consulted' : 'contacted'))

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { lawFirmId: firmId ?? undefined, officeId: officeId ?? undefined, status: 'COMPLETED' },
  })

  if (pending) {
    const requestedAt = new Date(Date.now() - randInt(1, 18) * 60 * 1000)
    await prisma.introduction.create({
      data: { assessmentId, attorneyId, status: 'PENDING', message: `New match routed to ${firmName}.`, requestedAt, waveNumber: 1 },
    })
  } else {
    await prisma.introduction.create({
      data: { assessmentId, attorneyId, status: 'ACCEPTED', message: `Assigned to ${firmName}.`, respondedAt: new Date(), waveNumber: 1 },
    })
  }

  await prisma.leadSubmission.upsert({
    where: { assessmentId },
    update: { assignedAttorneyId: attorneyId, assignmentType: 'exclusive', status, lifecycleState, routingLocked: !pending },
    create: {
      assessmentId,
      viabilityScore: Number((0.55 + Math.random() * 0.4).toFixed(2)),
      liabilityScore: Number((0.6 + Math.random() * 0.4).toFixed(2)),
      causationScore: Number((0.55 + Math.random() * 0.4).toFixed(2)),
      damagesScore: Number((0.5 + Math.random() * 0.45).toFixed(2)),
      sourceType: rand(['organic_search', 'referral', 'paid_ad', 'direct']),
      hotnessLevel: rand(['hot', 'warm']),
      assignedAttorneyId: attorneyId, assignmentType: 'exclusive',
      status, lifecycleState, routingLocked: !pending,
      evidenceChecklist: JSON.stringify({ photos: false, bills: false, medical_records: false, police_report: false }),
    },
  })

  if (!pending && firmId) {
    try {
      await prisma.firmCaseAssignment.create({
        data: {
          lawFirmId: firmId, assessmentId, assignedAttorneyId: attorneyId,
          assignedUserId: adminUserId ?? undefined, role: 'lead_attorney', status: 'active',
          assignedById: adminUserId ?? undefined, notes: 'Lead attorney assignment.',
        },
      })
    } catch { /* unique constraint on re-run — ignore */ }
  }
}

async function addPrediction(engine: Engine | null, assessmentId: string) {
  if (!engine) return
  const a = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, claimType: true, venueState: true, venueCounty: true, facts: true },
  })
  if (!a) return
  try {
    const features = engine.computeFeatures(a as any)
    const resp = engine.predictViabilityHeuristic(features)
    await prisma.prediction.create({
      data: {
        assessmentId: a.id,
        modelVersion: resp.modelVersion,
        viability: JSON.stringify(resp.viability),
        bands: JSON.stringify(resp.value_bands),
        explain: JSON.stringify(resp.explainability),
      },
    })
    const v: any = resp.viability || {}
    await prisma.leadSubmission.updateMany({
      where: { assessmentId: a.id },
      data: {
        viabilityScore: clamp01(v.overall),
        liabilityScore: clamp01(v.liability),
        causationScore: clamp01(v.causation),
        damagesScore: clamp01(v.damages),
      },
    })
  } catch (err) {
    console.warn(`  ! prediction failed for ${assessmentId}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// -------------------- Ensure attorney (create if missing) --------------------
interface ResolvedAttorney {
  attorneyId: string
  attorneyName: string
  firmId: string | null
  officeId: string | null
  firmName: string
  adminUserId: string | null
  created: boolean
}

async function ensureAttorney(email: string): Promise<ResolvedAttorney> {
  const existing = await prisma.attorney.findFirst({
    where: { OR: [{ email }, { email: email.toLowerCase() }, { email: email.toUpperCase() }] },
    select: { id: true, name: true, lawFirmId: true },
  })

  if (existing) {
    let firmId: string | null = existing.lawFirmId ?? null
    let officeId: string | null = null
    let firmName = 'the firm'
    if (firmId) {
      const firm = await prisma.lawFirm.findUnique({ where: { id: firmId }, select: { name: true } })
      firmName = firm?.name ?? firmName
      const office = await prisma.firmOffice.findFirst({ where: { lawFirmId: firmId }, select: { id: true } })
      officeId = office?.id ?? null
    }
    const adminUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { email: email.toLowerCase() }, { email: email.toUpperCase() }] },
      select: { id: true },
    })
    return { attorneyId: existing.id, attorneyName: existing.name, firmId, officeId, firmName, adminUserId: adminUser?.id ?? null, created: false }
  }

  // -------- Create firm + office + login user + attorney + profile/dashboard/membership --------
  console.log(`No attorney found for ${email} — creating firm "${FIRM_NAME}", login user, and attorney...`)
  const specialties = [...CASE_TYPES]

  const firm = await prisma.lawFirm.upsert({
    where: { slug: FIRM_SLUG },
    update: { name: FIRM_NAME, state: 'CA', city: 'Los Angeles', isPublic: true, practiceAreas: JSON.stringify(specialties) },
    create: {
      name: FIRM_NAME, slug: FIRM_SLUG, primaryEmail: email, phone: '(213) 555-0100',
      city: 'Los Angeles', state: 'CA', zip: '90017',
      tagline: 'California personal injury advocates',
      description: `${FIRM_NAME} represents injured Californians across auto, premises, medical malpractice, product liability, elder abuse, and wrongful death matters.`,
      practiceAreas: JSON.stringify(specialties), isPublic: true,
    },
  })

  const office = await prisma.firmOffice.findFirst({ where: { lawFirmId: firm.id } })
    ?? await prisma.firmOffice.create({
      data: {
        lawFirmId: firm.id, name: 'Los Angeles HQ', city: 'Los Angeles', state: 'CA',
        address: '600 Wilshire Blvd, Suite 1500', phone: '(213) 555-0100',
        countiesServed: JSON.stringify(CA_COUNTIES), languages: JSON.stringify(['English', 'Spanish']),
        practiceAreas: JSON.stringify(specialties), capacity: 500, isActive: true,
      },
    })

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const adminUser = await prisma.user.upsert({
    where: { email },
    update: { role: 'attorney', isActive: true, emailVerified: true },
    create: {
      email, passwordHash, firstName: ADMIN_FIRST_NAME, lastName: ADMIN_LAST_NAME,
      phone: '(213) 555-0100', role: 'attorney', isActive: true, emailVerified: true, provider: 'local',
    },
  })

  const attorney = await prisma.attorney.create({
    data: {
      name: LEAD_ATTORNEY_NAME, email, phone: '(213) 555-0100',
      specialties: JSON.stringify(specialties), venues: JSON.stringify(['CA']),
      isActive: true, isVerified: true, claimStatus: 'claimed', claimedByUserId: adminUser.id,
      claimedAt: new Date(), responseTimeHours: 4, averageRating: 4.8, totalReviews: 42, lawFirmId: firm.id,
    },
  })

  await prisma.attorneyProfile.upsert({
    where: { attorneyId: attorney.id },
    update: { firmName: FIRM_NAME },
    create: {
      attorneyId: attorney.id,
      bio: `${LEAD_ATTORNEY_NAME} leads ${FIRM_NAME}'s California personal injury practice.`,
      specialties: JSON.stringify(specialties), languages: JSON.stringify(['English', 'Spanish']),
      yearsExperience: 12, totalCases: 320, totalSettlements: 18500000, averageSettlement: 165000,
      successRate: 90, firmName: FIRM_NAME,
      jurisdictions: JSON.stringify([{ state: 'CA', counties: CA_COUNTIES, cities: [] }]),
      verifiedVerdicts: JSON.stringify([]), totalReviews: 42, averageRating: 4.8,
    },
  })

  await prisma.attorneyDashboard.upsert({
    where: { attorneyId: attorney.id },
    update: {},
    create: {
      attorneyId: attorney.id,
      leadFilters: JSON.stringify({ caseTypes: specialties, venues: ['CA'] }),
      exclusivitySettings: JSON.stringify({ preferredAssignment: 'exclusive' }),
      pricingModel: 'per_retainer',
    },
  })

  await prisma.firmMember.upsert({
    where: { lawFirmId_userId: { lawFirmId: firm.id, userId: adminUser.id } },
    update: { attorneyId: attorney.id, role: 'firm_admin', officeId: office.id, status: 'active' },
    create: {
      lawFirmId: firm.id, userId: adminUser.id, attorneyId: attorney.id, officeId: office.id,
      role: 'firm_admin', title: 'Managing Partner', status: 'active', joinedAt: new Date(),
    },
  })

  console.log(`Created attorney "${attorney.name}" (${attorney.id}) — login: ${email} / ${ADMIN_PASSWORD}`)
  return { attorneyId: attorney.id, attorneyName: attorney.name, firmId: firm.id, officeId: office.id, firmName: FIRM_NAME, adminUserId: adminUser.id, created: true }
}

// -------------------- Main --------------------
async function main() {
  const email = ATTORNEY_EMAIL
  console.log(`\n=== Creating cases for attorney "${email}" (${NUM_ACTIVE} active + ${NUM_NEW} new matches) ===`)

  const resolved = await ensureAttorney(email)
  const attorney = { id: resolved.attorneyId, name: resolved.attorneyName }
  const firmId = resolved.firmId
  const officeId = resolved.officeId
  const firmName = resolved.firmName
  const adminUser = resolved.adminUserId ? { id: resolved.adminUserId } : null

  console.log(`Attorney: ${attorney.name} (${attorney.id})${resolved.created ? ' [newly created]' : ''}`)
  console.log(`Firm: ${firmId ? `${firmName} (${firmId})` : 'none — cases attach to the attorney directly'}${officeId ? `, office ${officeId}` : ''}`)

  // Idempotency guard: if this attorney already has cases and FORCE isn't set, stop.
  const existingCount = await prisma.leadSubmission.count({ where: { assignedAttorneyId: attorney.id } })
  const existingIntros = await prisma.introduction.count({ where: { attorneyId: attorney.id } })
  if ((existingCount > 0 || existingIntros > 0) && !FORCE) {
    console.log(`\nAttorney already has ${existingCount} lead submission(s) and ${existingIntros} introduction(s).`)
    console.log(`Refusing to add more without FORCE=1 (avoids accidental duplicates). Re-run with FORCE=1 to proceed anyway.`)
    process.exit(0)
  }

  const engine = await loadEngine()
  console.log(`Valuation engine: ${engine ? 'loaded (Est. Value + viability will populate)' : 'NOT found — cases created without predictions'}\n`)

  const total = NUM_ACTIVE + NUM_NEW
  let created = 0
  for (let n = 0; n < total; n++) {
    const pending = n >= NUM_ACTIVE // first NUM_ACTIVE are accepted, the rest are new matches
    const claimType = NEW_CASE_TYPES[n % NEW_CASE_TYPES.length]
    const first = rand(FIRST_NAMES)
    const last = rand(LAST_NAMES)
    const county = rand(CA_COUNTIES)
    const city = rand(CA_CITIES[county])
    const incidentDate = randDate(2023)
    const slot = n + 1

    // Deterministic plaintiff email so re-runs don't duplicate.
    const plaintiffEmail = `plaintiff.${EMAIL_NS}.${slot}@${EMAIL_NS}-demo.clearcaseiq.test`
    const user = await prisma.user.upsert({
      where: { email: plaintiffEmail },
      update: {},
      create: {
        email: plaintiffEmail, firstName: first, lastName: last,
        phone: `(213) 555-${String(randInt(1000, 9999))}`, role: 'client',
        isActive: true, emailVerified: true,
      },
    })

    // Skip if this plaintiff already has an assessment (previous run of this slot).
    const already = await prisma.assessment.findFirst({ where: { userId: user.id }, select: { id: true } })
    if (already) {
      console.log(`  slot ${slot}: already seeded (${plaintiffEmail}) — skipping`)
      continue
    }

    const facts = buildFacts(claimType, county, city, incidentDate, first, last, firmName)
    const assessment = await prisma.assessment.create({
      data: {
        userId: user.id, claimType, venueState: 'CA', venueCounty: county,
        status: 'COMPLETED', facts: JSON.stringify(facts),
        lawFirmId: firmId ?? undefined, officeId: officeId ?? undefined,
      },
    })

    await routeCase({ assessmentId: assessment.id, attorneyId: attorney.id, firmId, officeId, adminUserId: adminUser?.id ?? null, pending, firmName })
    await addPrediction(engine, assessment.id)

    created++
    console.log(`  slot ${slot}: ${pending ? 'NEW MATCH' : 'ACTIVE   '}  ${TEMPLATES[claimType].label.padEnd(30)} ${first} ${last} (${county} County)`)
  }

  console.log(`\n=== Done. Created ${created} new case(s) for ${email}. ===`)
  console.log(`Active (accepted) cases appear under "Active cases"; new matches await accept/decline under "New matches".`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
