import { describe, expect, it } from 'vitest'
import {
  classifyAssociation,
  classifySideFromText,
  derivePiSignals,
  sourceForStagedRow,
} from './pi-signal-derive'
import { isEligibleForClaimantLeads, scoreSegment } from './pi-segmentation'

describe('classifySideFromText', () => {
  it('identifies defense firms by the client they name', () => {
    // Defense firms say who they work for; plaintiff firms never use these phrases.
    for (const text of [
      'Insurance Defense',
      'Civil Defense Litigation',
      'We represent insurers and self-insured employers',
      'Coverage counsel and bad faith defense',
      'Premises Liability Defense',
    ]) {
      expect(classifySideFromText(text).side, text).toBe('defense')
    }
  })

  it('identifies plaintiff firms by contingency pitch and who they represent', () => {
    for (const text of [
      "Plaintiff's personal injury",
      'We represent the injured',
      'No fee unless we win',
      'Contingency fee basis',
      'Accident victim advocacy',
    ]) {
      expect(classifySideFromText(text).side, text).toBe('plaintiff')
    }
  })

  it('returns no side for a bare personal injury claim', () => {
    // "Personal injury" is said by both sides, so it decides nothing.
    const result = classifySideFromText('Personal Injury')
    expect(result.side).toBeNull()
    expect(result.matched).toBeNull()
  })

  it('resolves conflicting text to defense', () => {
    // Missing a defense practice is the more consequential error, so defense wins.
    const result = classifySideFromText('Plaintiff and defense litigation counsel')
    expect(result.side).toBe('defense')
    expect(result.conflicting).toBe(true)
  })

  it('prefers the more specific phrase when one contains another', () => {
    // "plaintiff" is a substring of "plaintiff's"; the longer phrase should win
    // so the audit trail records the most specific evidence found.
    expect(classifySideFromText("Plaintiff's trial counsel").matched).toBe("plaintiff's")
  })

  it('handles empty, null and curly-quoted input', () => {
    expect(classifySideFromText(null).side).toBeNull()
    expect(classifySideFromText('').side).toBeNull()
    expect(classifySideFromText('Plaintiff\u2019s counsel').side).toBe('plaintiff')
  })
})

describe('classifyAssociation', () => {
  it('recognizes plaintiff-only organizations', () => {
    expect(classifyAssociation('Consumer Attorneys of California')).toBe('plaintiff')
    expect(classifyAssociation('CAALA')).toBe('plaintiff')
    expect(classifyAssociation('American Association for Justice')).toBe('plaintiff')
  })

  it('recognizes defense-only organizations', () => {
    expect(classifyAssociation('Association of Southern California Defense Counsel')).toBe('defense')
    expect(classifyAssociation('DRI')).toBe('defense')
    expect(classifyAssociation('Federation of Defense and Corporate Counsel')).toBe('defense')
  })

  it('returns null for organizations that admit both sides', () => {
    expect(classifyAssociation('Los Angeles County Bar Association')).toBeNull()
    expect(classifyAssociation('State Bar of California')).toBeNull()
  })

  it('matches short acronyms only as whole words', () => {
    expect(classifyAssociation('DRI')).toBe('defense')
    expect(classifyAssociation('ATLA')).toBe('plaintiff')
    // The acronyms must not fire inside unrelated words: "dri" in "drivers",
    // "atla" in "Atlanta".
    expect(classifyAssociation('Association of Drivers')).toBeNull()
    expect(classifyAssociation('Atlanta Bar Association')).toBeNull()
  })
})

describe('derivePiSignals', () => {
  it('emits one signal per source rather than one per label', () => {
    // Ten PI labels on one website is one website saying so.
    const result = derivePiSignals({
      practiceAreas: ['Car Accidents', 'Truck Accidents', 'Slip and Fall', 'Dog Bites'],
      source: 'website',
    })
    const piSignals = result.signals.filter((s) => s.kind === 'pi_practice_area')
    expect(piSignals).toHaveLength(1)
    expect(piSignals[0].count).toBeGreaterThan(1)
  })

  it('reports the incident types the practice areas map to', () => {
    const result = derivePiSignals({
      practiceAreas: ['Car Accidents', 'Medical Malpractice'],
      source: 'bar_record',
    })
    expect(result.mentionsPi).toBe(true)
    expect(result.subtypes).toContain('vehicle')
    expect(result.subtypes).toContain('medmal')
  })

  it('produces nothing from practice areas unrelated to injury', () => {
    const result = derivePiSignals({
      practiceAreas: ['Estate Planning', 'Tax Law', 'Immigration'],
      source: 'directory',
    })
    expect(result.mentionsPi).toBe(false)
    expect(result.signals).toHaveLength(0)
  })

  it('parses a JSON array as stored in the database', () => {
    const result = derivePiSignals({
      practiceAreas: '["Personal Injury","Wrongful Death"]',
      source: 'bar_record',
    })
    expect(result.mentionsPi).toBe(true)
  })

  it('carries the side from the practice-area labels', () => {
    const result = derivePiSignals({
      practiceAreas: ['Personal Injury Defense', 'Insurance Defense'],
      source: 'directory',
    })
    expect(result.signals.every((s) => s.side === 'defense')).toBe(true)
    expect(result.signals.some((s) => s.kind === 'defense_side_marker')).toBe(true)
  })

  it('finds the side in the firm name when practice areas are silent', () => {
    const result = derivePiSignals({
      practiceAreas: ['Personal Injury'],
      sideText: ['Smith & Jones Insurance Defense LLP'],
      source: 'website',
    })
    expect(result.signals.find((s) => s.kind === 'pi_practice_area')?.side).toBe('defense')
  })

  it('records a defense marker even with no PI practice area listed', () => {
    // Knowing a firm does insurance defense is what keeps claimants away from it,
    // whether or not it advertises personal injury.
    const result = derivePiSignals({
      practiceAreas: ['Commercial Litigation'],
      sideText: ['Insurance Defense and Coverage'],
      source: 'website',
    })
    expect(result.mentionsPi).toBe(false)
    expect(result.signals).toHaveLength(1)
    expect(result.signals[0].kind).toBe('defense_side_marker')
    expect(result.signals[0].side).toBe('defense')
  })

  it('keeps a side marker from implying a whole practice', () => {
    const marker = derivePiSignals({
      practiceAreas: [],
      sideText: ['Plaintiff advocacy'],
      source: 'website',
    }).signals[0]
    // One phrase should not carry the weight of a documented practice.
    expect(marker.weight).toBeLessThan(0.2)
  })

  it('records the evidence verbatim so a reviewer can judge the inference', () => {
    const result = derivePiSignals({
      practiceAreas: ['Car Accidents', 'Estate Planning', 'Dog Bites'],
      sideText: ['Insurance Defense Group'],
      source: 'directory',
    })

    // The labels that actually matched, not the ones ignored.
    const piSignal = result.signals.find((s) => s.kind === 'pi_practice_area')
    expect(piSignal?.value).toContain('Car Accidents')
    expect(piSignal?.value).toContain('Dog Bites')
    expect(piSignal?.value).not.toContain('Estate Planning')

    // And the phrase that decided the side.
    const sideSignal = result.signals.find((s) => s.kind === 'defense_side_marker')
    expect(sideSignal?.value).toBe('insurance defense')
  })

  it('passes through provenance for auditing', () => {
    const observedAt = new Date('2026-01-15T00:00:00.000Z')
    const result = derivePiSignals({
      practiceAreas: ['Personal Injury'],
      source: 'directory',
      observedAt,
      sourceRef: 'https://example.test/attorney/123',
    })
    expect(result.signals[0].observedAt).toBe(observedAt)
    expect(result.signals[0].sourceRef).toBe('https://example.test/attorney/123')
  })
})

describe('sourceForStagedRow', () => {
  it('treats the bar roll as more accountable than a directory scrape', () => {
    expect(sourceForStagedRow('ca_state_bar')).toBe('bar_record')
    expect(sourceForStagedRow('calbar-roll')).toBe('bar_record')
    expect(sourceForStagedRow('lawyers.com')).toBe('directory')
    expect(sourceForStagedRow(null)).toBe('directory')
  })
})

describe('derived signals through the scorer', () => {
  const observedAt = new Date('2026-07-01T00:00:00.000Z')
  const now = new Date('2026-07-27T00:00:00.000Z')

  it('keeps a defense firm out of claimant leads end to end', () => {
    const derived = derivePiSignals({
      practiceAreas: ['Personal Injury Defense', 'Insurance Defense', 'Premises Liability Defense'],
      sideText: ['Carrier Defense Group LLP'],
      source: 'directory',
      observedAt,
    })
    const score = scoreSegment(derived.signals, now)

    expect(score.side).toBe('defense')
    expect(isEligibleForClaimantLeads(score).eligible).toBe(false)
  })

  it('leaves a plaintiff firm known only from a directory short of eligible', () => {
    // Self-reported evidence alone should not open the lead gate; it needs
    // corroboration from filings or association membership first.
    const derived = derivePiSignals({
      practiceAreas: ['Car Accidents', 'Personal Injury'],
      sideText: ['No fee unless we win'],
      source: 'directory',
      observedAt,
    })
    const score = scoreSegment(derived.signals, now)

    expect(score.side).toBe('plaintiff')
    expect(score.breakdown.independentSources).toBe(0)
    expect(isEligibleForClaimantLeads(score).eligible).toBe(false)
  })
})
