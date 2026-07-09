/**
 * Seed the "Salman Law Firm" (California) with a large book of demo cases,
 * each with rich facts plus real photo (JPEG) and medical-bill / records
 * (PDF) evidence, and hard-route every case to the firm's lead attorney.
 *
 * Usage (local):
 *   node ../node_modules/tsx/dist/cli.mjs scripts/seed-salman-firm-cases.ts
 *
 * Usage (prod, inside the api container):
 *   docker cp scripts/seed-salman-firm-cases.ts clearcaseiq-api:/app/scripts/seed-salman-firm-cases.ts
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec api \
 *     node ../node_modules/tsx/dist/cli.mjs scripts/seed-salman-firm-cases.ts
 *
 * Config (env vars, all optional):
 *   TOTAL_CASES      default 50   (spread evenly across the 8 case types)
 *   FIRM_SLUG        default "salman-law-firm"
 *   FIRM_ADMIN_PASSWORD default "Password1234!"
 *
 * Idempotent: the firm/attorney/admin user are upserted; new cases are only
 * created up to TOTAL_CASES (existing Salman cases are counted), so re-running
 * tops up toward the target rather than duplicating.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

// ---- Optional heavy deps (real image / pdf generation). Fall back to text. ----
let sharp: any = null
let PDFDocument: any = null
try { sharp = require('sharp') } catch { /* fallback to text */ }
try { PDFDocument = require('pdfkit') } catch { /* fallback to text */ }

const TOTAL_CASES = Number(process.env.TOTAL_CASES || 50)
// Of the newly-created cases, how many to leave as pre-acceptance "New Matches"
// (awaiting the attorney's accept/decline) instead of already-accepted cases.
const NEW_MATCHES = Number(process.env.NEW_MATCHES || 0)
// When >0, create exactly this many new cases regardless of the TOTAL_CASES
// top-up math. Useful to add a fixed batch of new matches to an existing firm.
const ADD_CASES = Number(process.env.ADD_CASES || 0)
const FIRM_SLUG = process.env.FIRM_SLUG || 'salman-law-firm'
const FIRM_NAME = process.env.FIRM_NAME || 'Salman Law Firm'
const FIRM_ADMIN_EMAIL = process.env.FIRM_ADMIN_EMAIL || 'salman@salmanlawfirm.com'
const FIRM_ADMIN_PASSWORD = process.env.FIRM_ADMIN_PASSWORD || 'Password1234!'
const LEAD_ATTORNEY_NAME = process.env.LEAD_ATTORNEY_NAME || 'Salman Ahmed'
// Admin user first/last (parameterized so this book can seed any firm/attorney).
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Salman'
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Ahmed'
// Short slug used only to namespace deterministic demo plaintiff emails.
const DEMO_EMAIL_NS = process.env.DEMO_EMAIL_NS || FIRM_SLUG.replace(/[^a-z0-9]+/gi, '-').toLowerCase()

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

// Optional comma-separated list restricting which claim types NEW cases use.
// Existing counts are still tallied across all CASE_TYPES for the top-up math;
// this only controls the round-robin used when creating new cases. Defaults to
// the standard intake claim types (auto, slip_and_fall, dog_bite, medmal,
// product) so the demo book stays aligned with what the intake wizard produces.
const NEW_CASE_TYPES: CaseType[] = (process.env.NEW_CASE_TYPES
  ? process.env.NEW_CASE_TYPES.split(',').map((s) => s.trim()).filter(Boolean)
  : ['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product']
).filter((t): t is CaseType => (CASE_TYPES as readonly string[]).includes(t))

// California-focused venue data (firm is CA-based).
const CA_COUNTIES = [
  'Los Angeles', 'Orange', 'San Diego', 'San Francisco', 'Alameda',
  'Riverside', 'San Bernardino', 'Santa Clara', 'Sacramento', 'Contra Costa',
  'Fresno', 'Kern', 'Ventura', 'San Mateo', 'Sonoma',
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
  'Fresno': ['Fresno', 'Clovis', 'Sanger', 'Reedley', 'Selma'],
  'Kern': ['Bakersfield', 'Delano', 'Ridgecrest', 'Wasco', 'Shafter'],
  'Ventura': ['Oxnard', 'Thousand Oaks', 'Ventura', 'Simi Valley', 'Camarillo'],
  'San Mateo': ['Daly City', 'San Mateo', 'Redwood City', 'South San Francisco', 'San Bruno'],
  'Sonoma': ['Santa Rosa', 'Petaluma', 'Rohnert Park', 'Windsor', 'Sonoma'],
}

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa', 'Anthony', 'Maria', 'Mark', 'Sandra', 'Carlos', 'Ashley', 'Jose', 'Emily', 'Kevin', 'Michelle', 'Brian', 'Kimberly', 'Angela', 'Priya', 'Wei', 'Fatima']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Nguyen', 'Patel', 'Kim', 'Chen', 'Gonzalez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Reed']

const INSURERS = ['State Farm', 'Allstate', 'Progressive', 'GEICO', 'Farmers', 'Liberty Mutual', 'Nationwide', 'Mercury', 'USAA', 'Travelers']
const HEALTH_PLANS = ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Kaiser Permanente', 'Anthem', 'Health Net']

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randDate(startYear: number): Date {
  const start = new Date(startYear, 0, 1).getTime()
  const end = new Date().getTime() - 30 * 24 * 3600 * 1000
  return new Date(start + Math.random() * (end - start))
}
function money(n: number): string { return `$${n.toLocaleString('en-US')}` }
function addDays(d: Date, days: number): Date { return new Date(d.getTime() + days * 24 * 3600 * 1000) }
function iso(d: Date): string { return d.toISOString().split('T')[0] }
function esc(s: string): string { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

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
  photoScenes: string[]
  bg: string
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
    photoScenes: ['Rear-end collision damage', 'Vehicle interior / airbag', 'Skid marks at intersection'],
    bg: '#1f3a5f',
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
    photoScenes: ['Unmarked wet-floor hazard', 'Casted wrist injury', 'Bruising to hip'],
    bg: '#5f4b1f',
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
    photoScenes: ['Puncture wounds to forearm', 'Sutured calf laceration', 'The unrestrained dog / gate'],
    bg: '#3f1f2f',
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
    photoScenes: ['Surgical incision / scarring', 'Hospital inpatient stay', 'Imaging of complication'],
    bg: '#123a2f',
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
    photoScenes: ['The defective product', 'Burn injury to hand', 'Product failure point / close-up'],
    bg: '#5f2f10',
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
    photoScenes: ['Pressure ulcer documentation', 'Facility conditions', 'Resident during hospital stay'],
    bg: '#3a2f5f',
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
    photoScenes: ['Scene of the fatal incident', 'Vehicle / site documentation', 'Memorial (family exhibit)'],
    bg: '#2a2a2a',
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
    photoScenes: ['Surgical hardware imaging', 'Extended inpatient care', 'Assistive equipment'],
    bg: '#0f2f4f',
  },
}

// -------------------- File asset generators --------------------
async function writePhoto(destPath: string, title: string, subtitle: string, lines: string[], bg: string): Promise<{ mimetype: string; ok: boolean }> {
  if (sharp) {
    try {
      const W = 1000, H = 750
      const textLines = lines.map((l, i) => `<text x="60" y="${360 + i * 46}" font-family="Arial, sans-serif" font-size="30" fill="#e8eef6">${esc(l)}</text>`).join('')
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="#0b1220"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#4a5a72" stroke-width="3"/>
  <text x="60" y="120" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="#ffffff">${esc(title)}</text>
  <text x="60" y="180" font-family="Arial, sans-serif" font-size="30" fill="#9fb3cc">${esc(subtitle)}</text>
  <line x1="60" y1="210" x2="${W - 60}" y2="210" stroke="#4a5a72" stroke-width="2"/>
  ${textLines}
  <text x="60" y="${H - 60}" font-family="Arial, sans-serif" font-size="24" fill="#7f93ac">${esc(FIRM_NAME)} — evidence exhibit (demo)</text>
</svg>`
      await sharp(Buffer.from(svg)).jpeg({ quality: 72 }).toFile(destPath)
      return { mimetype: 'image/jpeg', ok: true }
    } catch { /* fall through to text */ }
  }
  const txt = destPath.replace(/\.jpg$/, '.txt')
  fs.writeFileSync(txt, `${title}\n${subtitle}\n\n${lines.join('\n')}\n\n${FIRM_NAME} — evidence exhibit (demo placeholder)\n`)
  return { mimetype: 'text/plain', ok: false }
}

async function writePdf(destPath: string, title: string, subtitle: string, sections: { heading?: string; rows: string[] }[]): Promise<{ mimetype: string; ok: boolean }> {
  if (PDFDocument) {
    try {
      await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument({ size: 'LETTER', margin: 54 })
        const stream = fs.createWriteStream(destPath)
        doc.pipe(stream)
        doc.fontSize(20).fillColor('#0b1220').text(title)
        doc.moveDown(0.2).fontSize(11).fillColor('#555').text(subtitle)
        doc.moveDown(0.5).strokeColor('#cccccc').moveTo(54, doc.y).lineTo(558, doc.y).stroke()
        doc.moveDown(0.6)
        for (const s of sections) {
          if (s.heading) { doc.moveDown(0.3).fontSize(13).fillColor('#122a4f').text(s.heading); doc.moveDown(0.2) }
          doc.fontSize(10.5).fillColor('#222')
          for (const r of s.rows) doc.text(r)
        }
        doc.moveDown(1).fontSize(8).fillColor('#888').text(`This is a demo document generated for the ${FIRM_NAME} sample case book. Not a real medical or legal record.`, { align: 'left' })
        doc.end()
        stream.on('finish', () => resolve())
        stream.on('error', reject)
      })
      return { mimetype: 'application/pdf', ok: true }
    } catch { /* fall through to text */ }
  }
  const txt = destPath.replace(/\.pdf$/, '.txt')
  const body = sections.map(s => `${s.heading ? s.heading + '\n' : ''}${s.rows.join('\n')}`).join('\n\n')
  fs.writeFileSync(txt, `${title}\n${subtitle}\n\n${body}\n`)
  return { mimetype: 'text/plain', ok: false }
}

// -------------------- Firm / attorney setup --------------------
async function ensureFirm() {
  const firm = await prisma.lawFirm.upsert({
    where: { slug: FIRM_SLUG },
    update: {
      name: FIRM_NAME, state: 'CA', city: 'Los Angeles', isPublic: true,
      practiceAreas: JSON.stringify([...CASE_TYPES]),
    },
    create: {
      name: FIRM_NAME,
      slug: FIRM_SLUG,
      primaryEmail: 'intake@salmanlawfirm.com',
      phone: '(213) 555-0100',
      website: 'https://www.salmanlawfirm.com',
      address: '600 Wilshire Blvd, Suite 1500',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90017',
      tagline: 'California personal injury advocates',
      description: 'Salman Law Firm represents injured Californians across auto, premises, medical malpractice, product liability, elder abuse, and wrongful death matters.',
      practiceAreas: JSON.stringify([...CASE_TYPES]),
      foundedYear: 2009,
      isPublic: true,
    },
  })

  const office = await prisma.firmOffice.findFirst({ where: { lawFirmId: firm.id, name: 'Los Angeles HQ' } })
    ?? await prisma.firmOffice.create({
      data: {
        lawFirmId: firm.id, name: 'Los Angeles HQ', city: 'Los Angeles', state: 'CA',
        address: '600 Wilshire Blvd, Suite 1500', phone: '(213) 555-0100',
        countiesServed: JSON.stringify(CA_COUNTIES), languages: JSON.stringify(['English', 'Spanish']),
        practiceAreas: JSON.stringify([...CASE_TYPES]), capacity: 500, isActive: true,
      },
    })

  const passwordHash = await bcrypt.hash(FIRM_ADMIN_PASSWORD, 12)
  const adminUser = await prisma.user.upsert({
    where: { email: FIRM_ADMIN_EMAIL },
    update: { role: 'attorney', isActive: true, emailVerified: true },
    create: {
      email: FIRM_ADMIN_EMAIL, passwordHash, firstName: ADMIN_FIRST_NAME, lastName: ADMIN_LAST_NAME,
      phone: '(213) 555-0100', role: 'attorney', isActive: true, emailVerified: true, provider: 'local',
    },
  })

  const specialties = [...CASE_TYPES]
  let attorney = await prisma.attorney.findFirst({ where: { email: FIRM_ADMIN_EMAIL } })
  if (!attorney) {
    attorney = await prisma.attorney.create({
      data: {
        name: LEAD_ATTORNEY_NAME, email: FIRM_ADMIN_EMAIL, phone: '(213) 555-0100',
        specialties: JSON.stringify(specialties), venues: JSON.stringify(['CA']),
        isActive: true, isVerified: true, claimStatus: 'claimed', claimedByUserId: adminUser.id,
        claimedAt: new Date(), responseTimeHours: 4, averageRating: 4.8, totalReviews: 126, lawFirmId: firm.id,
      },
    })
  } else {
    attorney = await prisma.attorney.update({
      where: { id: attorney.id },
      data: {
        isActive: true, isVerified: true, lawFirmId: firm.id,
        specialties: JSON.stringify(specialties), venues: JSON.stringify(['CA']),
        claimStatus: 'claimed', claimedByUserId: adminUser.id, claimedAt: attorney.claimedAt ?? new Date(),
      },
    })
  }

  await prisma.attorneyProfile.upsert({
    where: { attorneyId: attorney.id },
    update: { firmName: FIRM_NAME },
    create: {
      attorneyId: attorney.id,
      bio: `${LEAD_ATTORNEY_NAME} leads ${FIRM_NAME}'s California personal injury practice.`,
      specialties: JSON.stringify(specialties), languages: JSON.stringify(['English', 'Spanish']),
      yearsExperience: 16, totalCases: 640, totalSettlements: 48500000, averageSettlement: 185000,
      successRate: 92, firmName: FIRM_NAME, firmWebsite: 'https://www.salmanlawfirm.com',
      jurisdictions: JSON.stringify([{ state: 'CA', counties: CA_COUNTIES, cities: [] }]),
      verifiedVerdicts: JSON.stringify([]), totalReviews: 126, averageRating: 4.8,
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

  return { firm, office, attorney, adminUser }
}

// -------------------- Case builder --------------------
function buildFacts(claimType: CaseType, county: string, city: string, incidentDate: Date, first: string, last: string) {
  const t = TEMPLATES[claimType]
  const plaintiff = `${first} ${last}`
  const inj = t.injuries
  // Treatment ledger derived from provider templates (with variation).
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
    firm: { name: FIRM_NAME, routedTo: FIRM_NAME, jurisdiction: 'CA' },
  }
}

// -------------------- Evidence + routing per case --------------------
async function attachEvidence(params: {
  userId: string; assessmentId: string; claimType: CaseType; uploadDir: string;
  plaintiff: string; incidentDate: Date; facts: any; caseLabel: string;
}) {
  const { userId, assessmentId, claimType, uploadDir, plaintiff, incidentDate, facts, caseLabel } = params
  const t = TEMPLATES[claimType]

  // ---- Photos ----
  const scenes = t.photoScenes
  for (let s = 0; s < scenes.length; s++) {
    const base = `${claimType}-photo-${s + 1}.jpg`
    const finalName = `${uuidv4()}-${base}`
    const finalPath = path.join(uploadDir, finalName)
    const res = await writePhoto(finalPath, scenes[s], `${caseLabel} • ${plaintiff}`, [
      `Incident date: ${iso(incidentDate)}`,
      `Location: ${facts.incident.location}`,
      `Exhibit ${s + 1} of ${scenes.length}`,
    ], t.bg)
    // writePhoto may have written .txt on fallback; find the actual file.
    const actualPath = res.ok ? finalPath : finalPath.replace(/\.jpg$/, '.txt')
    const actualName = path.basename(actualPath)
    const stats = fs.statSync(actualPath)
    await prisma.evidenceFile.create({
      data: {
        userId, assessmentId,
        originalName: res.ok ? base : base.replace(/\.jpg$/, '.txt'),
        filename: actualName, mimetype: res.mimetype, size: stats.size,
        filePath: actualPath, fileUrl: `/uploads/evidence/${actualName}`,
        category: 'photos', subcategory: s === 1 ? 'injury_photo' : 'scene_photo',
        description: `${t.label} — ${scenes[s]}`, dataType: 'unstructured',
        tags: JSON.stringify([claimType, 'photos']), relevanceScore: Number((0.75 + Math.random() * 0.25).toFixed(2)),
        uploadMethod: 'camera', captureDate: incidentDate, location: 'CA',
        processingStatus: 'completed', aiSummary: `${scenes[s]} documented for ${plaintiff}.`,
        isHIPAA: s === 1, accessLevel: 'attorney', isVerified: true, verifiedAt: new Date(),
      },
    })
  }

  // ---- Medical bill (PDF) + ExtractedData ----
  const billRows = facts.treatment.map((tr: any) => `${tr.date}   ${tr.provider.padEnd(34).slice(0, 34)}  CPT ${tr.cpt}   ${money(tr.charges)}`)
  const totalCharges = facts.damages.med_charges
  const billName = `${claimType}-medical-bill.pdf`
  const billFinal = `${uuidv4()}-${billName}`
  const billPath = path.join(uploadDir, billFinal)
  const billRes = await writePdf(billPath, 'ITEMIZED MEDICAL BILL / STATEMENT', `${caseLabel} • Patient: ${plaintiff} • DOI: ${iso(incidentDate)}`, [
    { heading: 'Charges', rows: [...billRows, '', `TOTAL BILLED: ${money(totalCharges)}`, `AMOUNT PAID/ADJUSTED: ${money(facts.damages.med_paid)}`, `BALANCE: ${money(totalCharges - facts.damages.med_paid)}`] },
    { heading: 'Diagnosis Codes (ICD-10)', rows: facts.injuries.map((i: any) => `${i.icd10}  ${i.type}`) },
  ])
  const billActual = billRes.ok ? billPath : billPath.replace(/\.pdf$/, '.txt')
  const billActualName = path.basename(billActual)
  const billStats = fs.statSync(billActual)
  const billEv = await prisma.evidenceFile.create({
    data: {
      userId, assessmentId,
      originalName: billRes.ok ? billName : billName.replace(/\.pdf$/, '.txt'),
      filename: billActualName, mimetype: billRes.mimetype, size: billStats.size,
      filePath: billActual, fileUrl: `/uploads/evidence/${billActualName}`,
      category: 'bills', subcategory: 'medical_bill',
      description: `${t.label} — itemized medical bill`, dataType: 'structured',
      tags: JSON.stringify([claimType, 'bills', 'medical']), relevanceScore: 0.95,
      uploadMethod: 'file_picker', processingStatus: 'completed',
      ocrText: [`ITEMIZED MEDICAL BILL — ${plaintiff}`, ...billRows, `TOTAL BILLED: ${money(totalCharges)}`].join('\n'),
      aiSummary: `Documented medical specials totaling ${money(totalCharges)} across ${facts.treatment.length} providers.`,
      isHIPAA: true, accessLevel: 'attorney', isVerified: true, verifiedAt: new Date(),
    },
  })
  await prisma.extractedData.create({
    data: {
      evidenceFileId: billEv.id,
      icdCodes: JSON.stringify(facts.injuries.map((i: any) => i.icd10)),
      cptCodes: JSON.stringify(facts.treatment.map((tr: any) => tr.cpt).filter((c: string) => c && c !== 'N/A')),
      dollarAmounts: JSON.stringify(facts.treatment.map((tr: any) => tr.charges)),
      totalAmount: totalCharges, currency: 'USD',
      dates: JSON.stringify(facts.treatment.map((tr: any) => tr.date)),
      entities: JSON.stringify({ patient: plaintiff, providers: facts.treatment.map((tr: any) => tr.provider) }),
      keywords: JSON.stringify(['medical bill', 'itemized', 'specials']),
      confidence: 0.93,
    },
  })

  // ---- Medical records (PDF) ----
  const recName = `${claimType}-medical-records.pdf`
  const recFinal = `${uuidv4()}-${recName}`
  const recPath = path.join(uploadDir, recFinal)
  const recRes = await writePdf(recPath, 'MEDICAL RECORDS SUMMARY', `${caseLabel} • Patient: ${plaintiff}`, [
    { heading: 'History of Present Illness', rows: [facts.incident.narrative] },
    { heading: 'Assessment', rows: facts.injuries.map((i: any) => `${i.type} (${i.bodyPart}) — ICD-10 ${i.icd10}, severity ${i.severity}/4`) },
    { heading: 'Treatment Plan', rows: facts.treatment.map((tr: any) => `${tr.date}: ${tr.provider} — ${tr.treatment}`) },
  ])
  const recActual = recRes.ok ? recPath : recPath.replace(/\.pdf$/, '.txt')
  const recActualName = path.basename(recActual)
  const recStats = fs.statSync(recActual)
  await prisma.evidenceFile.create({
    data: {
      userId, assessmentId,
      originalName: recRes.ok ? recName : recName.replace(/\.pdf$/, '.txt'),
      filename: recActualName, mimetype: recRes.mimetype, size: recStats.size,
      filePath: recActual, fileUrl: `/uploads/evidence/${recActualName}`,
      category: 'medical_records', subcategory: 'clinical_summary',
      description: `${t.label} — medical records summary`, dataType: 'unstructured',
      tags: JSON.stringify([claimType, 'medical_records']), relevanceScore: 0.9,
      uploadMethod: 'file_picker', processingStatus: 'completed',
      aiSummary: `Clinical summary documenting ${facts.injuries.length} injuries and ${facts.treatment.length} treatment encounters.`,
      isHIPAA: true, accessLevel: 'attorney', isVerified: true, verifiedAt: new Date(),
    },
  })

  // ---- Police / incident report (PDF) for applicable types ----
  if (t.wantsPolice) {
    const polName = `${claimType}-incident-report.pdf`
    const polFinal = `${uuidv4()}-${polName}`
    const polPath = path.join(uploadDir, polFinal)
    const polRes = await writePdf(polPath, 'INVESTIGATING AGENCY / INCIDENT REPORT', `${caseLabel} • ${iso(incidentDate)}`, [
      { heading: 'Summary', rows: [facts.incident.narrative] },
      { heading: 'Findings', rows: [`Primary fault: defendant`, `Comparative fault (plaintiff): ${facts.liability.comparativeFault}`, `Weather: ${facts.incident.weather}`, `Location: ${facts.incident.location}`] },
      { heading: 'Evidence Collected', rows: facts.liability.evidence },
    ])
    const polActual = polRes.ok ? polPath : polPath.replace(/\.pdf$/, '.txt')
    const polActualName = path.basename(polActual)
    const polStats = fs.statSync(polActual)
    await prisma.evidenceFile.create({
      data: {
        userId, assessmentId,
        originalName: polRes.ok ? polName : polName.replace(/\.pdf$/, '.txt'),
        filename: polActualName, mimetype: polRes.mimetype, size: polStats.size,
        filePath: polActual, fileUrl: `/uploads/evidence/${polActualName}`,
        category: 'police_report', subcategory: 'incident_report',
        description: `${t.label} — incident report`, dataType: 'unstructured',
        tags: JSON.stringify([claimType, 'police_report']), relevanceScore: 0.88,
        uploadMethod: 'file_picker', processingStatus: 'completed',
        aiSummary: 'Investigating agency report supporting liability.',
        accessLevel: 'attorney', isVerified: true, verifiedAt: new Date(),
      },
    })
  }
}

async function routeToFirm(params: { assessmentId: string; firmId: string; officeId: string; attorneyId: string; adminUserId: string; facts: any; pending?: boolean }) {
  const { assessmentId, firmId, officeId, attorneyId, adminUserId, facts, pending } = params

  // Pending = a "New Match" awaiting the attorney's accept/decline decision
  // (status submitted, PENDING introduction with a fresh timer, routing unlocked).
  const lifecycleState = pending
    ? 'attorney_matched'
    : rand(['attorney_matched', 'consultation_scheduled', 'engaged'])
  const status = pending
    ? 'submitted'
    : (lifecycleState === 'engaged' ? 'retained' : (lifecycleState === 'consultation_scheduled' ? 'consulted' : 'contacted'))

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { lawFirmId: firmId, officeId, status: 'COMPLETED' },
  })

  if (pending) {
    // Fresh offer within the response window so the countdown is active.
    const requestedAt = new Date(Date.now() - randInt(1, 18) * 60 * 1000)
    await prisma.introduction.create({
      data: {
        assessmentId, attorneyId, status: 'PENDING',
        message: `New match routed to ${FIRM_NAME} (demo book).`,
        requestedAt, waveNumber: 1,
      },
    })
  } else {
    await prisma.introduction.create({
      data: {
        assessmentId, attorneyId, status: 'ACCEPTED',
        message: `Auto-assigned to ${FIRM_NAME} (demo book).`,
        respondedAt: new Date(), waveNumber: 1,
      },
    })
  }

  await prisma.leadSubmission.upsert({
    where: { assessmentId },
    update: {
      assignedAttorneyId: attorneyId, assignmentType: 'exclusive',
      status, lifecycleState, routingLocked: !pending,
    },
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
      evidenceChecklist: JSON.stringify({ photos: true, bills: true, medical_records: true, police_report: TEMPLATES[facts.claimType as CaseType].wantsPolice }),
    },
  })

  // Firm assignment only exists once a case is accepted/retained (not for pending matches).
  if (!pending) {
    try {
      await prisma.firmCaseAssignment.create({
        data: {
          lawFirmId: firmId, assessmentId, assignedAttorneyId: attorneyId, assignedUserId: adminUserId,
          role: 'lead_attorney', status: 'active', assignedById: adminUserId,
          notes: 'Lead attorney assignment (demo book).',
        },
      })
    } catch { /* unique constraint on re-run — ignore */ }
  }
}

// -------------------- Main --------------------
async function main() {
  console.log(`\n=== Seeding "${FIRM_NAME}" (California) with ${TOTAL_CASES} total cases (spread across ${CASE_TYPES.length} types) ===`)
  console.log(`Image generation: ${sharp ? 'sharp (JPEG)' : 'TEXT fallback'} | PDF generation: ${PDFDocument ? 'pdfkit (PDF)' : 'TEXT fallback'}\n`)

  const uploadDir = path.join(process.cwd(), 'uploads', 'evidence')
  fs.mkdirSync(uploadDir, { recursive: true })

  const { firm, office, attorney, adminUser } = await ensureFirm()
  console.log(`Firm ready: ${firm.name} (${firm.id})`)
  console.log(`Lead attorney: ${attorney.name} (${attorney.id})  login: ${FIRM_ADMIN_EMAIL} / ${FIRM_ADMIN_PASSWORD}\n`)

  // Count existing Salman cases so re-runs top up toward TOTAL_CASES rather than duplicate.
  const summary: Record<string, number> = {}
  let existingTotal = 0
  for (const ct of CASE_TYPES) {
    const c = await prisma.assessment.count({ where: { lawFirmId: firm.id, claimType: ct } })
    summary[ct] = c
    existingTotal += c
  }
  const remaining = ADD_CASES > 0 ? ADD_CASES : Math.max(0, TOTAL_CASES - existingTotal)
  console.log(`Existing ${FIRM_NAME} cases: ${existingTotal}. Creating ${remaining} new${ADD_CASES > 0 ? ` (ADD_CASES=${ADD_CASES})` : ` (target ${TOTAL_CASES})`}.`)
  console.log(`New-case claim types: ${NEW_CASE_TYPES.join(', ')} | leaving first ${NEW_MATCHES} as pre-acceptance New Matches.\n`)

  let totalCreated = 0
  for (let n = 0; n < remaining; n++) {
    // Round-robin across the allowed new-case types so the batch is spread evenly.
    const claimType = NEW_CASE_TYPES[n % NEW_CASE_TYPES.length]
    const first = rand(FIRST_NAMES)
    const last = rand(LAST_NAMES)
    const county = rand(CA_COUNTIES)
    const city = rand(CA_CITIES[county])
    const incidentDate = randDate(2022)
    const plaintiff = `${first} ${last}`
    const seq = (summary[claimType] || 0) + 1
    const caseLabel = `${TEMPLATES[claimType].label} #${seq}`

    // Plaintiff user (deterministic email for idempotency).
    const email = `plaintiff.${claimType}.${seq}@${DEMO_EMAIL_NS}-demo.clearcaseiq.test`
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email, firstName: first, lastName: last,
        phone: `(213) 555-${String(randInt(1000, 9999))}`, role: 'client',
        isActive: true, emailVerified: true,
      },
    })

    const facts = buildFacts(claimType, county, city, incidentDate, first, last)

    const assessment = await prisma.assessment.create({
      data: {
        userId: user.id, claimType, venueState: 'CA', venueCounty: county,
        status: 'COMPLETED', facts: JSON.stringify(facts),
        lawFirmId: firm.id, officeId: office.id,
      },
    })

    await attachEvidence({ userId: user.id, assessmentId: assessment.id, claimType, uploadDir, plaintiff, incidentDate, facts, caseLabel })
    // Leave the first NEW_MATCHES cases as pre-acceptance "New Matches".
    const pending = n < NEW_MATCHES
    await routeToFirm({ assessmentId: assessment.id, firmId: firm.id, officeId: office.id, attorneyId: attorney.id, adminUserId: adminUser.id, facts, pending })

    summary[claimType] = seq
    totalCreated++
    if (totalCreated % 10 === 0) console.log(`  ...${totalCreated}/${remaining} cases created`)
  }

  console.log(`\n=== Done. Created ${totalCreated} new cases. ===`)
  for (const ct of CASE_TYPES) console.log(`  ${ct}: ${summary[ct]} total cases routed to ${FIRM_NAME}`)
  console.log(`\nFirm login (attorney/firm admin): ${FIRM_ADMIN_EMAIL} / ${FIRM_ADMIN_PASSWORD}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
