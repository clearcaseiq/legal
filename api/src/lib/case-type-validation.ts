export type CaseTypeValidation = {
  selectedClaimType: string
  validatedClaimType: string
  subtypes: string[]
  conflicts: string[]
  confidence: number
  reasons: string[]
  source: 'rules_v1'
}

type Candidate = {
  claimType: string
  score: number
  reasons: string[]
  subtypes: string[]
}

const PUBLIC_CLAIM_TYPE_BY_INJURY_TYPE: Record<string, string> = {
  vehicle: 'auto',
  slip_fall: 'slip_and_fall',
  workplace: 'workplace_injury',
  medmal: 'medmal',
  dog_bite: 'dog_bite',
  product: 'product',
  assault: 'intentional_tort',
  toxic: 'toxic_exposure',
  other: 'other_pi',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function normalize(value: unknown) {
  return String(value || '').toLowerCase()
}

function compactUnique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function addCandidate(candidates: Candidate[], claimType: string, score: number, reason: string, subtypes: string[] = []) {
  const existing = candidates.find((candidate) => candidate.claimType === claimType)
  if (existing) {
    existing.score += score
    existing.reasons.push(reason)
    existing.subtypes.push(...subtypes)
    existing.subtypes = compactUnique(existing.subtypes)
    return
  }
  candidates.push({ claimType, score, reasons: [reason], subtypes: compactUnique(subtypes) })
}

function collectSubtypeHints(branch: Record<string, unknown>, text: string) {
  const subtypes: string[] = []

  for (const key of ['crashType', 'hazardType', 'errorType', 'productType', 'assaultType', 'toxicSubstance', 'dogLocation']) {
    const value = branch[key]
    if (typeof value === 'string' && value && value !== 'not_sure') subtypes.push(value)
  }

  if (/\b(rear[-\s]?end|hit from behind)\b/i.test(text)) subtypes.push('rear_end')
  if (/\b(uber|lyft|rideshare)\b/i.test(text)) subtypes.push('rideshare')
  if (/\b(truck|tractor[-\s]?trailer|semi)\b/i.test(text)) subtypes.push('commercial_vehicle')
  if (/\b(pedestrian|walking|crosswalk)\b/i.test(text)) subtypes.push('pedestrian')
  if (/\b(bicycle|bike|cyclist)\b/i.test(text)) subtypes.push('bicycle')
  if (/\b(construction|job site|workplace|on the job|employer)\b/i.test(text)) subtypes.push('on_the_job')

  return compactUnique(subtypes)
}

export function validateCaseTypeFromFacts(selectedClaimType: string, facts: Record<string, unknown>): CaseTypeValidation {
  const incident = asRecord(facts.incident)
  const intakeData = asRecord(facts.intakeData)
  const branch = { ...asRecord(facts.liability), ...asRecord(intakeData.branch) }
  const injuries = Array.isArray(facts.injuries) ? facts.injuries : []
  const injuryText = injuries.map((injury) => JSON.stringify(injury)).join(' ')
  const text = normalize(
    [
      selectedClaimType,
      intakeData.injuryType,
      intakeData.narrative,
      incident.narrative,
      incident.location,
      injuryText,
      JSON.stringify(branch),
    ].join(' '),
  )

  const candidates: Candidate[] = []
  const injuryType = typeof intakeData.injuryType === 'string' ? intakeData.injuryType : ''
  if (injuryType && PUBLIC_CLAIM_TYPE_BY_INJURY_TYPE[injuryType]) {
    addCandidate(candidates, PUBLIC_CLAIM_TYPE_BY_INJURY_TYPE[injuryType], 4, `intake injury type is ${injuryType}`)
  }

  if (/\b(wrongful death|fatal|fatally|death|died|killed|deceased|decedent|estate of)\b/.test(text)) {
    addCandidate(candidates, 'wrongful_death', 8, 'death terms appear in facts', ['death'])
  }

  if (/\b(car|vehicle|auto|truck|motorcycle|rear[-\s]?end|t[-\s]?bone|collision|crash|pedestrian|bicycle|uber|lyft)\b/.test(text)) {
    addCandidate(candidates, 'auto', 5, 'vehicle crash terms appear in facts')
  }

  if (/\b(slip|trip|fall|stairs?|sidewalk|wet floor|uneven|premises|store|restaurant|apartment|hotel)\b/.test(text)) {
    addCandidate(candidates, 'slip_and_fall', 5, 'premises or fall terms appear in facts')
  }

  if (/\b(dog bite|dog attack|animal attack|bitten by dog)\b/.test(text)) {
    addCandidate(candidates, 'dog_bite', 6, 'dog bite terms appear in facts')
  }

  if (/\b(medical malpractice|doctor|hospital|surgery error|misdiagnosis|delayed diagnosis|medication error|birth injury)\b/.test(text)) {
    addCandidate(candidates, 'medmal', 6, 'medical negligence terms appear in facts')
  }

  if (/\b(defective product|product liability|medical device|medication|machinery|failure to warn|product defect)\b/.test(text)) {
    addCandidate(candidates, 'product', 5, 'product liability terms appear in facts')
  }

  if (/\b(workplace|on the job|at work|job site|construction site|employer|workers'? comp|employee)\b/.test(text)) {
    addCandidate(candidates, 'workplace_injury', 6, 'workplace injury terms appear in facts')
  }

  if (/\b(assault|battery|robbery|bar fight|nightclub attack|attacked|intentional)\b/.test(text)) {
    addCandidate(candidates, 'intentional_tort', 6, 'intentional injury terms appear in facts')
  }

  if (/\b(toxic|chemical|mold|asbestos|gas leak|contamination|exposure)\b/.test(text)) {
    addCandidate(candidates, 'toxic_exposure', 6, 'toxic exposure terms appear in facts')
  }

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  const fallbackType = selectedClaimType || 'other_pi'
  const validatedClaimType = best?.claimType || fallbackType
  const selectedCanonical =
    selectedClaimType === 'high_severity_surgery' && validatedClaimType === 'workplace_injury'
      ? 'workplace_injury'
      : selectedClaimType
  const conflicts =
    selectedCanonical && selectedCanonical !== validatedClaimType
      ? [`Selected claim type "${selectedClaimType}" does not match validated type "${validatedClaimType}".`]
      : []
  const confidence = best ? Math.min(0.97, Math.max(0.55, 0.5 + best.score / 20)) : 0.45

  return {
    selectedClaimType,
    validatedClaimType,
    subtypes: compactUnique([...(best?.subtypes || []), ...collectSubtypeHints(branch, text)]),
    conflicts,
    confidence: Number(confidence.toFixed(2)),
    reasons: best?.reasons || ['No strong case-type signals detected; using selected claim type.'],
    source: 'rules_v1',
  }
}
