import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const piTotal = await (prisma as any).productionAttorney.count({ where: { piRelevant: true } })
  const piWithFirm = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, firmName: { not: null } } })
  const piNoWebsiteWithFirm = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, website: null, firmName: { not: null } } })
  const piNoWebsiteNoFirm = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, website: null, firmName: null } })
  const piWithWebsiteNoBio = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, website: { not: null }, bio: null } })

  console.log(`PI total:                        ${piTotal.toLocaleString()}`)
  console.log(`PI with firm name:               ${piWithFirm.toLocaleString()} (${(piWithFirm/piTotal*100).toFixed(1)}%)`)
  console.log(`PI no website, has firm name:     ${piNoWebsiteWithFirm.toLocaleString()} (scrapeable!)`)
  console.log(`PI no website, no firm name:      ${piNoWebsiteNoFirm.toLocaleString()} (need directory)`)
  console.log(`PI with website but no bio:       ${piWithWebsiteNoBio.toLocaleString()} (re-scrape for bio)`)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
