/**
 * Why was a document not flagged as naming someone other than the claimant?
 *
 * The identity check is silent by design — it records a verdict only when a real
 * comparison was possible, and returns null for every "we cannot say". That is
 * right for the attorney's inbox and useless for debugging, because a document
 * skipped for a bad category, an unreadable name, a case with no claimant name,
 * or an upload processed before the check shipped all look identical from the
 * outside: no badge.
 *
 * This prints which of those it was, per file, and whether the document would be
 * flagged if it were reprocessed today.
 *
 * Usage (inside the api container):
 *   docker cp api/scripts/diagnose-document-identity.ts clearcaseiq-api:/app/diagnose-document-identity.ts
 *   docker compose -f docker-compose.deploy.yml --env-file .env.prod exec \
 *     -e CLAIMANT_NAME="Apple Jones" api node ../node_modules/tsx/dist/cli.mjs diagnose-document-identity.ts
 *
 * Or by case:  -e ASSESSMENT_ID=cl...
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ASSESSMENT_ID = (process.env.ASSESSMENT_ID || '').trim()
const CLAIMANT_NAME = (process.env.CLAIMANT_NAME || '').trim()

/**
 * When `Check that a document names the claimant it was filed on` (a8250ca)
 * finished deploying to production. Anything processed before this could not
 * have been checked, and nothing backfills it.
 */
const CHECK_LIVE_SINCE = new Date('2026-09-15T04:22:22Z')

// Mirrors lib/claimant-identity-check.ts. Duplicated rather than imported so the
// script can be dropped into a running container on its own, as
// diagnose-attorney.ts is.
const IDENTITY_CHECKED_CATEGORIES = new Set([
  'medical_records',
  'bills',
  'wage_verification',
  'insurance_letters',
])

const NAME_NOISE = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof',
  'jr', 'sr', 'ii', 'iii', 'iv', 'v',
  'md', 'do', 'rn', 'lpn', 'np', 'pa', 'dds', 'phd', 'esq',
])

function nameTokens(name: string | null | undefined): string[] {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !NAME_NOISE.has(token))
}

function compareToClaimant(documentName: string | null, claimantName: string | null): 'match' | 'mismatch' | null {
  const docTokens = nameTokens(documentName)
  const claimantTokens = nameTokens(claimantName)
  if (docTokens.length === 0 || claimantTokens.length === 0) return null
  return docTokens.some((token) => claimantTokens.includes(token)) ? 'match' : 'mismatch'
}

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** The claimant name, and which of the two copies it came from. */
function resolveClaimantName(assessment: {
  facts: string | null
  user: { firstName: string | null; lastName: string | null } | null
}): { name: string | null; source: string } {
  const facts = parseJson<{ plaintiffContext?: { firstName?: unknown; lastName?: unknown } }>(assessment.facts)
  const first = typeof facts?.plaintiffContext?.firstName === 'string' ? facts.plaintiffContext.firstName : ''
  const last = typeof facts?.plaintiffContext?.lastName === 'string' ? facts.plaintiffContext.lastName : ''
  const fromFacts = [first, last].filter(Boolean).join(' ').trim()
  if (fromFacts) return { name: fromFacts, source: 'facts.plaintiffContext' }

  const fromUser = [assessment.user?.firstName, assessment.user?.lastName].filter(Boolean).join(' ').trim()
  if (fromUser) return { name: fromUser, source: 'User row' }

  return { name: null, source: 'nowhere — no name recorded on this case' }
}

async function main() {
  if (!ASSESSMENT_ID && !CLAIMANT_NAME) {
    console.error('Set ASSESSMENT_ID or CLAIMANT_NAME.')
    process.exit(1)
  }

  const assessments = await prisma.assessment.findMany({
    where: ASSESSMENT_ID
      ? { id: ASSESSMENT_ID }
      : {
          OR: [
            { facts: { contains: CLAIMANT_NAME.split(/\s+/)[0] } },
            { user: { firstName: { contains: CLAIMANT_NAME.split(/\s+/)[0] } } },
          ],
        },
    select: {
      id: true,
      facts: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  if (assessments.length === 0) {
    console.log('No case matched.')
    return
  }

  console.log(`Identity check live in production since ${CHECK_LIVE_SINCE.toISOString()}\n`)

  for (const assessment of assessments) {
    const claimant = resolveClaimantName(assessment)
    if (CLAIMANT_NAME && claimant.name && !nameTokens(claimant.name).some((token) => nameTokens(CLAIMANT_NAME).includes(token))) {
      continue
    }

    console.log('='.repeat(72))
    console.log(`Case ${assessment.id}  (opened ${assessment.createdAt.toISOString()})`)
    console.log(`Claimant: ${claimant.name ?? '(none)'}   [from ${claimant.source}]`)

    const files = await prisma.evidenceFile.findMany({
      where: { assessmentId: assessment.id },
      select: {
        id: true,
        originalName: true,
        category: true,
        processingStatus: true,
        ocrText: true,
        identityCheck: true,
        createdAt: true,
        updatedAt: true,
        extractedData: { select: { entities: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (files.length === 0) {
      console.log('  No evidence files.')
      continue
    }

    for (const file of files) {
      const entities = parseJson<{ patientName?: string }>(file.extractedData[0]?.entities ?? null)
      const documentName = entities?.patientName?.trim() || null
      const stored = parseJson<{ verdict?: string; documentName?: string }>(file.identityCheck)

      console.log(`\n  ${file.originalName}`)
      console.log(`    category        ${file.category}`)
      console.log(`    processed       ${file.updatedAt.toISOString()} (${file.processingStatus})`)
      console.log(`    OCR text        ${file.ocrText ? `${file.ocrText.length} chars` : 'NONE'}`)
      console.log(`    name on page    ${documentName ?? 'NONE READ'}`)
      console.log(`    stored verdict  ${stored?.verdict ?? 'none'}`)

      // Name the first gate that stopped this file, in the order the code hits them.
      let reason: string
      if (stored?.verdict) {
        reason = `checked — ${stored.verdict}`
      } else if (file.updatedAt < CHECK_LIVE_SINCE) {
        reason = 'NOT CHECKED — processed before the check shipped; nothing backfills it'
      } else if (!IDENTITY_CHECKED_CATEGORIES.has(file.category)) {
        reason = `NOT CHECKED — "${file.category}" is not an identity-checked category`
      } else if (!file.ocrText) {
        reason = 'NOT CHECKED — no OCR text, so there was no name to read'
      } else if (!documentName) {
        reason = 'NOT CHECKED — OCR text exists but no patient name matched the label patterns'
      } else if (!claimant.name) {
        reason = 'NOT CHECKED — no claimant name recorded on this case to compare against'
      } else {
        reason = 'NOT CHECKED — reason unclear; check application logs'
      }
      console.log(`    result          ${reason}`)

      const wouldBe = compareToClaimant(documentName, claimant.name)
      if (wouldBe && !stored?.verdict) {
        console.log(`    if reprocessed  would record "${wouldBe}" (${documentName} vs ${claimant.name})`)
      }
    }
    console.log()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
