/**
 * Retract the relevance verdicts left behind by categories the vision checker did
 * not know about.
 *
 * `analyzePdfRelevance` rejects a PDF outright when `isDocumentCategory` is false,
 * on the reasoning that a PDF dropped into a photo slot is the wrong kind of file.
 * That reasoning was sound; the category list it consulted was not. `dec_page` and
 * `witness_statements` were absent from it, so every declarations page and witness
 * statement ever uploaded was told "This is a PDF document. We expected ..." and
 * quietly flagged for manual review.
 *
 * Those stored verdicts are known-wrong rather than merely stale. The message this
 * script matches on is emitted from exactly one branch, and that branch is
 * unreachable for a category that is now recognised — so a row matching both
 * conditions was mis-judged by definition, with no need to re-read the file.
 *
 * Re-deriving a correct verdict would mean fetching every PDF back out of storage
 * and running Textract over it. Clearing is the honest alternative: absence of a
 * verdict means "not assessed", which is true, where leaving it means "we think
 * this is the wrong file", which is false.
 *
 * The manual-review flag needs more care, because vision is only one of its four
 * causes. Unreadable text, low extraction confidence and a claimant-name mismatch
 * each raise it independently and are all still valid. The flag is therefore
 * recomputed from the remaining three rather than cleared, so a file held for a
 * reason that still stands stays held.
 *
 * Run:  node ../node_modules/tsx/dist/cli.mjs scripts/clear-stale-pdf-vision-verdicts.ts [--apply]
 *       Reports without writing unless --apply is passed.
 */
import { prisma } from '../src/lib/prisma'
import { isDocumentCategory } from '../src/lib/evidence-vision'

/** The opening words of the wrong-kind-of-file branch, which nothing else emits. */
const PDF_REJECTION_PREFIX = 'This is a PDF document.'

/** Mirrors the confidence floor in evidence-processing, so the two cannot disagree. */
const MIN_CONFIDENCE = 0.5

async function main() {
  const apply = process.argv.includes('--apply')

  const candidates = await prisma.evidenceFile.findMany({
    where: { visionLabels: { contains: PDF_REJECTION_PREFIX } },
    select: {
      id: true,
      assessmentId: true,
      category: true,
      originalName: true,
      ocrText: true,
      identityCheck: true,
      visionLabels: true,
      extractedData: { select: { id: true, confidence: true, isManualReview: true } },
    },
  })

  // A category still outside the checker's vocabulary was judged correctly: a PDF
  // really does not belong in a photo slot. Only the newly-taught ones were wronged.
  const wronged = candidates.filter((file) => isDocumentCategory(file.category))

  console.log(
    `Files carrying a PDF rejection: ${candidates.length} (${wronged.length} in categories now recognised)`,
  )
  if (!wronged.length) return
  if (!apply) console.log('Dry run — pass --apply to write.\n')

  let cleared = 0
  let unflagged = 0
  let stillHeld = 0

  for (const file of wronged) {
    // Every cause of manual review except the vision verdict being retracted.
    const identityMismatch = (() => {
      if (!file.identityCheck) return false
      try {
        return JSON.parse(file.identityCheck)?.verdict === 'mismatch'
      } catch {
        return false
      }
    })()

    const extracted = file.extractedData[0] ?? null
    const heldForOtherReasons =
      !file.ocrText || (extracted?.confidence ?? 0) < MIN_CONFIDENCE || identityMismatch

    const releasing = Boolean(extracted?.isManualReview) && !heldForOtherReasons
    if (releasing) unflagged++
    else if (extracted?.isManualReview) stillHeld++

    console.log(
      `  ${file.assessmentId}  ${file.category.padEnd(18)} ${file.originalName ?? '(unnamed)'}` +
        (releasing ? '  [releasing manual review]' : heldForOtherReasons ? '  [held for other reasons]' : ''),
    )

    if (!apply) continue

    await prisma.$transaction([
      prisma.evidenceFile.update({
        where: { id: file.id },
        data: { visionLabels: null, relevanceScore: 0 },
      }),
      ...(releasing && extracted
        ? [
            prisma.extractedData.update({
              where: { id: extracted.id },
              data: { isManualReview: false },
            }),
          ]
        : []),
    ])
    cleared++
  }

  console.log(
    apply
      ? `\nDone. Cleared ${cleared} verdict(s), released ${unflagged} from manual review, left ${stillHeld} held.`
      : `\nWould clear ${wronged.length} verdict(s) and release ${unflagged} from manual review (${stillHeld} held for other reasons).`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
