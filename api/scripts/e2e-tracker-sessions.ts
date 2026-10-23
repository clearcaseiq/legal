/**
 * Signed-in sessions for the third-party network test (e2e/third-party-network.e2e.spec.ts).
 *
 * Picks one plaintiff, one attorney and one admin from the database this API
 * is configured for, signs them a session the same way login does, and adds a
 * real tokenised evidence-upload link. The spec seeds them into localStorage
 * so it can open the signed-in dashboards without typing passwords.
 *
 * Local and QA only: the output is a set of live credentials.
 *
 *   pnpm --filter caseiq-api exec tsx scripts/e2e-tracker-sessions.ts ../e2e/.sessions.local.json
 *   E2E_SESSIONS=e2e/.sessions.local.json pnpm test:e2e e2e/third-party-network.e2e.spec.ts
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prisma } from '../src/lib/prisma'
import { generateToken } from '../src/lib/auth'
import { isAdminEmail } from '../src/lib/admin-access'

const userFields = { id: true, email: true, firstName: true, lastName: true, role: true } as const

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to mint sessions in production')
  const out = resolve(process.argv[2] || '../e2e/.sessions.local.json')

  const plaintiff = await prisma.user.findFirst({
    where: { role: 'client', isActive: true, assessments: { some: {} } },
    select: userFields,
  })

  const attorneyRow = await prisma.attorney.findFirst({ where: { email: { not: '' } } })
  const attorneyUser = attorneyRow
    ? await prisma.user.findUnique({ where: { email: attorneyRow.email ?? '' }, select: userFields })
    : null

  const admins = await prisma.user.findMany({ where: { isActive: true }, select: userFields, take: 500 })
  const admin = admins.find((u) => u.role === 'admin' || isAdminEmail(u.email)) ?? null

  // The link document-request-create.ts sends to a claimant.
  const request = await prisma.documentRequest.findFirst({
    orderBy: { id: 'desc' },
    select: { secureToken: true, lead: { select: { assessmentId: true } } },
  })
  // Failing that, the plaintiff's own upload screen, as the dashboard links to it.
  const ownCase = plaintiff
    ? await prisma.assessment.findFirst({ where: { userId: plaintiff.id }, select: { id: true } })
    : null
  const uploadUrl = request?.lead?.assessmentId
    ? new URL(`/evidence-upload/${request.lead.assessmentId}?token=${request.secureToken}`, 'http://localhost')
    : ownCase
      ? new URL(`/evidence-upload/${ownCase.id}?from=dashboard`, 'http://localhost')
      : null

  const session = (user: typeof plaintiff, role: string, extra: Record<string, string> = {}) =>
    user ? { token: generateToken(user.id), user, role, extra } : null

  const sessions = {
    plaintiff: session(plaintiff, 'plaintiff'),
    attorney: session(attorneyUser, 'attorney', attorneyRow ? { attorney: JSON.stringify(attorneyRow) } : {}),
    admin: session(admin, 'admin'),
    evidenceUploadPath: uploadUrl ? `${uploadUrl.pathname}${uploadUrl.search}` : null,
  }

  writeFileSync(out, JSON.stringify(sessions, null, 2))
  console.log(
    `Wrote ${out}:`,
    Object.fromEntries(Object.entries(sessions).map(([key, value]) => [key, value ? 'ok' : 'none found'])),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
