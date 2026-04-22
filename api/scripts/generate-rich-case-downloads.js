import { PrismaClient } from '@prisma/client'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

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

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))
}

function getUploadDir() {
  const uploadDir = path.join(process.cwd(), 'uploads', 'evidence')
  fs.mkdirSync(uploadDir, { recursive: true })
  return uploadDir
}

async function createPdfEvidence({
  assessment,
  originalName,
  description,
  aiSummary,
  aiHighlights,
  timeline,
  keywords,
  render,
}) {
  const existing = await prisma.evidenceFile.findFirst({
    where: { assessmentId: assessment.id, originalName },
  })

  if (existing) {
    return {
      evidenceFileId: existing.id,
      originalName,
      downloadUrl: `http://127.0.0.1:4000${existing.fileUrl}`,
      reused: true,
    }
  }

  const filename = `${uuidv4()}-${originalName}`
  const filePath = path.join(getUploadDir(), filename)
  const doc = new PDFDocument({ margin: 48, size: 'LETTER' })
  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)
  render(doc)
  doc.end()

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  const stats = fs.statSync(filePath)
  const evidenceFile = await prisma.evidenceFile.create({
    data: {
      userId: assessment.userId,
      assessmentId: assessment.id,
      originalName,
      filename,
      mimetype: 'application/pdf',
      size: stats.size,
      filePath,
      fileUrl: `/uploads/evidence/${filename}`,
      category: 'medical_records',
      subcategory: 'generated_report',
      description,
      dataType: 'structured',
      tags: JSON.stringify(['generated_pdf', 'demo_case', 'medical_download']),
      relevanceScore: 0.96,
      uploadMethod: 'generated',
      processingStatus: 'completed',
      aiSummary,
      aiClassification: 'medical_records',
      aiHighlights: JSON.stringify(aiHighlights),
      isHIPAA: true,
      accessLevel: 'private',
      provenanceSource: 'generated_report',
      provenanceNotes: 'Generated downloadable PDF for sample medical case',
      extractedData: {
        create: {
          timeline,
          keywords: JSON.stringify(keywords),
          confidence: 0.99,
        },
      },
    },
  })

  return {
    evidenceFileId: evidenceFile.id,
    originalName,
    downloadUrl: `http://127.0.0.1:4000${evidenceFile.fileUrl}`,
    reused: false,
  }
}

function addSectionTitle(doc, title) {
  doc.moveDown(0.6)
  doc.fontSize(14).fillColor('#111827').text(title)
  doc.moveDown(0.2)
}

async function main() {
  const assessmentId = process.argv[2] || 'cmo0dtz23000234au2siwaun0'
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      user: true,
      evidenceFiles: {
        include: { extractedData: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!assessment) {
    throw new Error(`Assessment not found: ${assessmentId}`)
  }

  const facts = parseFacts(assessment.facts)
  const treatment = safeArray(facts.treatment)
  const bills = assessment.evidenceFiles.filter((file) => file.category === 'bills')
  const medRecords = assessment.evidenceFiles.filter((file) => file.category === 'medical_records')

  const itemizedBillPdf = await createPdfEvidence({
    assessment,
    originalName: `elena-ramirez-itemized-bills-${assessmentId}.pdf`,
    description: 'Generated itemized medical bills report for demo download.',
    aiSummary: 'Generated PDF summarizing itemized medical bills, providers, service dates, and extracted totals.',
    aiHighlights: ['Itemized bills', 'Provider totals', 'Downloadable PDF'],
    timeline: 'Generated itemized billing report for sample plaintiff case.',
    keywords: ['itemized bills', 'medical bills', 'charges', 'provider totals'],
    render: (doc) => {
      let total = 0
      doc.fontSize(20).text('Itemized Medical Bills', { align: 'left' })
      doc.moveDown(0.3)
      doc.fontSize(11).text(`Patient: ${assessment.user?.firstName || 'Elena'} ${assessment.user?.lastName || 'Ramirez'}`)
      doc.text(`Case ID: ${assessment.id}`)
      doc.text(`Incident Date: ${facts.incident?.date || 'Unknown'}`)

      addSectionTitle(doc, 'Billing Documents')
      bills.forEach((bill, index) => {
        const extracted = safeArray(bill.extractedData)[0] || {}
        const amount = Number(extracted.totalAmount || 0)
        total += amount
        doc.fontSize(11).text(`${index + 1}. ${bill.originalName}`)
        doc.fontSize(10).fillColor('#4b5563').text(`Provider summary: ${bill.aiSummary || bill.description || 'Billing document on file.'}`)
        doc.text(`Service / statement dates: ${extracted.dates || 'Not extracted'}`)
        doc.text(`Extracted amount: ${amount ? money(amount) : 'Unknown'}`)
        doc.fillColor('#111827')
        doc.moveDown(0.4)
      })

      addSectionTitle(doc, 'Treatment Charges From Intake')
      treatment.forEach((entry, index) => {
        doc.fontSize(11).text(`${index + 1}. ${entry.date || 'Unknown date'} | ${entry.provider || 'Unknown provider'}`)
        doc.fontSize(10).fillColor('#4b5563').text(`Visit type: ${entry.type || 'Treatment'} | Charges noted in intake: ${money(entry.charges)}`)
        doc.fillColor('#111827')
        doc.moveDown(0.3)
      })

      addSectionTitle(doc, 'Totals')
      doc.fontSize(11).text(`Extracted total from uploaded bills: ${money(total)}`)
      doc.text(`Medical charges listed in intake: ${money(facts.damages?.med_charges)}`)
      doc.text(`Wage loss listed in intake: ${money(facts.damages?.wage_loss)}`)
    },
  })

  const chronologyPdf = await createPdfEvidence({
    assessment,
    originalName: `elena-ramirez-medical-chronology-${assessmentId}.pdf`,
    description: 'Generated narrative medical chronology report for demo download.',
    aiSummary: 'Generated PDF chronology narrating the incident, treatment progression, imaging, specialist care, therapy, and damages context.',
    aiHighlights: ['Medical chronology', 'Narrative timeline', 'Downloadable PDF'],
    timeline: 'Generated narrative chronology report for sample plaintiff case.',
    keywords: ['medical chronology', 'timeline', 'treatment story', 'narrative report'],
    render: (doc) => {
      doc.fontSize(20).text('Medical Chronology', { align: 'left' })
      doc.moveDown(0.3)
      doc.fontSize(11).text(`Patient: ${assessment.user?.firstName || 'Elena'} ${assessment.user?.lastName || 'Ramirez'}`)
      doc.text(`Case ID: ${assessment.id}`)
      doc.text(`Incident Date: ${facts.incident?.date || 'Unknown'}`)
      doc.text(`Location: ${facts.incident?.location || 'Unknown'}`)

      addSectionTitle(doc, 'Overview')
      doc.fontSize(11).text(
        facts.incident?.narrative ||
          'Rear-end collision followed by consistent treatment for neck pain, low-back pain, and headaches.',
        { lineGap: 2 },
      )

      addSectionTitle(doc, 'Chronology of Care')
      treatment.forEach((entry, index) => {
        doc.fontSize(11).text(`${index + 1}. ${entry.date || 'Unknown date'} - ${entry.provider || 'Unknown provider'}`)
        doc.fontSize(10).fillColor('#4b5563').text(
          `${entry.type || 'Treatment'}: ${entry.diagnosis || entry.treatment || entry.notes || 'Ongoing care documented.'}`,
          { lineGap: 2 },
        )
        if (entry.notes) {
          doc.text(`Notes: ${entry.notes}`)
        }
        doc.fillColor('#111827')
        doc.moveDown(0.4)
      })

      addSectionTitle(doc, 'Records Supporting the Timeline')
      medRecords.forEach((record, index) => {
        const extracted = safeArray(record.extractedData)[0] || {}
        doc.fontSize(11).text(`${index + 1}. ${record.originalName}`)
        doc.fontSize(10).fillColor('#4b5563').text(record.aiSummary || record.description || 'Medical record on file.', { lineGap: 2 })
        if (extracted.dates) {
          doc.text(`Extracted dates: ${extracted.dates}`)
        }
        doc.fillColor('#111827')
        doc.moveDown(0.35)
      })

      addSectionTitle(doc, 'Functional Impact')
      doc.fontSize(11).text(
        facts.damages?.workImpact ||
          'Plaintiff reported work limitations, pain with sitting and lifting, and ongoing sleep disruption during therapy.',
        { lineGap: 2 },
      )
      doc.moveDown(0.3)
      doc.text(`Medical specials noted in intake: ${money(facts.damages?.med_charges)}`)
      doc.text(`Uploaded bill total available for review: ${money(bills.reduce((sum, file) => sum + Number((safeArray(file.extractedData)[0] || {}).totalAmount || 0), 0))}`)
    },
  })

  console.log(
    JSON.stringify(
      {
        assessmentId,
        itemizedBills: itemizedBillPdf,
        chronology: chronologyPdf,
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
