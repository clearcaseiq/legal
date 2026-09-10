import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guards the outcome of the cross-surface metric audit: one case must not be
 * described by two different numbers depending on who is looking at it.
 *
 * The three headline metrics each drifted the same way. Every surface that
 * wanted a settlement band, a liability grade or a readiness percentage
 * computed its own from the raw prediction, so the claimant, the case
 * specialist and the attorney read different values off one case — the
 * claimant saw the band discounted to 0.7x and 0.9x, liability was graded on
 * four different ladders across seven call sites, and readiness had five
 * independent point systems.
 *
 * The fix was structural: the server owns the numbers and the surfaces render
 * them. Nothing about that is enforced by the type system, though, because
 * re-deriving a number from data you already hold type-checks perfectly. These
 * tests read the source, in the same spirit as App.ssrRoutes.test.ts, because
 * the property being guarded is the absence of a local calculation rather than
 * anything observable in the rendered output.
 */

const root = join(__dirname, '..')

function source(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

/** Surfaces that display at least one of the three headline metrics. */
const SURFACES = [
  'pages/Results.tsx',
  'pages/Dashboard.tsx',
  'components/AttorneyDashboardLeadDetail.tsx',
  'components/AttorneyDashboardWorkstreamDemand.tsx',
  'components/AttorneyDashboardWorkstreamOverview.tsx',
  'pages/AttorneyDashboardShell.tsx',
  'features/casework/CaseWorkspacePage.tsx',
] as const

/** Lines of a file, numbered from 1, with blank and comment-only lines dropped. */
function codeLines(path: string): Array<{ n: number; text: string }> {
  return source(path)
    .split(/\r?\n/)
    .map((text, i) => ({ n: i + 1, text }))
    .filter(({ text }) => {
      const trimmed = text.trim()
      return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')
    })
}

/**
 * The declaration of `name`, from its `const` line up to the next declaration.
 * Returned as text so a test can assert on how the value is derived rather than
 * on what it evaluates to.
 */
function assignmentOf(path: string, name: string): string {
  const lines = source(path).split(/\r?\n/)
  const start = lines.findIndex((line) => new RegExp(`\\bconst ${name}\\b\\s*(:|=)`).test(line))
  if (start === -1) return `no declaration of ${name}`
  const after = lines.slice(start + 1).findIndex((line) => /^\s*(const|let|function|return)\b/.test(line))
  return lines.slice(start, start + 1 + Math.max(0, after)).join('\n')
}

function violations(path: string, pattern: RegExp): string[] {
  return codeLines(path)
    .filter(({ text }) => pattern.test(text))
    .map(({ n, text }) => `${path}:${n}  ${text.trim()}`)
}

/**
 * The shapes each defect took, paired with a line of the code that carried it.
 * A guard that matches nothing passes for the wrong reason, so the sample is
 * kept beside the pattern and asserted against it below.
 */
const DEFECTS = {
  scaledBand: {
    pattern: /\b(displaySettlement\w*|settlementLow|settlementHigh|settlementExpected)\s*=\s*[^=].*\*\s*0?\.\d/,
    sample: 'const displaySettlementLow = roundEstimateForDisplay(settlementLow * 0.7)',
  },
  rebuiltBand: {
    pattern: /\b(settlementLow|settlementHigh|valueLow|valueHigh)\s*=\s*[^=].*\bmedian\b.*[*/]\s*\d/,
    sample: 'const settlementHigh = median * 1.8',
  },
  forkedTier: {
    pattern: /\bliability(Score|Percent|Viability)\s*(>=|>|<=|<)\s*(0?\.(7|45|85)\b|70\b|45\b|85\b)/,
    sample: "liabilityScore >= 0.7 ? 'strong' : liabilityScore >= 0.4 ? 'moderate' : 'weak'",
  },
  readinessLadder: {
    pattern: /\b(buildLitigationReadinessScore|litigationReadiness\w*\s*\+=|readinessScore\s*\+=)/,
    sample: 'const litigationReadinessScore = buildLitigationReadinessScore({ evidenceCount })',
  },
} as const

describe('the guards below are not vacuous', () => {
  it.each(Object.entries(DEFECTS))('catches the %s the audit found', (_name, { pattern, sample }) => {
    expect(pattern.test(sample)).toBe(true)
  })
})

describe('settlement is shown as served', () => {
  /**
   * The defect: Results.tsx multiplied the served band by 0.7 and 0.9 before
   * display, so the claimant was quoted less than the platform believed the
   * case was worth and less than the attorney was shown. Uncertainty about a
   * thin file is carried by the width of the band in the engine now, not by a
   * discount applied on the way to the screen.
   */
  it('does not scale the band on its way to the claimant', () => {
    expect(violations('pages/Results.tsx', DEFECTS.scaledBand.pattern)).toEqual([])
  })

  /**
   * Every surface reads p25/p75 off the served prediction. A surface that
   * rebuilt a band from a median and a spread of its own would agree today and
   * drift the moment the engine's spread changed.
   */
  it('reads the band from the served percentiles rather than rebuilding it', () => {
    const rebuilt = SURFACES.flatMap((path) => violations(path, DEFECTS.rebuiltBand.pattern))

    expect(rebuilt).toEqual([])
  })
})

describe('liability is graded by the shared grader', () => {
  /**
   * Four ladders across seven call sites: 85/70/45 in the engine, 70/40 for the
   * Results clarity label, 75/45 for its snapshot tile, 70/55/40 for its
   * strength phrasing, 70/40 on the Dashboard and in both attorney-offer
   * notifications. A case scoring 42 was "Weak" to the attorney and "Mixed" to
   * the claimant, and a 72 was "Strong" in one Results tile and "Mixed" in
   * another on the same screen.
   */
  it('derives every liability label from liabilityTier', () => {
    const labelAssignments = [
      { path: 'pages/Results.tsx', names: ['liabilitySnapshotLabel', 'liabilityClarityDisplay', 'liabStrengthLabel'] },
      { path: 'pages/Dashboard.tsx', names: ['liabilityLabel'] },
    ]

    for (const { path, names } of labelAssignments) {
      for (const name of names) {
        expect(assignmentOf(path, name), `${name} in ${path}`).toMatch(
          /liabilityTier|LIABILITY_TIER_|liabilityConfidenceLevel/,
        )
      }
    }
  })

  /**
   * The tier boundaries live in one module per side. A surface that compares a
   * liability score to 0.7 or 0.45 has quietly forked them.
   *
   * Scoped to the plaintiff pages: the attorney surfaces compare liability to
   * thresholds of their own for decisions that are not grades — whether to
   * litigate or negotiate, whether a liability narrative is drafted — and those
   * are strategy rules that are allowed their own numbers.
   */
  it('keeps tier boundaries out of the plaintiff pages', () => {
    const forked = ['pages/Results.tsx', 'pages/Dashboard.tsx'].flatMap((path) =>
      violations(path, DEFECTS.forkedTier.pattern),
    )

    expect(forked).toEqual([])
  })
})

describe('readiness is the served score', () => {
  /**
   * Five point systems used to answer "how ready is this case": one in
   * case-insights on the server and four more spread across the surfaces. The
   * plaintiff pages were the worst of it, because what they labelled "case
   * readiness" was really intake completeness, so a claimant who had filled in
   * every field saw a high number while the attorney saw a low one.
   */
  it('has no local readiness point ladder left on the plaintiff pages', () => {
    const ladders = ['pages/Results.tsx', 'pages/Dashboard.tsx'].flatMap((path) =>
      violations(path, DEFECTS.readinessLadder.pattern),
    )

    expect(ladders).toEqual([])
  })

  /** Both plaintiff surfaces read the same served field. */
  it('reads the readiness percentage from casePreparation', () => {
    for (const path of ['pages/Results.tsx', 'pages/Dashboard.tsx']) {
      expect(source(path), path).toMatch(/casePreparation[?.]*\.?readinessScore/)
    }
  })

  /**
   * A file with nothing uploaded is capped below the attorney-review band, so
   * the cap has to come from the shared constant rather than a literal that
   * only one page knows.
   */
  it('caps an undocumented file from the shared constant', () => {
    for (const path of ['pages/Results.tsx', 'pages/Dashboard.tsx']) {
      expect(source(path), path).toMatch(/UNDOCUMENTED_READINESS_CEILING/)
    }
  })

  /**
   * The demand gates had drifted to four different literals — 65, 70, 75 and
   * 85 — across the surfaces that decide when a demand can be drafted. They are
   * named thresholds on the heuristics config now, so an admin moving one moves
   * all of them.
   */
  it('gates the demand workstream on the configured threshold', () => {
    for (const path of ['components/AttorneyDashboardWorkstreamDemand.tsx', 'features/casework/CaseWorkspacePage.tsx']) {
      expect(source(path), path).toMatch(/readinessLabels\.demandGateMin/)
    }

    expect(source('pages/AttorneyDashboardShell.tsx')).toMatch(/readinessLabels\.demandReadyMin/)
  })
})
