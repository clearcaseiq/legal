/** One-off: report whether admin@ad.com exists and how many cases are attached. */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const EMAIL = process.env.ATTORNEY_EMAIL || 'admin@ad.com'

async function main() {
  console.log(`\n=== Checking data for "${EMAIL}" ===`)

  const user = await prisma.user.findFirst({
    where: { email: { equals: EMAIL, mode: 'insensitive' } },
    select: { id: true, email: true, role: true, firstName: true, lastName: true },
  })
  console.log('Login user:', user ? `${user.email} (${user.role}) [${user.id}]` : 'NOT FOUND')

  const attorney = await prisma.attorney.findFirst({
    where: { email: { equals: EMAIL, mode: 'insensitive' } },
    select: { id: true, name: true, email: true, lawFirmId: true },
  })
  console.log('Attorney:', attorney ? `${attorney.name} <${attorney.email}> [${attorney.id}]` : 'NOT FOUND')

  if (!attorney) {
    console.log('\nNo attorney record — no cases could be attached.')
    return
  }

  if (attorney.lawFirmId) {
    const firm = await prisma.lawFirm.findUnique({ where: { id: attorney.lawFirmId }, select: { name: true } })
    console.log('Firm:', firm?.name, `[${attorney.lawFirmId}]`)
  }

  const leads = await prisma.leadSubmission.count({ where: { assignedAttorneyId: attorney.id } })
  const intros = await prisma.introduction.count({ where: { attorneyId: attorney.id } })
  const byStatus = await prisma.leadSubmission.groupBy({
    by: ['status'],
    where: { assignedAttorneyId: attorney.id },
    _count: true,
  })

  console.log(`\nLead submissions assigned: ${leads}`)
  console.log(`Introductions: ${intros}`)
  console.log('By status:')
  for (const row of byStatus) console.log(`  ${row.status}: ${row._count}`)

  console.log('\n=== Done ===')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
