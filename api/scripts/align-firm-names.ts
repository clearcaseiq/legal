/**
 * Give every unclaimed attorney at a firm the same firm name.
 *
 * Imported attorneys were promoted with the firm name exactly as their bar
 * record spelled it, so one firm's attorneys can read "Wilshire Law Firm",
 * "Wilshire Law Firm, PLC" and "WILSHIRE LAW FIRM" side by side. The `LawFirm`
 * row itself is already shared (matched by domain or normalized name); this
 * copies its name onto each attorney profile.
 *
 * Claimed attorneys are left alone: their profile may carry a name they chose.
 * A firm whose own name is in capitals is renamed to its most common mixed-case
 * spelling first, unless one of its attorneys has claimed a profile.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/align-firm-names.ts
 *   node ../node_modules/tsx/dist/cli.mjs scripts/align-firm-names.ts --apply
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'

const isShouting = (name: string) => /[A-Z]/.test(name) && name === name.toUpperCase()

async function main() {
  const apply = process.argv.includes('--apply')
  const attorneys = await prisma.attorney.findMany({
    where: { lawFirmId: { not: null } },
    select: {
      id: true,
      claimStatus: true,
      lawFirm: { select: { id: true, name: true } },
      attorneyProfile: { select: { id: true, firmName: true } },
    },
  })

  type Firm = { name: string; claimed: boolean; spellings: Map<string, number>; members: typeof attorneys }
  const firms = new Map<string, Firm>()
  for (const attorney of attorneys) {
    if (!attorney.lawFirm) continue
    const firm = firms.get(attorney.lawFirm.id)
      ?? { name: attorney.lawFirm.name, claimed: false, spellings: new Map<string, number>(), members: [] as typeof attorneys }
    if (attorney.claimStatus !== 'unclaimed') firm.claimed = true
    const spelling = attorney.attorneyProfile?.firmName?.trim()
    if (spelling) firm.spellings.set(spelling, (firm.spellings.get(spelling) ?? 0) + 1)
    firm.members.push(attorney)
    firms.set(attorney.lawFirm.id, firm)
  }

  let renamedFirms = 0
  let alignedProfiles = 0
  for (const [firmId, firm] of firms) {
    let canonical = firm.name
    if (isShouting(canonical) && !firm.claimed) {
      const better = [...firm.spellings].filter(([s]) => !isShouting(s)).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (better) {
        canonical = better
        renamedFirms += 1
        if (apply) await prisma.lawFirm.update({ where: { id: firmId }, data: { name: canonical } })
      }
    }
    for (const member of firm.members) {
      const profile = member.attorneyProfile
      if (member.claimStatus !== 'unclaimed' || !profile || profile.firmName === canonical) continue
      alignedProfiles += 1
      if (apply) await prisma.attorneyProfile.update({ where: { id: profile.id }, data: { firmName: canonical } })
    }
  }

  console.log(JSON.stringify({ firms: firms.size, renamedFirms, alignedProfiles, applied: apply }))
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
