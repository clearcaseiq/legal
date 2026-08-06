import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const total = await (prisma as any).productionAttorney.count()
  const withEmail = await (prisma as any).productionAttorney.count({ where: { email: { not: null } } })
  const withWebsite = await (prisma as any).productionAttorney.count({ where: { website: { not: null } } })
  const pi = await (prisma as any).productionAttorney.count({ where: { piRelevant: true } })
  const promoted = await (prisma as any).productionAttorney.count({ where: { promotedAttorneyId: { not: null } } })
  const withBio = await (prisma as any).productionAttorney.count({ where: { bio: { not: null } } })
  const withHeadshot = await (prisma as any).productionAttorney.count({ where: { headshotUrl: { not: null } } })
  const withProfEmail = await (prisma as any).productionAttorney.count({ where: { email: { contains: '@' } } })

  // Check firm counts
  let firmTotal = 0
  let firmWithWebsite = 0
  try {
    firmTotal = await (prisma as any).productionFirm.count()
    firmWithWebsite = await (prisma as any).productionFirm.count({ where: { website: { not: null } } })
  } catch { /* table may not exist */ }

  console.log('=== Attorney Staging Database Status ===')
  console.log(`Total attorneys:        ${total.toLocaleString()}`)
  console.log(`With email:             ${withEmail.toLocaleString()}`)
  console.log(`With professional email: ${withProfEmail.toLocaleString()}`)
  console.log(`With website:           ${withWebsite.toLocaleString()}`)
  console.log(`With bio:               ${withBio.toLocaleString()}`)
  console.log(`With headshot:          ${withHeadshot.toLocaleString()}`)
  console.log(`PI candidates:          ${pi.toLocaleString()}`)
  console.log(`Promoted (live):        ${promoted.toLocaleString()}`)
  console.log()
  console.log(`Total firms:            ${firmTotal.toLocaleString()}`)
  console.log(`Firms with website:     ${firmWithWebsite.toLocaleString()}`)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
