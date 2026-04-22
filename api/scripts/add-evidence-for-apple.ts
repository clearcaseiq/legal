/**
 * Add 4 evidence files for user Apple.
 * Usage: pnpm run add:apple-evidence
 *
 * Finds user by firstName='Apple' or email containing 'apple',
 * uses their first assessment, or creates one if none exists.
 */
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

const EVIDENCE_CATEGORIES = ['police_report', 'medical_records', 'photos', 'bills'] as const
const SAMPLE_FILES = [
  { name: 'incident-report.txt', mimetype: 'text/plain', category: 'police_report' },
  { name: 'medical-records.txt', mimetype: 'text/plain', category: 'medical_records' },
  { name: 'injury-photo.txt', mimetype: 'text/plain', category: 'photos' },
  { name: 'medical-bill.txt', mimetype: 'text/plain', category: 'bills' }
]

async function main() {
  console.log('Adding 4 evidence files for user Apple...\n')

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { firstName: 'Apple' },
        { lastName: 'Apple' },
        { email: { contains: 'apple' } }
      ]
    }
  })

  if (!user) {
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.default.hash('password1234', 12)
    user = await prisma.user.create({
      data: {
        email: 'apple@example.com',
        passwordHash,
        firstName: 'Apple',
        lastName: 'User',
        role: 'client',
        isActive: true,
        emailVerified: false
      }
    })
    console.log('Created user Apple: apple@example.com (password: password1234)')
  }

  console.log(`Found user: ${user.email} (${user.firstName} ${user.lastName})`)

  let assessment = await prisma.assessment.findFirst({
    where: { userId: user.id }
  })

  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        userId: user.id,
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Los Angeles',
        status: 'COMPLETED',
        facts: JSON.stringify({
          claimType: 'auto',
          venue: { state: 'CA', county: 'Los Angeles' },
          incident: {
            date: '2024-01-15',
            location: 'Los Angeles, CA',
            narrative: 'Sample case for user Apple.',
            parties: ['Plaintiff', 'Defendant']
          },
          consents: { tos: true, privacy: true, ml_use: true, hipaa: true }
        })
      }
    })
    console.log(`Created assessment: ${assessment.id}`)
  } else {
    console.log(`Using assessment: ${assessment.id}`)
  }

  const uploadDir = path.join(process.cwd(), 'uploads', 'evidence')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const existingCount = await prisma.evidenceFile.count({
    where: { assessmentId: assessment.id }
  })

  if (existingCount >= 4) {
    console.log(`\nAssessment already has ${existingCount} evidence files.`)
    const files = await prisma.evidenceFile.findMany({
      where: { assessmentId: assessment.id },
      select: { originalName: true }
    })
    files.forEach((f, i) => console.log(`  ${i + 1}. ${f.originalName}`))
    return
  }

  const toCreate = 4 - existingCount
  console.log(`\nAdding ${toCreate} evidence file(s)...`)

  for (let i = 0; i < toCreate; i++) {
    const spec = SAMPLE_FILES[i]
    const filename = `${uuidv4()}-${spec.name}`
    const filePath = path.join(uploadDir, filename)

    fs.writeFileSync(filePath, `Placeholder evidence file: ${spec.name}\nCreated for user Apple.`, 'utf-8')
    const stats = fs.statSync(filePath)

    await prisma.evidenceFile.create({
      data: {
        userId: user.id,
        assessmentId: assessment.id,
        originalName: spec.name,
        filename,
        mimetype: spec.mimetype,
        size: stats.size,
        filePath,
        fileUrl: `/uploads/evidence/${filename}`,
        category: spec.category,
        processingStatus: 'completed',
        accessLevel: 'private'
      }
    })
    console.log(`  ✓ Created ${spec.name} (${spec.category})`)
  }

  const total = await prisma.evidenceFile.count({
    where: { assessmentId: assessment.id }
  })
  console.log(`\nDone. User Apple now has ${total} evidence files for assessment ${assessment.id}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
