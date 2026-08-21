/**
 * Copy attorney case results out of the retired AttorneyProfile.verifiedVerdicts
 * JSON column into the AttorneyCaseResult table.
 *
 * Safe to re-run: a row is skipped when the same attorney already has a result
 * with the same type, amount and date. The source column is left untouched, so
 * this can be run before the API is switched over and again afterwards to catch
 * anything written in between.
 *
 * Usage:
 *   node ../node_modules/tsx/dist/cli.mjs scripts/backfill-case-results.ts [--commit]
 *
 * Without --commit it reports what it would do and writes nothing.
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: false })

const prisma = new PrismaClient()
const COMMIT = process.argv.includes('--commit')

type LegacyVerdict = {
  id?: string
  caseType?: string
  resultType?: string
  settlementAmount?: number | string
  caseDescription?: string
  description?: string
  date?: string
  venue?: string
  caseNumber?: string
  documentUrl?: string
  documentName?: string
  addedAt?: string
  status?: string
}

function parse(raw: string | null): LegacyVerdict[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function main() {
  const profiles = await prisma.attorneyProfile.findMany({
    select: { attorneyId: true, verifiedVerdicts: true },
  })

  let created = 0
  let skipped = 0
  let empty = 0

  for (const profile of profiles) {
    const verdicts = parse(profile.verifiedVerdicts)
    if (verdicts.length === 0) {
      empty += 1
      continue
    }

    for (const v of verdicts) {
      const caseType = String(v.caseType || '').trim()
      // A row with no case type is not showable and not reviewable; the legacy
      // column allowed it, the table requires it.
      if (!caseType) {
        skipped += 1
        continue
      }

      const settlementAmount = Number(v.settlementAmount || 0)
      const date = v.date ? String(v.date) : null

      const existing = await prisma.attorneyCaseResult.findFirst({
        where: { attorneyId: profile.attorneyId, caseType, settlementAmount, date },
        select: { id: true },
      })
      if (existing) {
        skipped += 1
        continue
      }

      const data = {
        attorneyId: profile.attorneyId,
        caseType,
        resultType: v.resultType === 'verdict' ? 'verdict' : 'settlement',
        settlementAmount,
        caseDescription: v.caseDescription || v.description || null,
        date,
        venue: v.venue || null,
        caseNumber: v.caseNumber || null,
        documentUrl: v.documentUrl || null,
        documentName: v.documentName || null,
        // Only an explicit 'verified' carries over. Seed rows and the old
        // 'pending_verification' marker both land as pending, which is honest:
        // none of them were ever actually reviewed.
        status: v.status === 'verified' ? 'verified' : 'pending',
        createdAt: v.addedAt && !Number.isNaN(Date.parse(v.addedAt)) ? new Date(v.addedAt) : new Date(),
      }

      if (COMMIT) await prisma.attorneyCaseResult.create({ data })
      created += 1
    }
  }

  console.log(
    `${COMMIT ? 'Backfilled' : 'Would backfill'} ${created} case result(s); ` +
      `skipped ${skipped} (already present or unusable); ` +
      `${empty} profile(s) had none.`,
  )
  if (!COMMIT) console.log('Re-run with --commit to write.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
