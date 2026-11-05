/**
 * Accounts and seed data for Zoom Marketplace app review.
 *
 * Creates (or refreshes) two attorney logins and one client login, plus an
 * active case owned by attorney A whose client is the client login, so a
 * reviewer can run both sides of a call. Attorney B exists to show that one
 * attorney's Zoom connection and meetings are invisible to another.
 *
 * Both attorneys are marked inactive for routing, so no real claimant is ever
 * matched to a review account; their logins still work.
 *
 * Passwords are reset on every run and printed once. Set ZOOM_REVIEW_PASSWORD
 * to choose one instead of generating it.
 *
 * Run:
 *   cd api
 *   node ../node_modules/tsx/dist/cli.mjs scripts/seed-zoom-reviewer.ts
 */

import '../src/env'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'
import { createAttorneyOwnedCase } from '../src/lib/attorney-case-factory'

const ATTORNEY_A = { email: 'zoom-review-attorney@clearcaseiq.com', firstName: 'Zoom Review', lastName: 'Attorney A' }
const ATTORNEY_B = { email: 'zoom-review-attorney-b@clearcaseiq.com', firstName: 'Zoom Review', lastName: 'Attorney B' }
const CLIENT = { email: 'zoom-review-client@clearcaseiq.com', firstName: 'Zoom Review', lastName: 'Client' }
const FIRM = { name: 'Zoom Review Test Firm', slug: 'zoom-review-test-firm' }
const CASE_NARRATIVE =
  'Sample case for Zoom Marketplace review. Rear-ended at a red light on Main St; neck and back strain treated at urgent care.'

function generatePassword() {
  return `Zr-${crypto.randomBytes(9).toString('base64url')}9!`
}

async function upsertUser(person: typeof CLIENT, role: 'attorney' | 'client', passwordHash: string) {
  const data = { passwordHash, role, isActive: true, emailVerified: true, firstName: person.firstName, lastName: person.lastName }
  return prisma.user.upsert({
    where: { email: person.email },
    update: data,
    create: { email: person.email, ...data },
    select: { id: true },
  })
}

async function upsertAttorney(person: typeof CLIENT, lawFirmId: string | null = null) {
  const name = `${person.firstName} ${person.lastName}`
  const existing = await prisma.attorney.findFirst({ where: { email: person.email }, select: { id: true } })
  const data = {
    name,
    email: person.email,
    lawFirmId,
    specialties: JSON.stringify(['auto']),
    venues: JSON.stringify(['CA']),
    // Keeps the account out of case routing; login is governed by the User row.
    isActive: false,
  }
  return existing
    ? prisma.attorney.update({ where: { id: existing.id }, data, select: { id: true } })
    : prisma.attorney.create({ data, select: { id: true } })
}

// A firm is what turns an ended call into a draft time entry, so attorney A
// belongs to one; attorney B stays solo.
async function ensureFirm(attorneyUserId: string) {
  const firm = await prisma.lawFirm.upsert({
    where: { slug: FIRM.slug },
    update: { name: FIRM.name },
    create: { name: FIRM.name, slug: FIRM.slug },
    select: { id: true },
  })
  return { firm, link: async (attorneyId: string) => {
    const membership = { attorneyId, role: 'firm_admin', status: 'active' }
    await prisma.firmMember.upsert({
      where: { lawFirmId_userId: { lawFirmId: firm.id, userId: attorneyUserId } },
      update: membership,
      create: { lawFirmId: firm.id, userId: attorneyUserId, joinedAt: new Date(), ...membership },
    })
  } }
}

async function ensureCase(attorneyId: string, lawFirmId: string, clientUserId: string) {
  const existing = await prisma.leadSubmission.findFirst({
    where: { assignedAttorneyId: attorneyId, assessment: { userId: clientUserId } },
    select: { id: true, assessmentId: true },
  })
  if (existing) {
    await prisma.assessment.update({ where: { id: existing.assessmentId }, data: { lawFirmId } })
    return existing
  }

  const { assessmentId } = await createAttorneyOwnedCase(
    {
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      incidentDate: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
      narrative: CASE_NARRATIVE,
      plaintiffFirstName: CLIENT.firstName,
      plaintiffLastName: CLIENT.lastName,
      plaintiffEmail: CLIENT.email,
    },
    { attorneyId, lawFirmId },
    'manual',
  )

  // The factory gives the case a placeholder owner; hand it to the real client
  // login so the client dashboard and the meeting join check see it.
  const shadow = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { userId: true } })
  await prisma.assessment.update({ where: { id: assessmentId }, data: { userId: clientUserId } })
  if (shadow?.userId && shadow.userId !== clientUserId) {
    await prisma.user.delete({ where: { id: shadow.userId } }).catch(() => {})
  }
  return prisma.leadSubmission.findUniqueOrThrow({ where: { assessmentId }, select: { id: true, assessmentId: true } })
}

async function main() {
  const password = process.env.ZOOM_REVIEW_PASSWORD || generatePassword()
  if (password.length < 12) throw new Error('ZOOM_REVIEW_PASSWORD must be at least 12 characters')
  const passwordHash = await bcrypt.hash(password, 12)

  const attorneyAUser = await upsertUser(ATTORNEY_A, 'attorney', passwordHash)
  await upsertUser(ATTORNEY_B, 'attorney', passwordHash)
  const client = await upsertUser(CLIENT, 'client', passwordHash)
  const { firm, link } = await ensureFirm(attorneyAUser.id)
  const attorneyA = await upsertAttorney(ATTORNEY_A, firm.id)
  await link(attorneyA.id)
  await upsertAttorney(ATTORNEY_B)
  const lead = await ensureCase(attorneyA.id, firm.id, client.id)

  console.log(JSON.stringify({
    password,
    attorneyA: ATTORNEY_A.email,
    attorneyB: ATTORNEY_B.email,
    client: CLIENT.email,
    leadId: lead.id,
    assessmentId: lead.assessmentId,
  }, null, 2))
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
