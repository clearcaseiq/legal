/**
 * Complete a retainer signature in environments where the Dropbox Sign / Documenso
 * completion webhook can't reach this server (local dev, behind NAT, demos).
 *
 * It marks the lead's most-recent retainer/fee-agreement envelope as `signed`
 * and then runs the SAME post-signing logic the webhook would (`onRetainerSigned`):
 * flips the lead to retained/engaged, completes retainer tasks, seeds case-opening
 * tasks, and syncs case stage — so the plaintiff dashboard status updates.
 *
 * Usage:
 *   node ../node_modules/tsx/dist/cli.mjs scripts/mark-retainer-signed.ts <email-or-leadId> [envelopeId]
 * Examples:
 *   node ../node_modules/tsx/dist/cli.mjs scripts/mark-retainer-signed.ts plain14@yopmail.com
 *   node ../node_modules/tsx/dist/cli.mjs scripts/mark-retainer-signed.ts cmstbvdas00fm10smbl9odfyg
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import { onRetainerSigned } from '../src/lib/intake-acquire'

config({ path: resolve(__dirname, '../.env'), override: false })
const prisma = new PrismaClient()

const ARG = process.argv[2]
const ENVELOPE_ARG = process.argv[3]

async function resolveLeadId(): Promise<string | null> {
  if (!ARG) return null
  // Direct leadId?
  const byId = await prisma.leadSubmission.findUnique({ where: { id: ARG }, select: { id: true } })
  if (byId) return byId.id
  // Otherwise treat as a plaintiff email → newest assessment's lead.
  const user = await prisma.user.findUnique({ where: { email: ARG.toLowerCase() }, select: { id: true } })
  if (!user) return null
  const lead = await prisma.leadSubmission.findFirst({
    where: { assessment: { userId: user.id } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return lead?.id || null
}

async function main() {
  if (!ARG) {
    console.error('Provide a plaintiff email or a leadId.')
    process.exit(1)
  }
  const leadId = await resolveLeadId()
  if (!leadId) {
    console.error(`Could not resolve a lead for "${ARG}".`)
    process.exit(1)
  }

  const envelope = ENVELOPE_ARG
    ? await prisma.documentEnvelope.findFirst({
        where: { id: ENVELOPE_ARG, leadId },
        select: { id: true, documentType: true, status: true, title: true },
      })
    : await prisma.documentEnvelope.findFirst({
        where: { leadId, documentType: { in: ['retainer', 'fee_agreement'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, documentType: true, status: true, title: true },
      })

  if (!envelope) {
    console.error(`No retainer/fee_agreement envelope found for lead ${leadId}.`)
    process.exit(1)
  }

  if (envelope.status !== 'signed') {
    await prisma.documentEnvelope.update({
      where: { id: envelope.id },
      data: { status: 'signed', signedAt: new Date() },
    })
    console.log(`Marked envelope ${envelope.id} ("${envelope.title}") as signed.`)
  } else {
    console.log(`Envelope ${envelope.id} was already signed; re-running post-sign logic.`)
  }

  await onRetainerSigned({ leadId, envelopeId: envelope.id, documentType: envelope.documentType })

  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId },
    select: { status: true, lifecycleState: true, assessmentId: true },
  })
  console.log('Result:', JSON.stringify({ leadId, envelopeId: envelope.id, ...lead }, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
