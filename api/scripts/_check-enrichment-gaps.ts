import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const piTotal = await (prisma as any).productionAttorney.count({ where: { piRelevant: true } })
  const piWithBio = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, bio: { not: null } } })
  const piWithHeadshot = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, headshotUrl: { not: null } } })
  const piWithWebsite = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, website: { not: null } } })
  const piWithEmail = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, email: { not: null } } })
  const piWithLanguages = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, languages: { not: null } } })
  const piWithResults = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, caseResults: { not: null } } })
  const piWithAwards = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, awards: { not: null } } })
  
  // Non-PI that have websites but haven't been scanned
  const nonPiWithWebsite = await (prisma as any).productionAttorney.count({ where: { piRelevant: false, website: { not: null } } })
  const nonPiNoWebsite = await (prisma as any).productionAttorney.count({ where: { piRelevant: false, website: null } })
  
  // Attorneys with bar numbers (can look up on directories)
  const withBarNumber = await (prisma as any).productionAttorney.count({ where: { barNumber: { not: null } } })
  const piWithBarNumber = await (prisma as any).productionAttorney.count({ where: { piRelevant: true, barNumber: { not: null } } })
  
  // Non-PI with bar number but no website (can try directory lookup)
  const noWebsiteWithBar = await (prisma as any).productionAttorney.count({ where: { piRelevant: false, website: null, barNumber: { not: null } } })

  console.log('=== PI Attorney Enrichment Status ===')
  console.log(`PI candidates:     ${piTotal.toLocaleString()}`)
  console.log(`  With website:    ${piWithWebsite.toLocaleString()} (${(piWithWebsite/piTotal*100).toFixed(1)}%)`)
  console.log(`  With email:      ${piWithEmail.toLocaleString()} (${(piWithEmail/piTotal*100).toFixed(1)}%)`)
  console.log(`  With bio:        ${piWithBio.toLocaleString()} (${(piWithBio/piTotal*100).toFixed(1)}%)`)
  console.log(`  With headshot:   ${piWithHeadshot.toLocaleString()} (${(piWithHeadshot/piTotal*100).toFixed(1)}%)`)
  console.log(`  With languages:  ${piWithLanguages.toLocaleString()} (${(piWithLanguages/piTotal*100).toFixed(1)}%)`)
  console.log(`  With results:    ${piWithResults.toLocaleString()} (${(piWithResults/piTotal*100).toFixed(1)}%)`)
  console.log(`  With awards:     ${piWithAwards.toLocaleString()} (${(piWithAwards/piTotal*100).toFixed(1)}%)`)
  console.log()
  console.log('=== Enrichment Opportunities ===')
  console.log(`Total with bar#:         ${withBarNumber.toLocaleString()}`)
  console.log(`PI with bar#:            ${piWithBarNumber.toLocaleString()}`)
  console.log(`Non-PI, no website, bar#: ${noWebsiteWithBar.toLocaleString()} (directory lookup candidates)`)
  console.log(`Non-PI with website:     ${nonPiWithWebsite.toLocaleString()} (already scanned, not PI)`)
  console.log(`Non-PI no website:       ${nonPiNoWebsite.toLocaleString()}`)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
