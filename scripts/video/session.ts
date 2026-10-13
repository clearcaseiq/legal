/**
 * Local-only helpers for the attorney overview recorder: resolves the demo
 * attorney session and picks seeded cases to film. Reads api/.env, so it only
 * works against a local database.
 */
import { config } from 'dotenv'
import path from 'path'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const ROOT = path.resolve(__dirname, '../..')
config({ path: path.join(ROOT, 'api', '.env'), override: true })

export type AttorneySession = {
  token: string
  user: Record<string, unknown>
  attorney: Record<string, unknown>
}

export type DemoCases = {
  activeLeadId: string | null
  pendingLeadId: string | null
}

const API_URL = process.env.VIDEO_API_URL || 'http://localhost:4000'

async function loginWithPassword(email: string, password: string): Promise<AttorneySession> {
  const res = await fetch(`${API_URL}/v1/auth/attorney-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Attorney login failed (${res.status}): ${await res.text()}`)
  const body = (await res.json()) as AttorneySession
  return { token: body.token, user: body.user, attorney: body.attorney }
}

/**
 * Signs in with ATTORNEY_PASSWORD when given; otherwise mints a session token
 * with the local JWT_SECRET so the demo account's password is never changed.
 */
export async function resolveSession(prisma: PrismaClient, email: string): Promise<AttorneySession> {
  if (process.env.ATTORNEY_PASSWORD) return loginWithPassword(email, process.env.ATTORNEY_PASSWORD)

  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET missing from api/.env; set ATTORNEY_PASSWORD instead.')
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error(`No user ${email}. Seed with: pnpm --filter caseiq-api seed:salman-cases`)
  const attorney = await prisma.attorney.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
  if (!attorney) throw new Error(`${email} has no attorney record.`)

  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '2h' })
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
    },
    attorney: { id: attorney.id, name: attorney.name, email: attorney.email },
  }
}

export async function pickDemoCases(prisma: PrismaClient, attorneyId: string): Promise<DemoCases> {
  const active =
    (await prisma.leadSubmission.findFirst({
      where: { assignedAttorneyId: attorneyId, routingLocked: true, status: 'retained' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })) ??
    (await prisma.leadSubmission.findFirst({
      where: { assignedAttorneyId: attorneyId, routingLocked: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    }))
  const pending = await prisma.leadSubmission.findFirst({
    where: { assignedAttorneyId: attorneyId, routingLocked: false, status: 'submitted' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return { activeLeadId: active?.id ?? null, pendingLeadId: pending?.id ?? null }
}

export function createPrisma() {
  return new PrismaClient()
}
