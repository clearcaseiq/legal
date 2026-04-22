import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

type SampleEvidence = {
  originalName: string
  category: 'medical_records' | 'bills'
  subcategory: string
  description: string
  aiSummary: string
  aiClassification: string
  aiHighlights: string[]
  dates: string[]
  totalAmount?: number
  dollarAmounts?: string[]
  icdCodes?: string[]
  cptCodes?: string[]
  entities?: Record<string, unknown>
  keywords: string[]
  timeline: string
  content: string
}

const sampleEvidence: SampleEvidence[] = [
  {
    originalName: 'cedars-urgent-care-record-2025-01-14.txt',
    category: 'medical_records',
    subcategory: 'urgent_care_record',
    description: 'Initial urgent care evaluation two days after collision.',
    aiSummary: 'Urgent care note documenting cervical strain, lumbar pain, headaches, and the need for imaging follow-up.',
    aiClassification: 'medical_records',
    aiHighlights: ['Initial evaluation', 'Cervical strain diagnosis', 'Work restrictions noted'],
    dates: ['2025-01-14'],
    icdCodes: ['S13.4XXA', 'S39.012A', 'R51.9'],
    cptCodes: ['99204'],
    entities: { provider: 'Cedars Urgent Care', facility: 'Cedars Urgent Care - Culver City' },
    keywords: ['urgent care', 'whiplash', 'cervical strain', 'lumbar pain', 'headache'],
    timeline: 'Urgent care visit after collision with complaints of neck pain, low-back pain, and headache.',
    content: `CEDARS URGENT CARE - CULVER CITY
Date of Service: 2025-01-14
Patient: Elena Ramirez
DOB: 1991-06-22

Chief Complaint:
Rear-end collision on 2025-01-12. Neck pain, lower back pain, headaches, and dizziness.

Assessment:
- Cervical strain / whiplash
- Lumbar strain
- Post-traumatic headache

Plan:
- Start naproxen 500 mg BID
- Cyclobenzaprine 5 mg at bedtime
- Refer for cervical and lumbar MRI if symptoms continue
- Off work for 5 days, then light duty for 2 weeks

Provider:
Maya Patel, PA-C
Cedars Urgent Care - Culver City`,
  },
  {
    originalName: 'southern-cal-imaging-mri-report-2025-01-28.txt',
    category: 'medical_records',
    subcategory: 'imaging_report',
    description: 'MRI reports for cervical and lumbar spine after persistent symptoms.',
    aiSummary: 'MRI report noting cervical disc protrusion at C5-6 and lumbar annular tear at L4-5 with radicular complaints.',
    aiClassification: 'medical_records',
    aiHighlights: ['MRI cervical spine', 'MRI lumbar spine', 'Disc findings'],
    dates: ['2025-01-28'],
    icdCodes: ['M50.222', 'M51.26'],
    cptCodes: ['72141', '72148'],
    entities: { provider: 'Southern California Imaging', radiologist: 'Dr. Helen Kwan' },
    keywords: ['mri', 'cervical spine', 'lumbar spine', 'disc protrusion', 'annular tear'],
    timeline: 'MRI imaging confirmed cervical and lumbar findings following continuing pain and radicular symptoms.',
    content: `SOUTHERN CALIFORNIA IMAGING
Date of Study: 2025-01-28
Patient: Elena Ramirez

MRI CERVICAL SPINE WITHOUT CONTRAST
Finding: Small right paracentral disc protrusion at C5-6 with mild foraminal narrowing.

MRI LUMBAR SPINE WITHOUT CONTRAST
Finding: Annular tear with small posterior disc bulge at L4-5. Mild bilateral foraminal narrowing.

Impression:
1. C5-6 disc protrusion consistent with post-traumatic neck pain.
2. L4-5 annular tear with lumbar radicular complaints.

Radiologist:
Helen Kwan, MD`,
  },
  {
    originalName: 'west-la-orthopedics-consult-2025-02-03.txt',
    category: 'medical_records',
    subcategory: 'specialist_consult',
    description: 'Orthopedic consultation recommending PT and pain management.',
    aiSummary: 'Orthopedic specialist links ongoing symptoms to the collision and recommends physical therapy plus pain-management consult.',
    aiClassification: 'medical_records',
    aiHighlights: ['Orthopedic consult', 'Causation opinion', 'PT prescription'],
    dates: ['2025-02-03'],
    icdCodes: ['M54.2', 'M54.50', 'M54.16'],
    cptCodes: ['99244'],
    entities: { provider: 'West LA Orthopedics', physician: 'Dr. Aaron Feldman' },
    keywords: ['orthopedics', 'causation', 'physical therapy', 'radiculopathy'],
    timeline: 'Orthopedic consultation recommended eight weeks of PT and continued activity restriction.',
    content: `WEST LA ORTHOPEDICS
Consult Date: 2025-02-03
Patient: Elena Ramirez

History:
Persistent neck pain radiating into right shoulder and intermittent low-back pain radiating into left leg since motor-vehicle collision on 2025-01-12.

Assessment:
- Cervicalgia with right upper extremity radicular symptoms
- Lumbar pain with intermittent left leg paresthesias

Opinion:
Symptoms are consistent with the mechanism of injury described in the collision.

Treatment Plan:
- Physical therapy 2x/week for 8 weeks
- Continue anti-inflammatory medication
- Refer to pain management if symptoms persist

Signed:
Aaron Feldman, MD`,
  },
  {
    originalName: 'movewell-pt-progress-note-2025-03-11.txt',
    category: 'medical_records',
    subcategory: 'physical_therapy_note',
    description: 'Physical therapy progress note showing ongoing but improving symptoms.',
    aiSummary: 'PT note documents guarded range of motion, sleep disruption, lifting restriction, and modest improvement after several visits.',
    aiClassification: 'medical_records',
    aiHighlights: ['PT progress note', 'Range-of-motion deficits', 'Functional limitations'],
    dates: ['2025-03-11'],
    cptCodes: ['97110', '97140', '97530'],
    entities: { provider: 'MoveWell Physical Therapy', therapist: 'Jenna Morales, DPT' },
    keywords: ['physical therapy', 'range of motion', 'sleep disruption', 'lifting restriction'],
    timeline: 'Physical therapy documented gradual improvement but ongoing neck and back limitations affecting work and sleep.',
    content: `MOVEWELL PHYSICAL THERAPY
Progress Note Date: 2025-03-11
Patient: Elena Ramirez

Subjective:
Neck pain 5/10, low-back pain 4/10. Reports difficulty sleeping through the night and pain with lifting more than 10 pounds.

Objective:
- Cervical rotation limited 25%
- Lumbar flexion limited 20%
- Guarding with prolonged sitting

Assessment:
Patient is making gradual progress but remains symptomatic and limited for work activities.

Plan:
Continue PT two times weekly for four additional weeks.

Therapist:
Jenna Morales, DPT`,
  },
  {
    originalName: 'pacific-neurology-follow-up-2025-02-18.txt',
    category: 'medical_records',
    subcategory: 'neurology_follow_up',
    description: 'Neurology follow-up for headaches, dizziness, and concentration complaints after collision.',
    aiSummary: 'Neurology note documents post-traumatic headaches, vestibular symptoms, and mild cognitive complaints with recommendation for conservative management.',
    aiClassification: 'medical_records',
    aiHighlights: ['Neurology follow-up', 'Post-traumatic headaches', 'Cognitive symptoms'],
    dates: ['2025-02-18'],
    icdCodes: ['G44.319', 'R42', 'R41.840'],
    cptCodes: ['99245'],
    entities: { provider: 'Pacific Neurology Group', physician: 'Dr. Sofia Nguyen' },
    keywords: ['neurology', 'headaches', 'dizziness', 'concentration', 'post-traumatic'],
    timeline: 'Neurology follow-up addressed persistent headaches, dizziness, and concentration issues after the collision.',
    content: `PACIFIC NEUROLOGY GROUP
Follow-Up Date: 2025-02-18
Patient: Elena Ramirez

History:
Ongoing post-traumatic headaches 3-4 times per week, intermittent dizziness with rapid head turns, and difficulty concentrating at work since the 2025-01-12 collision.

Assessment:
- Post-traumatic headache
- Vestibular symptoms / dizziness
- Mild concentration difficulty secondary to collision-related symptoms

Plan:
- Continue headache diary
- Reduce screen exposure during symptom flares
- Vestibular home exercises reviewed
- Follow up in 4 weeks if symptoms persist

Signed:
Sofia Nguyen, MD`,
  },
  {
    originalName: 'coastal-pain-management-consult-2025-03-20.txt',
    category: 'medical_records',
    subcategory: 'pain_management_consult',
    description: 'Pain management consultation after ongoing neck and low-back pain despite therapy.',
    aiSummary: 'Pain management consult recommends cervical trigger-point injections, lumbar epidural consideration, and continued therapy.',
    aiClassification: 'medical_records',
    aiHighlights: ['Pain management consult', 'Injection discussion', 'Persistent symptoms'],
    dates: ['2025-03-20'],
    icdCodes: ['M54.2', 'M54.16', 'M79.18'],
    cptCodes: ['99204'],
    entities: { provider: 'Coastal Pain Management', physician: 'Dr. Reza Khoury' },
    keywords: ['pain management', 'trigger point', 'epidural', 'persistent pain'],
    timeline: 'Pain management consultation documented persistent cervical and lumbar pain despite several weeks of physical therapy.',
    content: `COASTAL PAIN MANAGEMENT
Consult Date: 2025-03-20
Patient: Elena Ramirez

Chief Complaints:
Persistent neck pain, right trapezius spasm, low-back pain radiating into left buttock, and incomplete relief after physical therapy.

Assessment:
- Myofascial cervical pain
- Lumbar radicular pain

Recommendations:
- Continue physical therapy
- Proceed with cervical trigger-point injections
- If lumbar symptoms continue, consider left L4-5 epidural steroid injection

Signed:
Reza Khoury, MD`,
  },
  {
    originalName: 'coastal-pain-procedure-note-2025-04-02.txt',
    category: 'medical_records',
    subcategory: 'procedure_note',
    description: 'Procedure note for lumbar epidural steroid injection.',
    aiSummary: 'Procedure note documents left L4-5 transforaminal epidural steroid injection performed for persistent lumbar radicular pain.',
    aiClassification: 'medical_records',
    aiHighlights: ['Procedure note', 'Epidural steroid injection', 'Lumbar radicular pain'],
    dates: ['2025-04-02'],
    icdCodes: ['M54.16'],
    cptCodes: ['64483'],
    entities: { provider: 'Coastal Pain Management', physician: 'Dr. Reza Khoury' },
    keywords: ['epidural', 'procedure', 'lumbar', 'radicular pain', 'injection'],
    timeline: 'Pain management procedure note recorded a lumbar epidural steroid injection for ongoing radicular complaints.',
    content: `COASTAL PAIN MANAGEMENT
Procedure Date: 2025-04-02
Patient: Elena Ramirez

Procedure:
Left L4-5 transforaminal epidural steroid injection under fluoroscopic guidance.

Indication:
Persistent low-back pain with radiation despite conservative care.

Outcome:
Patient tolerated procedure well. Temporary reduction in leg pain reported immediately post-procedure.

Post-Procedure Plan:
Continue home exercises and follow up in two weeks.

Signed:
Reza Khoury, MD`,
  },
  {
    originalName: 'west-la-orthopedics-follow-up-2025-04-16.txt',
    category: 'medical_records',
    subcategory: 'orthopedic_follow_up',
    description: 'Orthopedic follow-up after injection and continued therapy.',
    aiSummary: 'Orthopedic follow-up notes modest improvement in low-back pain after injection but persistent neck stiffness and work restrictions.',
    aiClassification: 'medical_records',
    aiHighlights: ['Orthopedic follow-up', 'Work restrictions continued', 'Partial improvement'],
    dates: ['2025-04-16'],
    icdCodes: ['M54.2', 'M54.50'],
    cptCodes: ['99214'],
    entities: { provider: 'West LA Orthopedics', physician: 'Dr. Aaron Feldman' },
    keywords: ['follow-up', 'orthopedics', 'work restrictions', 'partial improvement'],
    timeline: 'Orthopedic follow-up documented partial improvement but ongoing neck stiffness and lifting restrictions.',
    content: `WEST LA ORTHOPEDICS
Follow-Up Date: 2025-04-16
Patient: Elena Ramirez

Interval History:
Patient reports lumbar symptoms improved after injection, but neck stiffness, right trapezius tightness, and pain with prolonged computer use continue.

Assessment:
- Improving lumbar pain
- Ongoing cervical myofascial pain

Plan:
- Continue physical therapy for 4 more weeks
- Continue light duty and no lifting over 15 pounds
- Reassess in one month

Signed:
Aaron Feldman, MD`,
  },
  {
    originalName: 'movewell-pt-discharge-note-2025-04-28.txt',
    category: 'medical_records',
    subcategory: 'physical_therapy_discharge',
    description: 'Physical therapy discharge note after extended course of care.',
    aiSummary: 'PT discharge note records improved mobility with residual pain during prolonged sitting and lifting, plus a home exercise plan.',
    aiClassification: 'medical_records',
    aiHighlights: ['PT discharge', 'Residual limitations', 'Home exercise program'],
    dates: ['2025-04-28'],
    cptCodes: ['97110', '97530'],
    entities: { provider: 'MoveWell Physical Therapy', therapist: 'Jenna Morales, DPT' },
    keywords: ['discharge note', 'physical therapy', 'home exercise', 'residual pain'],
    timeline: 'Physical therapy discharge documented overall progress but persistent symptoms with prolonged sitting and heavier lifting.',
    content: `MOVEWELL PHYSICAL THERAPY
Discharge Note Date: 2025-04-28
Patient: Elena Ramirez

Course of Care:
Completed 12 visits of physical therapy following January 2025 motor-vehicle collision.

Status at Discharge:
- Cervical range of motion improved
- Lumbar pain reduced but still present with prolonged sitting
- Residual pain with lifting more than 20 pounds

Plan:
Continue independent home exercise program. Follow up with orthopedics as needed.

Therapist:
Jenna Morales, DPT`,
  },
  {
    originalName: 'cedars-urgent-care-bill-2025-01-14.txt',
    category: 'bills',
    subcategory: 'facility_bill',
    description: 'Urgent care facility bill for initial treatment after crash.',
    aiSummary: 'Initial urgent care billing statement totaling $1,842.50 for evaluation, medication, and supplies.',
    aiClassification: 'bills',
    aiHighlights: ['Facility statement', '$1,842.50 balance', 'Evaluation and medication charges'],
    dates: ['2025-01-14'],
    totalAmount: 1842.5,
    dollarAmounts: ['$1,250.00', '$265.00', '$327.50'],
    cptCodes: ['99204', 'J1885'],
    entities: { provider: 'Cedars Urgent Care Billing', account: 'CUC-220194' },
    keywords: ['bill', 'statement', 'urgent care', 'balance', 'charges'],
    timeline: 'Initial urgent care bill reflects evaluation, injection, and supply charges from first treatment visit.',
    content: `CEDARS URGENT CARE BILLING STATEMENT
Statement Date: 2025-01-20
Date of Service: 2025-01-14
Patient: Elena Ramirez
Account Number: CUC-220194

Charges:
Office evaluation CPT 99204 .......... $1,250.00
Medication administration ............ $265.00
Supplies and service fees ............ $327.50

TOTAL BALANCE DUE .................... $1,842.50`,
  },
  {
    originalName: 'southern-cal-imaging-invoice-2025-01-28.txt',
    category: 'bills',
    subcategory: 'imaging_bill',
    description: 'Imaging invoice for cervical and lumbar MRI studies.',
    aiSummary: 'Imaging invoice totaling $3,680.00 for cervical and lumbar MRI studies ordered after persistent pain.',
    aiClassification: 'bills',
    aiHighlights: ['Imaging invoice', '$3,680.00 total', 'Cervical and lumbar MRI charges'],
    dates: ['2025-01-28'],
    totalAmount: 3680,
    dollarAmounts: ['$1,760.00', '$1,920.00'],
    cptCodes: ['72141', '72148'],
    entities: { provider: 'Southern California Imaging Billing', account: 'SCI-88190' },
    keywords: ['invoice', 'mri', 'imaging', 'radiology', 'balance'],
    timeline: 'Imaging invoice documents MRI charges tied to the workup for persistent post-collision symptoms.',
    content: `SOUTHERN CALIFORNIA IMAGING
Invoice Date: 2025-02-01
Date of Service: 2025-01-28
Patient: Elena Ramirez
Account: SCI-88190

Charges:
MRI Cervical Spine ................... $1,760.00
MRI Lumbar Spine ..................... $1,920.00

TOTAL AMOUNT DUE ..................... $3,680.00`,
  },
  {
    originalName: 'movewell-pt-billing-ledger-march-2025.txt',
    category: 'bills',
    subcategory: 'therapy_bill',
    description: 'Physical therapy ledger for eight visits in February and March.',
    aiSummary: 'PT billing ledger totaling $2,240.00 for eight sessions with therapeutic exercise and manual therapy.',
    aiClassification: 'bills',
    aiHighlights: ['PT ledger', '8 visits', '$2,240.00 total charges'],
    dates: ['2025-02-10', '2025-02-17', '2025-02-24', '2025-03-03', '2025-03-11'],
    totalAmount: 2240,
    dollarAmounts: ['$280.00', '$280.00', '$280.00', '$280.00', '$280.00', '$280.00', '$280.00', '$280.00'],
    cptCodes: ['97110', '97140', '97530'],
    entities: { provider: 'MoveWell Physical Therapy', account: 'MWPT-5521' },
    keywords: ['physical therapy', 'ledger', 'manual therapy', 'therapeutic exercise', 'visits'],
    timeline: 'Therapy billing ledger reflects repeated treatment dates and ongoing rehabilitation charges.',
    content: `MOVEWELL PHYSICAL THERAPY
Billing Ledger - March 2025
Patient: Elena Ramirez
Account: MWPT-5521

Visit Dates:
2025-02-10  $280.00
2025-02-17  $280.00
2025-02-24  $280.00
2025-03-03  $280.00
2025-03-11  $280.00
2025-03-18  $280.00
2025-03-25  $280.00
2025-03-31  $280.00

Total Charges: $2,240.00`,
  },
]

async function ensureUser() {
  const email = 'rich.medical.case@example.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing

  const passwordHash = await bcrypt.hash('password1234', 12)
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Elena',
      lastName: 'Ramirez',
      phone: '(310) 555-0182',
      role: 'client',
      isActive: true,
      emailVerified: true,
    },
  })
}

async function main() {
  const user = await ensureUser()
  const uploadDir = path.join(process.cwd(), 'uploads', 'evidence')
  fs.mkdirSync(uploadDir, { recursive: true })

  const facts = {
    claimType: 'auto',
    venue: { state: 'CA', county: 'Los Angeles' },
    incident: {
      date: '2025-01-12',
      location: 'I-10 near Culver City, Los Angeles, CA',
      narrative:
        'Elena Ramirez was rear-ended at freeway speed while stopped in traffic, causing immediate neck pain, low-back pain, headaches, and dizziness.',
      parties: ['Elena Ramirez (plaintiff)', 'Rear driver (defendant)'],
      timeline: [
        { label: 'Rear-end freeway collision', order: 1, approxDate: '2025-01-12' },
        { label: 'Urgent care visit', order: 2, approxDate: '2025-01-14' },
        { label: 'MRI imaging', order: 3, approxDate: '2025-01-28' },
        { label: 'Orthopedic consult', order: 4, approxDate: '2025-02-03' },
        { label: 'Physical therapy course', order: 5, approxDate: '2025-02-10' },
        { label: 'Neurology follow-up', order: 6, approxDate: '2025-02-18' },
        { label: 'Pain management consult', order: 7, approxDate: '2025-03-20' },
        { label: 'Lumbar epidural injection', order: 8, approxDate: '2025-04-02' },
        { label: 'Orthopedic re-evaluation', order: 9, approxDate: '2025-04-16' },
        { label: 'PT discharge visit', order: 10, approxDate: '2025-04-28' },
      ],
    },
    liability: {
      fault: 'other_party',
      confidence: 8,
      evidence: ['Rear-end impact', 'Vehicle damage photos', 'Consistent treatment history'],
      notes: 'Liability appears strong because plaintiff was stopped in traffic when struck from behind.',
    },
    injuries: [
      { bodyPart: 'neck', severity: 'moderate', diagnosed: true, description: 'Whiplash / cervical strain' },
      { bodyPart: 'lower back', severity: 'moderate', diagnosed: true, description: 'Lumbar strain with radicular complaints' },
      { bodyPart: 'head', severity: 'mild', diagnosed: true, description: 'Post-traumatic headaches' },
    ],
    treatment: [
      {
        date: '2025-01-14',
        provider: 'Cedars Urgent Care',
        type: 'Urgent care',
        diagnosis: 'Cervical strain, lumbar strain, post-traumatic headache',
        treatment: 'Evaluation, medication, work restriction',
        notes: 'Symptoms began immediately after rear-end collision.',
        charges: 1842.5,
      },
      {
        date: '2025-01-28',
        provider: 'Southern California Imaging',
        type: 'Imaging',
        diagnosis: 'C5-6 disc protrusion and L4-5 annular tear',
        treatment: 'Cervical and lumbar MRI',
        charges: 3680,
      },
      {
        date: '2025-02-03',
        provider: 'West LA Orthopedics',
        type: 'Orthopedic consultation',
        diagnosis: 'Cervicalgia and lumbar pain with radicular symptoms',
        treatment: 'Specialist evaluation and PT prescription',
        charges: 620,
      },
      {
        date: '2025-02-10',
        provider: 'MoveWell Physical Therapy',
        type: 'Physical therapy',
        diagnosis: 'Neck and low-back pain after collision',
        treatment: 'Eight sessions of therapy over 7 weeks',
        notes: 'Ongoing pain with sleep disruption and lifting limitations.',
        charges: 2240,
      },
      {
        date: '2025-02-18',
        provider: 'Pacific Neurology Group',
        type: 'Neurology follow-up',
        diagnosis: 'Post-traumatic headaches, dizziness, concentration complaints',
        treatment: 'Neurology evaluation and symptom management plan',
        charges: 780,
      },
      {
        date: '2025-03-20',
        provider: 'Coastal Pain Management',
        type: 'Pain management consultation',
        diagnosis: 'Persistent cervical and lumbar pain',
        treatment: 'Interventional pain consult and injection planning',
        charges: 690,
      },
      {
        date: '2025-04-02',
        provider: 'Coastal Pain Management',
        type: 'Procedure',
        diagnosis: 'Lumbar radicular pain',
        treatment: 'Left L4-5 transforaminal epidural steroid injection',
        charges: 2150,
      },
      {
        date: '2025-04-16',
        provider: 'West LA Orthopedics',
        type: 'Orthopedic follow-up',
        diagnosis: 'Improving lumbar pain with ongoing cervical stiffness',
        treatment: 'Follow-up evaluation and extension of work restrictions',
        charges: 420,
      },
      {
        date: '2025-04-28',
        provider: 'MoveWell Physical Therapy',
        type: 'Physical therapy discharge',
        diagnosis: 'Residual cervical and lumbar pain with functional improvement',
        treatment: 'Discharge evaluation and home exercise planning',
        charges: 310,
      },
    ],
    damages: {
      med_charges: 12732.5,
      med_paid: 4150,
      wage_loss: 3400,
      services: 600,
      workImpact:
        'Missed one full workweek and remained on light duty for three additional weeks because prolonged sitting and lifting increased pain.',
    },
    insurance: {
      at_fault_party: 'State Farm',
      own_insurance: 'Blue Shield of California',
      policy_limit: 100000,
      uninsured: false,
    },
    consents: { tos: true, privacy: true, ml_use: true, hipaa: true },
  }

  const assessment = await prisma.assessment.create({
    data: {
      userId: user.id,
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      status: 'COMPLETED',
      facts: JSON.stringify(facts),
    },
  })

  await prisma.prediction.create({
    data: {
      assessmentId: assessment.id,
      modelVersion: 'seeded-demo-v1',
      viability: JSON.stringify({
        overall: 0.78,
        liability: 0.86,
        damages: 0.74,
        treatment: 0.81,
      }),
      bands: JSON.stringify({
        low: [28000, 42000],
        mid: [42000, 68000],
        high: [68000, 98000],
        p25: 35000,
        median: 56000,
        p75: 81000,
      }),
      explain: JSON.stringify([
        { feature: 'rear_end_collision', impact: 'positive', detail: 'Rear-end freeway impact supports liability.' },
        { feature: 'consistent_treatment', impact: 'positive', detail: 'Urgent care, imaging, ortho, and PT create a coherent treatment story.' },
        { feature: 'medical_specials', impact: 'positive', detail: 'Documented bills and records support economic damages.' },
      ]),
    },
  })

  for (const sample of sampleEvidence) {
    const filename = `${uuidv4()}-${sample.originalName}`
    const filePath = path.join(uploadDir, filename)
    fs.writeFileSync(filePath, sample.content, 'utf-8')
    const stats = fs.statSync(filePath)

    await prisma.evidenceFile.create({
      data: {
        userId: user.id,
        assessmentId: assessment.id,
        originalName: sample.originalName,
        filename,
        mimetype: 'text/plain',
        size: stats.size,
        filePath,
        fileUrl: `/uploads/evidence/${filename}`,
        category: sample.category,
        subcategory: sample.subcategory,
        description: sample.description,
        dataType: 'structured',
        tags: JSON.stringify([sample.category, sample.subcategory, 'sample_case', 'rich_medical_case']),
        relevanceScore: sample.category === 'medical_records' ? 0.92 : 0.88,
        uploadMethod: 'file_picker',
        processingStatus: 'completed',
        ocrText: sample.content,
        aiSummary: sample.aiSummary,
        aiClassification: sample.aiClassification,
        aiHighlights: JSON.stringify(sample.aiHighlights),
        isHIPAA: sample.category === 'medical_records',
        accessLevel: 'private',
        isVerified: false,
        provenanceSource: 'script_seed',
        provenanceNotes: 'Rich sample plaintiff case with medical chronology and bills',
        extractedData: {
          create: {
            icdCodes: sample.icdCodes ? JSON.stringify(sample.icdCodes) : null,
            cptCodes: sample.cptCodes ? JSON.stringify(sample.cptCodes) : null,
            dollarAmounts: sample.dollarAmounts ? JSON.stringify(sample.dollarAmounts) : null,
            totalAmount: sample.totalAmount ?? null,
            currency: 'USD',
            dates: JSON.stringify(sample.dates),
            timeline: sample.timeline,
            entities: sample.entities ? JSON.stringify(sample.entities) : null,
            keywords: JSON.stringify(sample.keywords),
            confidence: 0.94,
          },
        },
      },
    })
  }

  console.log(JSON.stringify({
    user: {
      email: user.email,
      password: 'password1234',
    },
    assessmentId: assessment.id,
    resultsUrl: `http://localhost:5173/results/${assessment.id}`,
    evidenceCount: sampleEvidence.length,
    medicalRecordCount: sampleEvidence.filter((item) => item.category === 'medical_records').length,
    billCount: sampleEvidence.filter((item) => item.category === 'bills').length,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
