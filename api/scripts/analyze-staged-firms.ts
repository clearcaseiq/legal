/**
 * Analyze firm clustering in the staged attorney data.
 * Shows how many unique firms exist, largest firms, solo practitioners, etc.
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'
import { normalizeFirmName } from '../src/lib/attorney-identity'

async function main() {
  const source = process.argv[2] || 'cpra-ca-bar-2026'

  console.log(`\nAnalyzing staged firms (source: ${source})...\n`)

  const rows = await prisma.productionAttorney.findMany({
    where: { source },
    select: { id: true, name: true, firmName: true, city: true, county: true, piRelevant: true, email: true, phone: true, website: true },
  })

  console.log(`  Total attorneys: ${rows.length}`)

  // Group by normalized firm name
  const firmMap = new Map<string, typeof rows>()
  let soloCount = 0
  let noFirmCount = 0

  for (const row of rows) {
    const firmName = row.firmName?.trim()
    if (!firmName) { noFirmCount++; continue }

    // Detect solo practitioners: firm name matches attorney name
    const nameNorm = row.name.toLowerCase().replace(/[^a-z]/g, '')
    const firmNorm = firmName.toLowerCase().replace(/[^a-z]/g, '')
    const isSolo = firmNorm.includes(nameNorm) || nameNorm.includes(firmNorm) ||
      firmName.toLowerCase().includes('law office of') && firmName.toLowerCase().includes(row.name.split(' ').pop()!.toLowerCase())

    const key = normalizeFirmName(firmName) || firmName.toLowerCase()
    const existing = firmMap.get(key) ?? []
    existing.push(row)
    firmMap.set(key, existing)

    if (isSolo && existing.length === 1) soloCount++
  }

  const firmSizes = Array.from(firmMap.entries())
    .map(([key, attorneys]) => ({
      key,
      name: attorneys[0].firmName!,
      count: attorneys.length,
      piCount: attorneys.filter((a) => a.piRelevant).length,
      cities: [...new Set(attorneys.map((a) => a.city).filter(Boolean))],
      counties: [...new Set(attorneys.map((a) => a.county).filter(Boolean))],
      hasEmail: attorneys.some((a) => a.email?.trim()),
      hasPhone: attorneys.some((a) => a.phone?.trim()),
      hasWebsite: attorneys.some((a) => a.website?.trim()),
    }))
    .sort((a, b) => b.count - a.count)

  console.log(`  No firm name: ${noFirmCount}`)
  console.log(`  Unique firms (normalized): ${firmMap.size}`)
  console.log()

  // Size distribution
  const sizeDistribution = { solo: 0, small: 0, mid: 0, large: 0, mega: 0 }
  for (const f of firmSizes) {
    if (f.count === 1) sizeDistribution.solo++
    else if (f.count <= 5) sizeDistribution.small++
    else if (f.count <= 20) sizeDistribution.mid++
    else if (f.count <= 100) sizeDistribution.large++
    else sizeDistribution.mega++
  }

  console.log('  Firm size distribution:')
  console.log(`    Solo (1 attorney):       ${sizeDistribution.solo}`)
  console.log(`    Small (2-5):             ${sizeDistribution.small}`)
  console.log(`    Mid (6-20):              ${sizeDistribution.mid}`)
  console.log(`    Large (21-100):          ${sizeDistribution.large}`)
  console.log(`    Mega (100+):             ${sizeDistribution.mega}`)
  console.log()

  // Top 30 largest firms
  console.log('  Top 30 largest firms:')
  console.log(`  ${'#'.padStart(3)}  ${'Attorneys'.padStart(9)}  ${'PI'.padStart(4)}  ${'Counties'.padStart(8)}  Name`)
  console.log(`  ${'─'.repeat(3)}  ${'─'.repeat(9)}  ${'─'.repeat(4)}  ${'─'.repeat(8)}  ${'─'.repeat(40)}`)
  for (const f of firmSizes.slice(0, 30)) {
    console.log(
      `  ${String(firmSizes.indexOf(f) + 1).padStart(3)}  ${String(f.count).padStart(9)}  ${String(f.piCount).padStart(4)}  ${String(f.counties.length).padStart(8)}  ${f.name}`
    )
  }
  console.log()

  // PI-relevant firms
  const piFirms = firmSizes.filter((f) => f.piCount > 0).sort((a, b) => b.piCount - a.piCount)
  console.log(`  PI-relevant firms: ${piFirms.length}`)
  console.log(`  Top 20 PI firms:`)
  console.log(`  ${'#'.padStart(3)}  ${'PI Attys'.padStart(9)}  ${'Total'.padStart(6)}  ${'Counties'.padStart(8)}  Name`)
  console.log(`  ${'─'.repeat(3)}  ${'─'.repeat(9)}  ${'─'.repeat(6)}  ${'─'.repeat(8)}  ${'─'.repeat(40)}`)
  for (const f of piFirms.slice(0, 20)) {
    console.log(
      `  ${String(piFirms.indexOf(f) + 1).padStart(3)}  ${String(f.piCount).padStart(9)}  ${String(f.count).padStart(6)}  ${String(f.counties.length).padStart(8)}  ${f.name}`
    )
  }
  console.log()

  // Contact coverage for PI firms
  const piWithContact = piFirms.filter((f) => f.hasEmail || f.hasPhone || f.hasWebsite)
  console.log('  PI firm contact coverage:')
  console.log(`    With email:    ${piFirms.filter((f) => f.hasEmail).length} / ${piFirms.length}`)
  console.log(`    With phone:    ${piFirms.filter((f) => f.hasPhone).length} / ${piFirms.length}`)
  console.log(`    With website:  ${piFirms.filter((f) => f.hasWebsite).length} / ${piFirms.length}`)
  console.log(`    Any contact:   ${piWithContact.length} / ${piFirms.length}`)
  console.log()

  // County coverage for PI firms
  const piCounties = new Set<string>()
  for (const f of piFirms) for (const c of f.counties) piCounties.add(c)
  console.log(`  PI attorney coverage: ${piCounties.size} CA counties`)
  const countyCounts = new Map<string, number>()
  for (const f of piFirms) for (const c of f.counties) countyCounts.set(c, (countyCounts.get(c) ?? 0) + f.piCount)
  const topCounties = Array.from(countyCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15)
  console.log('  Top 15 counties by PI attorney count:')
  for (const [county, count] of topCounties) {
    console.log(`    ${county.padEnd(20)} ${count}`)
  }

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect() })
