import '../src/env'
import { prisma } from '../src/lib/prisma'

async function main() {
  const query = process.argv[2] ?? ''
  if (!query) { console.log('Usage: find-attorney.ts <name or firm>'); process.exit(1) }

  const results = await prisma.productionAttorney.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { firmName: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
  })

  if (results.length === 0) {
    console.log(`No results for "${query}"`)
  } else {
    console.log(`Found ${results.length} result(s) for "${query}":\n`)
    for (const r of results) {
      console.log(`  Name:           ${r.name}`)
      console.log(`  Bar Number:     ${r.barNumber ?? '—'}`)
      console.log(`  Status:         ${r.licenseStatus ?? '—'}`)
      console.log(`  Firm:           ${r.firmName ?? '—'}`)
      console.log(`  Email:          ${r.email ?? '—'}`)
      console.log(`  Phone:          ${r.phone ?? '—'}`)
      console.log(`  Address:        ${[r.street, r.city, r.state, r.zip].filter(Boolean).join(', ')}`)
      console.log(`  County:         ${r.county ?? '—'}`)
      console.log(`  Law School:     ${r.lawSchool ?? '—'}`)
      console.log(`  Admitted:       ${r.dateOfAdmission ? r.dateOfAdmission.toISOString().slice(0, 10) : '—'}`)
      console.log(`  PI-relevant:    ${r.piRelevant ? 'Yes' : 'No'}`)
      console.log(`  Practice Areas: ${r.practiceAreas ? JSON.parse(r.practiceAreas).join(', ') : '—'}`)
      console.log(`  Specialties:    ${r.specialties ? JSON.parse(r.specialties).join(', ') : '—'}`)
      console.log(`  CLA Sections:   ${r.claSections ? JSON.parse(r.claSections).join(', ') : '—'}`)
      console.log(`  Discipline:     ${r.discipline ? 'Yes — ' + JSON.parse(r.discipline).length + ' record(s)' : 'None'}`)
      console.log(`  District:       ${r.district ?? '—'}`)
      console.log('  ---')
    }
  }

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect() })
