/**
 * Ground-truth what exists for an attorney (by name or email) — used to debug
 * why a seeded book isn't showing in New Matches.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/diagnose-attorney.ts clearcaseiq-api:/app/diagnose-attorney.ts
 *   docker compose -f docker-compose.prod.yml --env-file .env.prod exec \
 *     -e ATTORNEY_NAME=Tucker api node ../node_modules/tsx/dist/cli.mjs diagnose-attorney.ts
 *
 * Or by email:  -e ATTORNEY_EMAIL=someone@example.com
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const NAME = (process.env.ATTORNEY_NAME || '').trim()
const EMAIL = (process.env.ATTORNEY_EMAIL || '').trim()

async function main() {
  console.log(`\n=== diagnose-attorney (name="${NAME || '—'}" email="${EMAIL || '—'}") ===\n`)

  const where = EMAIL
    ? { email: { equals: EMAIL, mode: 'insensitive' as const } }
    : NAME
      ? { name: { contains: NAME, mode: 'insensitive' as const } }
      : {}

  const attorneys = await prisma.attorney.findMany({
    where,
    select: { id: true, name: true, email: true, isActive: true, lawFirmId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (attorneys.length === 0) {
    console.log('No Attorney rows matched. Listing a few attorneys so you can see the real names:')
    const sample = await prisma.attorney.findMany({ select: { id: true, name: true, email: true }, take: 25, orderBy: { createdAt: 'desc' } })
    sample.forEach((a) => console.log(`  - ${a.name} <${a.email || 'no-email'}> (${a.id})`))
    return
  }

  for (const a of attorneys) {
    console.log(`Attorney: ${a.name} <${a.email || 'no-email'}> (${a.id}) active=${a.isActive} firm=${a.lawFirmId || 'none'}`)

    const leadsByStatus = await prisma.leadSubmission.groupBy({
      by: ['status'],
      where: { assignedAttorneyId: a.id },
      _count: { _all: true },
    })
    const leadTotal = leadsByStatus.reduce((s, r) => s + r._count._all, 0)
    console.log(`  leadSubmissions (assignedAttorneyId): ${leadTotal}`)
    leadsByStatus.forEach((r) => console.log(`     status="${r.status}": ${r._count._all}`))

    const introsByStatus = await prisma.introduction.groupBy({
      by: ['status'],
      where: { attorneyId: a.id },
      _count: { _all: true },
    })
    const introTotal = introsByStatus.reduce((s, r) => s + r._count._all, 0)
    console.log(`  introductions (attorneyId): ${introTotal}`)
    introsByStatus.forEach((r) => console.log(`     status="${r.status}": ${r._count._all}`))

    // Reproduce exactly what powers the Accepted / Declined tiles so we can see
    // why they might read 0 (old responses fall outside the 7/30/90-day window).
    const respondedIntros = await prisma.introduction.findMany({
      where: { attorneyId: a.id, respondedAt: { not: null } },
      select: { status: true, respondedAt: true },
    })
    const nowMs = Date.now()
    const DAY = 24 * 60 * 60 * 1000
    const acc = { last7: 0, last30: 0, last90: 0, total: 0 }
    const dec = { last7: 0, last30: 0, last90: 0, total: 0 }
    for (const i of respondedIntros) {
      const bucket = i.status === 'ACCEPTED' ? acc : i.status === 'DECLINED' ? dec : null
      if (!bucket || !i.respondedAt) continue
      bucket.total += 1
      const age = nowMs - new Date(i.respondedAt).getTime()
      if (age <= 7 * DAY) bucket.last7 += 1
      if (age <= 30 * DAY) bucket.last30 += 1
      if (age <= 90 * DAY) bucket.last90 += 1
    }
    console.log(`  Accepted tile would show → 7d:${acc.last7} 30d:${acc.last30} 90d:${acc.last90} (total ${acc.total})`)
    console.log(`  Declined tile would show → 7d:${dec.last7} 30d:${dec.last30} 90d:${dec.last90} (total ${dec.total})`)
    for (const i of respondedIntros) {
      if (i.status !== 'ACCEPTED' && i.status !== 'DECLINED') continue
      const days = i.respondedAt ? Math.round((nowMs - new Date(i.respondedAt).getTime()) / DAY) : null
      console.log(`     ${i.status} • responded ${days != null ? days + ' day(s) ago' : 'unknown'} (${i.respondedAt?.toISOString?.() || '—'})`)
    }

    // What the dashboard "New Matches" view actually sees: PENDING intros, newest first.
    const pending = await prisma.introduction.findMany({
      where: { attorneyId: a.id, status: 'PENDING' },
      select: { id: true, requestedAt: true, assessment: { select: { claimType: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { requestedAt: 'desc' },
      take: 25,
    })
    console.log(`  PENDING introductions (should equal New Matches): ${pending.length}`)
    for (const p of pending.slice(0, 25)) {
      const ageMin = p.requestedAt ? Math.round((Date.now() - new Date(p.requestedAt).getTime()) / 60000) : null
      const nm = `${p.assessment?.user?.firstName || ''} ${p.assessment?.user?.lastName || ''}`.trim() || '—'
      console.log(`     - ${p.assessment?.claimType || '?'} • ${nm} • requested ${ageMin != null ? ageMin + 'm ago' : 'unknown'}`)
    }
    console.log('')
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
