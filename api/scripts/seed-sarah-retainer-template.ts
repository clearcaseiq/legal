/**
 * Create a demo Contingency Fee / Retainer Agreement firm template for
 * Sarah Johnson's law firm (Firm Dashboard → Templates).
 *
 * Usage: pnpm exec tsx scripts/seed-sarah-retainer-template.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import PDFDocument from 'pdfkit'

config({ path: resolve(__dirname, '../.env'), override: false })

const prisma = new PrismaClient()

const TEMPLATE_NAME = 'Contingency Fee / Retainer Agreement'
const BODY = `RETAINER & CONTINGENCY FEE AGREEMENT

This Agreement is between {{firm_name}} ("the Firm") and {{client_name}} ("the Client"), dated {{date}}.

1. SCOPE OF REPRESENTATION. The Firm will represent the Client in connection with: {{matter_description}}.

2. CONTINGENCY FEE. The Firm's fee is {{fee_percentage}}% of the gross recovery, contingent on recovery. If there is no recovery, the Client owes no attorney's fee.

3. COSTS. Case costs and expenses are advanced by the Firm and reimbursed from the recovery before distribution to the Client.

4. NO GUARANTEE. No specific outcome or recovery amount has been promised.

5. TERMINATION. Either party may terminate this agreement in writing, subject to the Firm's right to a reasonable fee for work performed and costs advanced.

6. ACKNOWLEDGMENT. The Client has read this agreement, understands it, and has had an opportunity to ask questions.

Client signature: ____________________   Date: __________

Attorney: {{attorney_name}}
Firm: {{firm_name}}`

async function renderDemoRetainerPdf(filePath: string, firmName: string, attorneyName: string) {
  await new Promise<void>((resolvePromise, reject) => {
    const doc = new PDFDocument({ margin: 54, size: 'LETTER' })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)
    doc.fontSize(16).text('RETAINER & CONTINGENCY FEE AGREEMENT', { align: 'center' })
    doc.moveDown()
    doc.fontSize(11).text(
      `This demo agreement is between ${firmName} ("the Firm") and [Client Name] ("the Client").`,
    )
    doc.moveDown()
    doc.text(
      '1. SCOPE. The Firm will represent the Client in a personal injury matter arising from the incident described in the ClearCaseIQ intake.',
    )
    doc.moveDown(0.5)
    doc.text(
      '2. FEE. The Firm\'s fee is thirty-three and one-third percent (33⅓%) of the gross recovery if settled before litigation, and forty percent (40%) if litigation is filed, contingent on recovery.',
    )
    doc.moveDown(0.5)
    doc.text(
      '3. COSTS. Reasonable case costs are advanced by the Firm and reimbursed from any recovery.',
    )
    doc.moveDown(0.5)
    doc.text('4. NO GUARANTEE. No specific outcome has been promised.')
    doc.moveDown()
    doc.text(`Attorney of record: ${attorneyName}`)
    doc.text(`Firm: ${firmName}`)
    doc.moveDown(2)
    doc.text('Client signature: ________________________     Date: __________')
    doc.moveDown()
    doc.text(`Attorney signature: ________________________     Date: __________`)
    doc.moveDown(2)
    doc.fontSize(9).fillColor('#666').text(
      'DEMO DOCUMENT — for ClearCaseIQ firm template testing only. Not a binding legal instrument.',
    )
    doc.end()
    stream.on('finish', () => resolvePromise())
    stream.on('error', reject)
  })
}

async function main() {
  const attorney = await prisma.attorney.findFirst({
    where: {
      OR: [
        { name: { contains: 'Sarah Johnson', mode: 'insensitive' } },
        { email: { contains: 'sarah.johnson', mode: 'insensitive' } },
      ],
    },
    include: { lawFirm: true },
  })

  if (!attorney) {
    throw new Error('Attorney Sarah Johnson not found')
  }

  let lawFirmId = attorney.lawFirmId
  let firmName = attorney.lawFirm?.name || 'Sarah Johnson Law'

  if (!lawFirmId) {
    const slugBase = 'sarah-johnson-law'
    let slug = slugBase
    let n = 1
    while (await prisma.lawFirm.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${n++}`
    }
    const firm = await prisma.lawFirm.create({
      data: {
        name: firmName,
        slug,
        primaryEmail: attorney.email || undefined,
      },
    })
    lawFirmId = firm.id
    firmName = firm.name
    await prisma.attorney.update({
      where: { id: attorney.id },
      data: { lawFirmId },
    })
    console.log(`Created / linked law firm ${firm.name} (${lawFirmId})`)
  }

  const uploadDir = path.join(process.cwd(), 'uploads', 'firm-templates')
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
  const fileName = `tpl-sarah-johnson-retainer-${Date.now()}.pdf`
  const filePath = path.join(uploadDir, fileName)
  await renderDemoRetainerPdf(filePath, firmName, attorney.name)
  const fileSize = fs.statSync(filePath).size

  const existing = await (prisma as any).firmTemplate.findFirst({
    where: {
      lawFirmId,
      name: { equals: TEMPLATE_NAME, mode: 'insensitive' },
    },
  })

  let template
  if (existing) {
    template = await (prisma as any).firmTemplate.update({
      where: { id: existing.id },
      data: {
        category: 'onboarding',
        description:
          'Demo contingency-fee retainer for Sarah Johnson — editable body plus PDF for Firm Dashboard templates.',
        body: BODY,
        fileName: 'Sarah-Johnson-Retainer-Agreement.pdf',
        filePath,
        fileMime: 'application/pdf',
        fileSize,
        isActive: true,
      },
    })
    console.log(`Updated existing template ${template.id}`)
  } else {
    template = await (prisma as any).firmTemplate.create({
      data: {
        lawFirmId,
        name: TEMPLATE_NAME,
        category: 'onboarding',
        description:
          'Demo contingency-fee retainer for Sarah Johnson — editable body plus PDF for Firm Dashboard templates.',
        body: BODY,
        fileName: 'Sarah-Johnson-Retainer-Agreement.pdf',
        filePath,
        fileMime: 'application/pdf',
        fileSize,
        isActive: true,
        sortOrder: 0,
      },
    })
    console.log(`Created template ${template.id}`)
  }

  console.log(
    JSON.stringify(
      {
        attorneyId: attorney.id,
        attorneyName: attorney.name,
        lawFirmId,
        firmName,
        templateId: template.id,
        templateName: template.name,
        fileName: template.fileName,
        filePath: template.filePath,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
