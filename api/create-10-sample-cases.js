import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const caseTypes = ['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death', 'high_severity_surgery']
const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI']
const counties = {
  'CA': ['Los Angeles', 'Orange', 'San Diego', 'San Francisco', 'Alameda'],
  'NY': ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Nassau'],
  'TX': ['Harris', 'Dallas', 'Tarrant', 'Bexar', 'Travis'],
  'FL': ['Miami-Dade', 'Broward', 'Palm Beach', 'Orange', 'Hillsborough'],
  'IL': ['Cook', 'DuPage', 'Lake', 'Will', 'Kane'],
  'PA': ['Philadelphia', 'Allegheny', 'Montgomery', 'Bucks', 'Delaware'],
  'OH': ['Cuyahoga', 'Franklin', 'Hamilton', 'Summit', 'Lucas'],
  'GA': ['Fulton', 'Gwinnett', 'Cobb', 'DeKalb', 'Clayton'],
  'NC': ['Mecklenburg', 'Wake', 'Guilford', 'Forsyth', 'Durham'],
  'MI': ['Wayne', 'Oakland', 'Macomb', 'Kent', 'Genesee']
}

const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee']

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

async function createSampleCases() {
  try {
    console.log('Creating 10 sample cases with full data...\n')

    const users = []
    const assessments = []

    for (let i = 1; i <= 10; i++) {
      // Create user
      const firstName = randomElement(firstNames)
      const lastName = randomElement(lastNames)
      const email = `sample.user${i}@example.com`
      const password = 'password123'
      
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        const passwordHash = await bcrypt.hash(password, 12)
        user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            phone: `(555) ${100 + i}${100 + i}-${1000 + i}${1000 + i}`,
            isActive: true,
            emailVerified: true
          }
        })
        console.log(`✅ Created user ${i}: ${email} (Password: ${password})`)
      } else {
        console.log(`ℹ️  User ${i} already exists: ${email} (Password: ${password})`)
      }
      users.push({ user, email, password })

      // Generate case data
      const claimType = randomElement(caseTypes)
      const state = randomElement(states)
      const county = randomElement(counties[state])
      const incidentDate = randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31))
      
      // Generate comprehensive case facts based on claim type
      let facts = generateCaseFacts(claimType, state, county, incidentDate, firstName, lastName, i)
      
      // Create assessment
      const assessment = await prisma.assessment.create({
        data: {
          userId: user.id,
          claimType,
          venueState: state,
          venueCounty: county,
          status: 'COMPLETED',
          facts: JSON.stringify(facts)
        }
      })

      assessments.push(assessment)
      console.log(`   Created case ${i}: ${claimType} in ${county}, ${state} (ID: ${assessment.id})\n`)
    }

    console.log('\n✅ Successfully created 10 sample cases!')
    console.log('\n📋 User Login Credentials:')
    users.forEach((u, i) => {
      console.log(`   ${i + 1}. Email: ${u.email} | Password: ${u.password}`)
    })
    console.log('\n📊 Case Summary:')
    assessments.forEach((a, i) => {
      const facts = JSON.parse(a.facts)
      console.log(`   ${i + 1}. ${a.claimType} - ${a.venueCounty}, ${a.venueState} (ID: ${a.id})`)
    })

  } catch (error) {
    console.error('Error creating sample cases:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

function generateCaseFacts(claimType, state, county, incidentDate, firstName, lastName, caseNum) {
  const baseDate = new Date(incidentDate)
  const medicalChronology = []
  let totalMedicalCharges = 0
  let totalWageLoss = 0

  let facts = {
    claimType,
    venue: { state, county },
    incident: {
      date: baseDate.toISOString().split('T')[0],
      location: '',
      narrative: '',
      parties: []
    },
    liability: {
      fault: '',
      evidence: [],
      notes: ''
    },
    injuries: [],
    treatment: [],
    damages: {
      med_charges: 0,
      med_paid: 0,
      wage_loss: 0,
      services: 0
    },
    insurance: {
      at_fault_party: '',
      policy_limit: 0,
      own_insurance: '',
      uninsured: false
    },
    consents: {
      tos: true,
      privacy: true,
      ml_use: true,
      hipaa: true
    }
  }

  // Generate case-specific data
  switch (claimType) {
    case 'auto':
      facts.incident.location = `${Math.floor(Math.random() * 9999)} Main Street, ${county}, ${state}`
      facts.incident.narrative = `Rear-end collision at traffic light. ${firstName} was stopped at a red light when another vehicle failed to stop and collided with the rear of their vehicle. The impact caused significant damage to both vehicles.`
      facts.incident.parties = [`${firstName} ${lastName} (plaintiff)`, 'Other Driver (defendant)', 'Witness - Jane Doe']
      facts.liability.fault = 'other_party'
      facts.liability.evidence = ['Police report', 'Witness statements', 'Traffic camera footage', 'Vehicle damage photos']
      facts.liability.notes = 'Defendant admitted fault at scene. Police report confirms defendant was at fault.'
      
      // Injuries
      facts.injuries = [
        {
          type: 'neck',
          severity: 3,
          description: 'Cervical strain and whiplash injury',
          diagnosed: true,
          ongoing: true,
          date: baseDate.toISOString().split('T')[0]
        },
        {
          type: 'back',
          severity: 2,
          description: 'Lumbar strain and lower back pain',
          diagnosed: true,
          ongoing: true,
          date: baseDate.toISOString().split('T')[0]
        },
        {
          type: 'shoulder',
          severity: 2,
          description: 'Right shoulder pain and limited range of motion',
          diagnosed: true,
          ongoing: false,
          date: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ]

      // Medical Chronology
      const erDate = new Date(baseDate)
      medicalChronology.push({
        date: erDate.toISOString().split('T')[0],
        provider: 'Emergency Room - County General Hospital',
        type: 'emergency',
        diagnosis: 'Cervical strain, lumbar strain, right shoulder pain',
        treatment: 'X-rays, pain medication (Ibuprofen 800mg), muscle relaxants, discharge with follow-up instructions',
        charges: 3500
      })
      totalMedicalCharges += 3500

      const primaryCareDate = new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000)
      medicalChronology.push({
        date: primaryCareDate.toISOString().split('T')[0],
        provider: `Dr. ${randomElement(['Smith', 'Johnson', 'Williams'])} - Primary Care`,
        type: 'primary_care',
        diagnosis: 'Persistent neck and back pain, right shoulder discomfort',
        treatment: 'Physical examination, prescribed physical therapy, pain management',
        charges: 450
      })
      totalMedicalCharges += 450

      // Physical Therapy (12 visits)
      for (let i = 0; i < 12; i++) {
        const ptDate = new Date(baseDate.getTime() + (7 + i * 7) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: ptDate.toISOString().split('T')[0],
          provider: 'Physical Therapy Center - Main Street',
          type: 'physical_therapy',
          diagnosis: 'Cervical and lumbar strain rehabilitation',
          treatment: `PT session ${i + 1}: Range of motion exercises, stretching, strengthening, heat/ice therapy`,
          charges: 150
        })
        totalMedicalCharges += 150
      }

      // Chiropractic (8 visits)
      for (let i = 0; i < 8; i++) {
        const chiroDate = new Date(baseDate.getTime() + (10 + i * 5) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: chiroDate.toISOString().split('T')[0],
          provider: 'Chiropractic Wellness Center',
          type: 'chiropractic',
          diagnosis: 'Spinal misalignment and muscle tension',
          treatment: `Chiropractic adjustment session ${i + 1}: Spinal manipulation, soft tissue work, therapeutic exercises`,
          charges: 120
        })
        totalMedicalCharges += 120
      }

      // Specialist visit
      const specialistDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      medicalChronology.push({
        date: specialistDate.toISOString().split('T')[0],
        provider: 'Dr. Martinez - Orthopedic Specialist',
        type: 'specialist',
        diagnosis: 'Persistent cervical and lumbar pain, possible disc involvement',
        treatment: 'MRI ordered, continued physical therapy recommended, pain management',
        charges: 850
      })
      totalMedicalCharges += 850

      // MRI
      const mriDate = new Date(baseDate.getTime() + 35 * 24 * 60 * 60 * 1000)
      medicalChronology.push({
        date: mriDate.toISOString().split('T')[0],
        provider: 'Imaging Center - MRI Department',
        type: 'diagnostic',
        diagnosis: 'MRI of cervical and lumbar spine',
        treatment: 'MRI scan completed, results reviewed with orthopedic specialist',
        charges: 2200
      })
      totalMedicalCharges += 2200

      facts.treatment = medicalChronology
      totalWageLoss = Math.floor(Math.random() * 5000) + 2000
      facts.damages = {
        med_charges: totalMedicalCharges,
        med_paid: Math.floor(totalMedicalCharges * 0.3),
        wage_loss: totalWageLoss,
        services: Math.floor(Math.random() * 1000) + 500
      }
      facts.insurance = {
        at_fault_party: randomElement(['State Farm', 'Allstate', 'Progressive', 'Geico', 'Farmers']),
        policy_limit: 25000,
        own_insurance: randomElement(['Aetna', 'Blue Cross', 'Cigna', 'UnitedHealthcare']),
        uninsured: false
      }
      break

    case 'slip_and_fall':
      facts.incident.location = `${randomElement(['Grocery Store', 'Restaurant', 'Retail Store', 'Shopping Mall'])} - ${Math.floor(Math.random() * 999)} ${randomElement(['Main', 'Oak', 'Park', 'First'])} Street, ${county}, ${state}`
      facts.incident.narrative = `Slipped and fell on wet floor that had recently been mopped. The establishment failed to place warning signs. ${firstName} fell and injured wrist and hip. Store employees confirmed the floor was just mopped without proper warning signage.`
      facts.incident.parties = [`${firstName} ${lastName} (plaintiff)`, 'Store Manager (witness)', 'Store Employee (witness)', `${randomElement(['ABC', 'XYZ', 'Main Street'])} Store (defendant)`]
      facts.liability.fault = 'premises_owner'
      facts.liability.evidence = ['Store surveillance footage', 'Witness statements', 'Incident report', 'Photos of wet floor', 'Medical records']
      facts.liability.notes = 'Store employee confirmed floor was mopped without warning signs. Clear premises liability.'
      
      facts.injuries = [
        {
          type: 'wrist',
          severity: 3,
          description: 'Sprained wrist with possible fracture',
          diagnosed: true,
          ongoing: false,
          date: baseDate.toISOString().split('T')[0]
        },
        {
          type: 'hip',
          severity: 2,
          description: 'Hip contusion and significant bruising',
          diagnosed: true,
          ongoing: false,
          date: baseDate.toISOString().split('T')[0]
        },
        {
          type: 'back',
          severity: 2,
          description: 'Lower back strain from fall impact',
          diagnosed: true,
          ongoing: true,
          date: baseDate.toISOString().split('T')[0]
        }
      ]

      // Medical Chronology
      medicalChronology.push({
        date: baseDate.toISOString().split('T')[0],
        provider: 'Emergency Room - City Hospital',
        type: 'emergency',
        diagnosis: 'Right wrist sprain, hip contusion, lower back strain',
        treatment: 'X-rays of wrist and hip, pain medication, wrist splint, discharge instructions',
        charges: 4200
      })
      totalMedicalCharges += 4200

      medicalChronology.push({
        date: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        provider: 'Dr. Anderson - Orthopedist',
        type: 'specialist',
        diagnosis: 'Right wrist sprain, follow-up on hip contusion',
        treatment: 'Physical examination, wrist X-ray review, continued splinting, pain management',
        charges: 650
      })
      totalMedicalCharges += 650

      for (let i = 0; i < 6; i++) {
        const ptDate = new Date(baseDate.getTime() + (5 + i * 7) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: ptDate.toISOString().split('T')[0],
          provider: 'Rehabilitation Center',
          type: 'physical_therapy',
          diagnosis: 'Wrist and back rehabilitation',
          treatment: `PT session ${i + 1}: Wrist exercises, back strengthening, range of motion`,
          charges: 180
        })
        totalMedicalCharges += 180
      }

      medicalChronology.push({
        date: new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        provider: 'Dr. Anderson - Orthopedist',
        type: 'specialist',
        diagnosis: 'Final follow-up, wrist healing well',
        treatment: 'Final examination, cleared for normal activities, discharged from care',
        charges: 450
      })
      totalMedicalCharges += 450

      facts.treatment = medicalChronology
      totalWageLoss = Math.floor(Math.random() * 3000) + 1500
      facts.damages = {
        med_charges: totalMedicalCharges,
        med_paid: Math.floor(totalMedicalCharges * 0.25),
        wage_loss: totalWageLoss,
        services: Math.floor(Math.random() * 800) + 400
      }
      facts.insurance = {
        at_fault_party: 'Store Commercial General Liability Insurance',
        policy_limit: 100000,
        own_insurance: randomElement(['Aetna', 'Blue Cross', 'Cigna']),
        uninsured: false
      }
      break

    case 'dog_bite':
      facts.incident.location = `Neighbor's property - ${Math.floor(Math.random() * 999)} ${randomElement(['Oak', 'Maple', 'Elm', 'Pine'])} Avenue, ${county}, ${state}`
      facts.incident.narrative = `Neighbor's dog escaped from their yard and attacked ${firstName} while walking on the sidewalk. The dog had a history of aggressive behavior. ${firstName} sustained deep puncture wounds requiring emergency medical treatment and stitches.`
      facts.incident.parties = [`${firstName} ${lastName} (plaintiff)`, 'Neighbor - Bob Johnson (defendant/owner)', 'Animal Control Officer', 'Witness - Neighbor']
      facts.liability.fault = 'dog_owner'
      facts.liability.evidence = ['Animal control report', 'Medical records', 'Photos of injuries', 'Witness statements', 'Dog bite history records']
      facts.liability.notes = 'Dog owner was aware of dog\'s aggressive tendencies. Animal control confirmed previous incidents.'
      
      facts.injuries = [
        {
          type: 'arm',
          severity: 4,
          description: 'Deep puncture wounds on right forearm requiring stitches',
          diagnosed: true,
          ongoing: true,
          date: baseDate.toISOString().split('T')[0]
        },
        {
          type: 'emotional',
          severity: 3,
          description: 'Anxiety, fear of dogs, sleep disturbances',
          diagnosed: true,
          ongoing: true,
          date: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ]

      medicalChronology.push({
        date: baseDate.toISOString().split('T')[0],
        provider: 'Emergency Room - Regional Medical Center',
        type: 'emergency',
        diagnosis: 'Multiple dog bite wounds, right forearm',
        treatment: 'Wound cleaning and debridement, tetanus shot, rabies prophylaxis, 12 stitches, antibiotics prescribed',
        charges: 5800
      })
      totalMedicalCharges += 5800

      medicalChronology.push({
        date: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        provider: 'Dr. Martinez - Primary Care',
        type: 'primary_care',
        diagnosis: 'Wound check, infection monitoring',
        treatment: 'Wound examination, dressing change, antibiotic review, infection check',
        charges: 350
      })
      totalMedicalCharges += 350

      medicalChronology.push({
        date: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        provider: 'Dr. Martinez - Primary Care',
        type: 'primary_care',
        diagnosis: 'Stitch removal, wound healing assessment',
        treatment: 'Stitches removed, wound healing well, scar management discussed',
        charges: 280
      })
      totalMedicalCharges += 280

      for (let i = 0; i < 4; i++) {
        const therapyDate = new Date(baseDate.getTime() + (10 + i * 7) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: therapyDate.toISOString().split('T')[0],
          provider: 'Counseling Services - Trauma Therapy',
          type: 'mental_health',
          diagnosis: 'Post-traumatic stress, anxiety related to dog attack',
          treatment: `Therapy session ${i + 1}: Cognitive behavioral therapy, anxiety management, coping strategies`,
          charges: 200
        })
        totalMedicalCharges += 200
      }

      facts.treatment = medicalChronology
      totalWageLoss = Math.floor(Math.random() * 2000) + 800
      facts.damages = {
        med_charges: totalMedicalCharges,
        med_paid: Math.floor(totalMedicalCharges * 0.2),
        wage_loss: totalWageLoss,
        services: Math.floor(Math.random() * 600) + 300
      }
      facts.insurance = {
        at_fault_party: 'Homeowner\'s Insurance - State Farm',
        policy_limit: 50000,
        own_insurance: randomElement(['Aetna', 'Blue Cross']),
        uninsured: false
      }
      break

    case 'medmal':
      facts.incident.location = `${randomElement(['City Hospital', 'Medical Center', 'Surgical Center'])} - ${county}, ${state}`
      facts.incident.narrative = `Medical malpractice during surgical procedure. ${firstName} underwent ${randomElement(['knee', 'shoulder', 'back'])} surgery where the surgeon made errors resulting in additional complications and required corrective procedures.`
      facts.incident.parties = [`${firstName} ${lastName} (plaintiff)`, 'Dr. Surgeon Name (defendant)', 'Hospital (defendant)', 'Medical Staff']
      facts.liability.fault = 'medical_provider'
      facts.liability.evidence = ['Medical records', 'Surgical reports', 'Expert medical opinions', 'Post-operative complications documentation']
      facts.liability.notes = 'Expert review confirms deviation from standard of care during surgical procedure.'
      
      facts.injuries = [
        {
          type: 'surgical_complication',
          severity: 4,
          description: 'Surgical error resulting in nerve damage and chronic pain',
          diagnosed: true,
          ongoing: true,
          date: baseDate.toISOString().split('T')[0]
        },
        {
          type: 'infection',
          severity: 3,
          description: 'Post-surgical infection requiring additional treatment',
          diagnosed: true,
          ongoing: false,
          date: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ]

      medicalChronology.push({
        date: baseDate.toISOString().split('T')[0],
        provider: 'Surgical Center',
        type: 'surgery',
        diagnosis: 'Initial surgical procedure',
        treatment: 'Surgical procedure performed, complications noted during procedure',
        charges: 45000
      })
      totalMedicalCharges += 45000

      medicalChronology.push({
        date: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        provider: 'Emergency Room - Hospital',
        type: 'emergency',
        diagnosis: 'Post-surgical infection and complications',
        treatment: 'Emergency treatment for infection, IV antibiotics, wound care',
        charges: 8500
      })
      totalMedicalCharges += 8500

      for (let i = 0; i < 20; i++) {
        const followupDate = new Date(baseDate.getTime() + (7 + i * 7) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: followupDate.toISOString().split('T')[0],
          provider: 'Dr. Specialist - Follow-up Care',
          type: 'specialist',
          diagnosis: 'Post-surgical complications management',
          treatment: `Follow-up visit ${i + 1}: Wound care, pain management, monitoring complications`,
          charges: 450
        })
        totalMedicalCharges += 450
      }

      medicalChronology.push({
        date: new Date(baseDate.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        provider: 'Surgical Center',
        type: 'surgery',
        diagnosis: 'Corrective surgical procedure',
        treatment: 'Additional surgery required to correct initial surgical errors',
        charges: 35000
      })
      totalMedicalCharges += 35000

      facts.treatment = medicalChronology
      totalWageLoss = Math.floor(Math.random() * 25000) + 10000
      facts.damages = {
        med_charges: totalMedicalCharges,
        med_paid: Math.floor(totalMedicalCharges * 0.4),
        wage_loss: totalWageLoss,
        services: Math.floor(Math.random() * 5000) + 2000
      }
      facts.insurance = {
        at_fault_party: 'Medical Malpractice Insurance',
        policy_limit: 1000000,
        own_insurance: randomElement(['Aetna', 'Blue Cross', 'Medicare']),
        uninsured: false
      }
      break

    case 'product':
      facts.incident.location = `${firstName}'s home - ${county}, ${state}`
      facts.incident.narrative = `Product liability case involving ${randomElement(['defective appliance', 'faulty medical device', 'unsafe consumer product'])} that caused injury. The product was defective and caused ${randomElement(['burns', 'lacerations', 'electrical shock'])}.`
      facts.incident.parties = [`${firstName} ${lastName} (plaintiff)`, 'Product Manufacturer (defendant)', 'Retailer (defendant)']
      facts.liability.fault = 'product_manufacturer'
      facts.liability.evidence = ['Product defect documentation', 'Medical records', 'Product recall notices', 'Expert engineering reports']
      facts.liability.notes = 'Product defect confirmed by expert analysis. Manufacturer aware of similar incidents.'
      
      facts.injuries = [
        {
          type: randomElement(['burns', 'lacerations', 'electrical']),
          severity: 3,
          description: 'Injury caused by defective product',
          diagnosed: true,
          ongoing: true,
          date: baseDate.toISOString().split('T')[0]
        }
      ]

      medicalChronology.push({
        date: baseDate.toISOString().split('T')[0],
        provider: 'Emergency Room',
        type: 'emergency',
        diagnosis: 'Product-related injury',
        treatment: 'Emergency treatment, wound care, pain management',
        charges: 3200
      })
      totalMedicalCharges += 3200

      for (let i = 0; i < 8; i++) {
        const visitDate = new Date(baseDate.getTime() + (3 + i * 7) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: visitDate.toISOString().split('T')[0],
          provider: 'Dr. Specialist',
          type: 'specialist',
          diagnosis: 'Ongoing treatment for product injury',
          treatment: `Treatment visit ${i + 1}: Wound care, monitoring healing, pain management`,
          charges: 380
        })
        totalMedicalCharges += 380
      }

      facts.treatment = medicalChronology
      totalWageLoss = Math.floor(Math.random() * 4000) + 2000
      facts.damages = {
        med_charges: totalMedicalCharges,
        med_paid: Math.floor(totalMedicalCharges * 0.3),
        wage_loss: totalWageLoss,
        services: Math.floor(Math.random() * 1000) + 500
      }
      facts.insurance = {
        at_fault_party: 'Product Liability Insurance',
        policy_limit: 500000,
        own_insurance: randomElement(['Aetna', 'Blue Cross']),
        uninsured: false
      }
      break

    case 'nursing_home_abuse':
      facts.incident.location = `${randomElement(['Sunset', 'Golden', 'Maple', 'Oak'])} Nursing Home - ${county}, ${state}`
      facts.incident.narrative = `Nursing home abuse and neglect case. ${firstName} suffered from ${randomElement(['bedsores', 'falls', 'medication errors', 'neglect'])} while under the care of the nursing home facility.`
      facts.incident.parties = [`${firstName} ${lastName} (plaintiff)`, 'Nursing Home Facility (defendant)', 'Staff Members']
      facts.liability.fault = 'nursing_home'
      facts.liability.evidence = ['Medical records', 'Nursing home records', 'Witness statements', 'Photos of injuries', 'State inspection reports']
      facts.liability.notes = 'Clear evidence of neglect and failure to provide adequate care.'
      
      facts.injuries = [
        {
          type: 'neglect',
          severity: 4,
          description: 'Severe bedsores and infections due to neglect',
          diagnosed: true,
          ongoing: true,
          date: baseDate.toISOString().split('T')[0]
        },
        {
          type: 'infection',
          severity: 3,
          description: 'Infections from untreated wounds',
          diagnosed: true,
          ongoing: false,
          date: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ]

      medicalChronology.push({
        date: baseDate.toISOString().split('T')[0],
        provider: 'Emergency Room - Hospital',
        type: 'emergency',
        diagnosis: 'Severe bedsores and infections from neglect',
        treatment: 'Emergency admission, wound debridement, IV antibiotics, specialized wound care',
        charges: 12000
      })
      totalMedicalCharges += 12000

      for (let i = 0; i < 15; i++) {
        const careDate = new Date(baseDate.getTime() + (2 + i * 2) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: careDate.toISOString().split('T')[0],
          provider: 'Wound Care Specialist',
          type: 'specialist',
          diagnosis: 'Wound care and infection management',
          treatment: `Wound care visit ${i + 1}: Dressing changes, debridement, infection monitoring`,
          charges: 450
        })
        totalMedicalCharges += 450
      }

      facts.treatment = medicalChronology
      totalWageLoss = 0 // Usually family member, not wage earner
      facts.damages = {
        med_charges: totalMedicalCharges,
        med_paid: Math.floor(totalMedicalCharges * 0.5),
        wage_loss: 0,
        services: Math.floor(Math.random() * 3000) + 1500
      }
      facts.insurance = {
        at_fault_party: 'Nursing Home Liability Insurance',
        policy_limit: 2000000,
        own_insurance: randomElement(['Medicare', 'Medicaid', 'Private Insurance']),
        uninsured: false
      }
      break

    case 'wrongful_death':
      facts.incident.location = `${randomElement(['Highway', 'Intersection', 'Workplace'])} - ${county}, ${state}`
      facts.incident.narrative = `Wrongful death case. ${firstName}'s ${randomElement(['spouse', 'parent', 'child'])} was killed in a ${randomElement(['car accident', 'workplace accident', 'medical malpractice incident'])}.`
      facts.incident.parties = [`${firstName} ${lastName} (plaintiff/representative)`, 'Deceased Family Member', 'At-Fault Party (defendant)']
      facts.liability.fault = 'other_party'
      facts.liability.evidence = ['Death certificate', 'Police/incident reports', 'Medical records', 'Witness statements', 'Expert reports']
      facts.liability.notes = 'Clear liability established. Wrongful death claim filed on behalf of estate.'
      
      facts.injuries = [
        {
          type: 'wrongful_death',
          severity: 5,
          description: 'Death of family member due to negligence',
          diagnosed: true,
          ongoing: false,
          date: baseDate.toISOString().split('T')[0]
        }
      ]

      medicalChronology.push({
        date: baseDate.toISOString().split('T')[0],
        provider: 'Emergency Room - Trauma Center',
        type: 'emergency',
        diagnosis: 'Fatal injuries from incident',
        treatment: 'Emergency medical treatment, life-saving measures attempted, pronounced deceased',
        charges: 25000
      })
      totalMedicalCharges += 25000

      medicalChronology.push({
        date: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        provider: 'Funeral Home',
        type: 'funeral',
        diagnosis: 'Funeral and burial services',
        treatment: 'Funeral arrangements, burial services, memorial',
        charges: 15000
      })
      totalMedicalCharges += 15000

      for (let i = 0; i < 6; i++) {
        const therapyDate = new Date(baseDate.getTime() + (7 + i * 14) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: therapyDate.toISOString().split('T')[0],
          provider: 'Grief Counseling Services',
          type: 'mental_health',
          diagnosis: 'Grief and trauma counseling',
          treatment: `Counseling session ${i + 1}: Grief therapy, trauma processing, family support`,
          charges: 250
        })
        totalMedicalCharges += 250
      }

      facts.treatment = medicalChronology
      totalWageLoss = 0
      facts.damages = {
        med_charges: totalMedicalCharges,
        med_paid: Math.floor(totalMedicalCharges * 0.3),
        wage_loss: 0,
        services: Math.floor(Math.random() * 5000) + 3000
      }
      facts.insurance = {
        at_fault_party: randomElement(['Auto Insurance', 'Workers Comp', 'Medical Malpractice Insurance']),
        policy_limit: 500000,
        own_insurance: 'N/A',
        uninsured: false
      }
      break

    case 'high_severity_surgery':
      facts.incident.location = `${randomElement(['Medical Center', 'Hospital', 'Surgical Facility'])} - ${county}, ${state}`
      facts.incident.narrative = `High severity surgical case. ${firstName} underwent ${randomElement(['spinal', 'cardiac', 'neurological'])} surgery with complications requiring extensive follow-up care and rehabilitation.`
      facts.incident.parties = [`${firstName} ${lastName} (plaintiff)`, 'Surgeon (defendant)', 'Hospital (defendant)', 'Medical Team']
      facts.liability.fault = 'medical_provider'
      facts.liability.evidence = ['Surgical records', 'Medical records', 'Expert medical opinions', 'Complication documentation']
      facts.liability.notes = 'Surgical complications and extended recovery period documented.'
      
      facts.injuries = [
        {
          type: 'surgical',
          severity: 4,
          description: 'Surgical complications requiring extended recovery',
          diagnosed: true,
          ongoing: true,
          date: baseDate.toISOString().split('T')[0]
        },
        {
          type: 'pain',
          severity: 4,
          description: 'Chronic pain and limited mobility',
          diagnosed: true,
          ongoing: true,
          date: new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ]

      medicalChronology.push({
        date: baseDate.toISOString().split('T')[0],
        provider: 'Surgical Center',
        type: 'surgery',
        diagnosis: 'Major surgical procedure',
        treatment: 'Complex surgical procedure performed, post-operative monitoring in ICU',
        charges: 75000
      })
      totalMedicalCharges += 75000

      for (let i = 0; i < 5; i++) {
        const icuDate = new Date(baseDate.getTime() + (1 + i) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: icuDate.toISOString().split('T')[0],
          provider: 'ICU - Hospital',
          type: 'hospital',
          diagnosis: 'Post-surgical intensive care',
          treatment: `ICU day ${i + 1}: Monitoring, pain management, complication management`,
          charges: 5000
        })
        totalMedicalCharges += 5000
      }

      for (let i = 0; i < 10; i++) {
        const hospitalDate = new Date(baseDate.getTime() + (6 + i) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: hospitalDate.toISOString().split('T')[0],
          provider: 'Hospital - Inpatient Care',
          type: 'hospital',
          diagnosis: 'Extended hospital stay for recovery',
          treatment: `Hospital day ${i + 1}: Recovery monitoring, physical therapy, pain management`,
          charges: 3000
        })
        totalMedicalCharges += 3000
      }

      for (let i = 0; i < 30; i++) {
        const rehabDate = new Date(baseDate.getTime() + (20 + i * 3) * 24 * 60 * 60 * 1000)
        medicalChronology.push({
          date: rehabDate.toISOString().split('T')[0],
          provider: 'Rehabilitation Center',
          type: 'rehabilitation',
          diagnosis: 'Post-surgical rehabilitation',
          treatment: `Rehab session ${i + 1}: Physical therapy, occupational therapy, mobility training`,
          charges: 400
        })
        totalMedicalCharges += 400
      }

      facts.treatment = medicalChronology
      totalWageLoss = Math.floor(Math.random() * 50000) + 20000
      facts.damages = {
        med_charges: totalMedicalCharges,
        med_paid: Math.floor(totalMedicalCharges * 0.5),
        wage_loss: totalWageLoss,
        services: Math.floor(Math.random() * 10000) + 5000
      }
      facts.insurance = {
        at_fault_party: 'Medical Malpractice Insurance',
        policy_limit: 2000000,
        own_insurance: randomElement(['Aetna', 'Blue Cross', 'Medicare']),
        uninsured: false
      }
      break
  }

  return facts
}

createSampleCases()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })
