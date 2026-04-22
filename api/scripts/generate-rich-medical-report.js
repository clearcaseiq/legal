import { PrismaClient } from '@prisma/client'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function parseFacts(input) {
  if (!input) return {}
  if (typeof input === 'string') {
    try {
      return JSON.parse(input)
    } catch {
      return {}
    }
  }
  return input
}

async function main() {
  const assessmentId = process.argv[2] || 'cmo0dtz23000234au2siwaun0'
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      user: true,
      evidenceFiles: {
        include: {
          extractedData: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!assessment) {
    throw new Error(`Assessment not found: ${assessmentId}`)
  }

  const facts = parseFacts(assessment.facts)
  const injuries = safeArray(facts.injuries)
  const treatment = safeArray(facts.treatment)
  const evidenceFiles = safeArray(assessment.evidenceFiles)
  const medicalRecords = evidenceFiles.filter((file) => file.category === 'medical_records')
  const bills = evidenceFiles.filter((file) => file.category === 'bills')

  const originalName = `elena-ramirez-medical-report-${assessmentId}.pdf`
  const existing = await prisma.evidenceFile.findFirst({
    where: { assessmentId, originalName },
  })

  if (existing) {
    console.log(
      JSON.stringify(
        {
          assessmentId,
          originalName,
          fileUrl: `http://127.0.0.1:4000${existing.fileUrl}`,
          evidenceFileId: existing.id,
          reused: true,
        },
        null,
        2,
      ),
    )
    return
  }

  const uploadDir = path.join(process.cwd(), 'uploads', 'evidence')
  fs.mkdirSync(uploadDir, { recursive: true })

  const filename = `${uuidv4()}-${originalName}`
  const filePath = path.join(uploadDir, filename)
  const doc = new PDFDocument({ margin: 48, size: 'LETTER' })
  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  doc.fontSize(20).text('Medical Summary Report', { align: 'left' })
  doc.moveDown(0.3)
  doc.fontSize(11).text(`Case ID: ${assessmentId}`)
  doc.text(`Patient: ${assessment.user?.firstName || 'Elena'} ${assessment.user?.lastName || 'Ramirez'}`)
  doc.text(`Incident Date: ${facts.incident?.date || 'Unknown'}`)
  doc.text(`Venue: ${(facts.venue?.county || assessment.venueCounty || '')} ${(facts.venue?.state || assessment.venueState || '')}`.trim())
  doc.moveDown()

  doc.fontSize(14).text('Incident Summary')
  doc.fontSize(11).text(
    facts.incident?.narrative ||
      'Motor vehicle collision with post-traumatic neck, back, and headache complaints.',
    { lineGap: 2 },
  )
  doc.moveDown()

  doc.fontSize(14).text('Reported Injuries')
  injuries.forEach((injury) => {
    const line = `${injury.bodyPart || injury.type || 'Injury'}: ${injury.description || injury.severity || 'Documented injury'}`
    doc.fontSize(11).text(`- ${line}`)
  })
  if (!injuries.length) {
    doc.fontSize(11).text('- No injuries listed in assessment facts')
  }
  doc.moveDown()

  doc.fontSize(14).text('Treatment Timeline')
  treatment.forEach((entry) => {
    doc
      .fontSize(11)
      .text(
        `- ${entry.date || 'Unknown date'} | ${entry.provider || 'Provider unknown'} | ${entry.type || 'Treatment'} | ${
          entry.diagnosis || entry.treatment || entry.notes || ''
        }`,
        { lineGap: 2 },
      )
  })
  if (!treatment.length) {
    doc.fontSize(11).text('- No treatment entries listed in assessment facts')
  }
  doc.moveDown()

  doc.fontSize(14).text('Medical Records Reviewed')
  medicalRecords.forEach((file) => {
    const extracted = safeArray(file.extractedData)[0] || {}
    const summary = file.aiSummary || file.description || 'Medical record on file.'
    const dates = extracted.dates || ''
    doc.fontSize(11).text(`- ${file.originalName}`, { continued: false })
    doc.fontSize(10).fillColor('#444444').text(`  ${summary}`)
    if (dates) {
      doc.text(`  Extracted dates: ${dates}`)
    }
    doc.fillColor('#000000')
  })
  if (!medicalRecords.length) {
    doc.fontSize(11).text('- No medical records attached')
  }
  doc.moveDown()

  doc.fontSize(14).text('Medical Bills Reviewed')
  let totalBills = 0
  bills.forEach((file) => {
    const extracted = safeArray(file.extractedData)[0] || {}
    const amount = Number(extracted.totalAmount || 0)
    totalBills += amount
    doc.fontSize(11).text(`- ${file.originalName}`, { continued: false })
    doc.fontSize(10).fillColor('#444444').text(`  ${file.aiSummary || file.description || 'Billing document on file.'}`)
    if (amount > 0) {
      doc.text(`  Extracted total: ${money(amount)}`)
    }
    doc.fillColor('#000000')
  })
  if (!bills.length) {
    doc.fontSize(11).text('- No medical bills attached')
  }
  doc.moveDown()

  doc.fontSize(14).text('Damages Snapshot')
  doc.fontSize(11).text(`- Medical charges listed in intake: ${money(facts.damages?.med_charges)}`)
  doc.text(`- Medical bills extracted from uploaded documents: ${money(totalBills)}`)
  doc.text(`- Wage loss listed in intake: ${money(facts.damages?.wage_loss)}`)
  if (facts.damages?.workImpact) {
    doc.text(`- Work impact: ${facts.damages.workImpact}`)
  }
  doc.moveDown()

  doc.fontSize(14).text('Source Documents')
  evidenceFiles.forEach((file) => {
    doc.fontSize(11).text(`- ${file.category}: ${file.originalName}`)
  })

  doc.end()

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  const stats = fs.statSync(filePath)
  const evidenceFile = await prisma.evidenceFile.create({
    data: {
      userId: assessment.userId,
      assessmentId,
      originalName,
      filename,
      mimetype: 'application/pdf',
      size: stats.size,
      filePath,
      fileUrl: `/uploads/evidence/${filename}`,
      category: 'medical_records',
      subcategory: 'medical_summary_report',
      description: 'Generated medical summary report for demo case download.',
      dataType: 'structured',
      tags: JSON.stringify(['medical_report', 'summary_report', 'demo_case']),
      relevanceScore: 0.97,
      uploadMethod: 'generated',
      processingStatus: 'completed',
      aiSummary: 'Generated PDF medical summary report combining incident details, treatment history, medical records, and bills.',
      aiClassification: 'medical_records',
      aiHighlights: JSON.stringify(['Generated report', 'Downloadable PDF', 'Treatment summary', 'Billing summary']),
      isHIPAA: true,
      accessLevel: 'private',
      provenanceSource: 'generated_report',
      provenanceNotes: 'Generated by seed helper for demo download',
      extractedData: {
        create: {
          dates: JSON.stringify(
            treatment.map((entry) => entry.date).filter(Boolean),
          ),
          timeline: 'Generated medical summary report for plaintiff review and download.',
          keywords: JSON.stringify(['medical report', 'summary', 'treatment timeline', 'medical bills']),
          confidence: 0.99,
        },
      },
    },
  })

  console.log(
    JSON.stringify(
      {
        assessmentId,
        originalName,
        evidenceFileId: evidenceFile.id,
        downloadUrl: `http://127.0.0.1:4000${evidenceFile.fileUrl}`,
        resultsUrl: `http://localhost:5173/results/${assessmentId}`,
      },
      null,
      2,
    ),
  )
}

main()
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
