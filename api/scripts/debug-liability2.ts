import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import { buildCaseIntelligence } from '../src/lib/case-intelligence'
import { underwriteCase } from '../src/lib/underwriting-engine'

config({ path: resolve(__dirname, '../.env'), override: false })
const prisma = new PrismaClient()
const assessmentId = 'cmsmxul8d004uh06n4q55i4b6'

async function main() {
  const rec = await prisma.liabilityRecord.findUnique({ where: { assessmentId } })
  console.log('record', {
    faultPosture: rec?.faultPosture,
    defendantFaultPct: rec?.defendantFaultPct,
    citationIssuedTo: rec?.citationIssuedTo,
  })
  const a = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true, claimType: true, venueState: true, venueCounty: true } })
  const facts = a?.facts ? JSON.parse(a.facts as any) : {}
  console.log('facts.liability', facts.liability)
  const uw = underwriteCase({
    id: assessmentId,
    claimType: a?.claimType,
    venueState: a?.venueState,
    venueCounty: a?.venueCounty,
    facts,
    evidenceFiles: [],
  })
  console.log('underwrite from facts', uw.liability)
  const intel = await buildCaseIntelligence(assessmentId)
  console.log('intel summary.liability', intel?.summary?.liability)
}

main().finally(() => prisma.$disconnect())
