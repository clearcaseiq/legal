import { describe, expect, it, vi } from 'vitest'

vi.mock('../env', () => ({
  ENV: {
    LLM_ALLOW_PHI: false,
  },
}))

import { ENV } from '../env'
import {
  isBlockedKnownFact,
  prepareCaseIntelligenceForLlm,
  redactLlmPii,
  sanitizeCaseIntelligenceForLlm,
  sanitizeLlmMessages,
  toGapKeysOnlyCaseIntelligence,
} from './llm-prompt-sanitize'

describe('redactLlmPii', () => {
  it('redacts SSN, email, phone, and street address', () => {
    const raw =
      'Client Jane (ssn 123-45-6789) email jane.doe@example.com called 415-555-0199 from 123 Main Street about the crash.'
    const out = redactLlmPii(raw)
    expect(out).not.toMatch(/123-45-6789/)
    expect(out).not.toMatch(/jane\.doe@example\.com/i)
    expect(out).not.toMatch(/415-555-0199/)
    expect(out).not.toMatch(/123 Main Street/i)
    expect(out).toContain('[REDACTED_SSN]')
    expect(out).toContain('[REDACTED_EMAIL]')
    expect(out).toContain('[REDACTED_PHONE]')
    expect(out).toContain('[REDACTED_ADDRESS]')
  })

  it('redacts labeled DOB lines', () => {
    const out = redactLlmPii('DOB: 04/12/1988 and DOB 4-12-1988')
    expect(out).not.toMatch(/04\/12\/1988/)
    expect(out).toContain('[REDACTED_DOB]')
  })

  it('preserves non-contact case facts', () => {
    const raw = 'Rear-end collision on I-5. Liability grade A (92). Carrier State Farm claim SF123456.'
    expect(redactLlmPii(raw)).toBe(raw)
  })
})

describe('sanitizeCaseIntelligenceForLlm', () => {
  it('drops blocked known keys and redacts narrative / values', () => {
    const sanitized = sanitizeCaseIntelligenceForLlm({
      claimType: 'auto',
      narrative: 'Hit at 100 Oak Avenue. Call me at jane@x.com',
      known: [
        { key: 'email', label: 'Email', value: 'jane@x.com' },
        { key: 'defendant', label: 'Defendant', value: 'Acme Trucking — adjuster 555-111-2222' },
        { key: 'venue', label: 'Venue', value: 'Los Angeles, CA' },
      ],
      gaps: [{ label: 'Police report', category: 'evidence', valueImpact: 'high', rationale: 'Email records@pd.gov' }],
    })

    expect(sanitized.known.find((k) => k.key === 'email')).toBeUndefined()
    expect(sanitized.known.find((k) => k.key === 'defendant')?.value).toContain('[REDACTED_PHONE]')
    expect(sanitized.narrative).toContain('[REDACTED_ADDRESS]')
    expect(sanitized.narrative).toContain('[REDACTED_EMAIL]')
    expect(sanitized.gaps[0].rationale).toContain('[REDACTED_EMAIL]')
  })
})

describe('toGapKeysOnlyCaseIntelligence / prepareCaseIntelligenceForLlm', () => {
  const sample = {
    claimType: 'auto',
    narrative: 'Client has cervical herniation after rear-end; ER at Cedars; PT ongoing.',
    known: [
      { key: 'injuries', label: 'Injuries', value: 'Cervical herniation' },
      { key: 'treatment', label: 'Medical treatment', value: 'PT 2x/week' },
      { key: 'venue', label: 'Venue', value: 'Los Angeles, CA' },
      { key: 'evidence', label: 'Evidence on file', value: 'Photos' },
      { key: 'defendant', label: 'Defendant', value: 'Acme Trucking' },
    ],
    gaps: [
      {
        key: 'gap_medical_records',
        label: 'Medical records',
        category: 'medical',
        valueImpact: 'high',
        severity: 5,
        rationale: 'Need MRI and PT notes showing herniation',
        resolved: false,
      },
    ],
  }

  it('strips narrative and clinical known facts; keeps gap keys', () => {
    const out = toGapKeysOnlyCaseIntelligence(sample)
    expect(out.narrative).toBeUndefined()
    expect(out.known.find((k) => k.key === 'injuries')).toBeUndefined()
    expect(out.known.find((k) => k.key === 'treatment')).toBeUndefined()
    expect(out.known.find((k) => k.key === 'venue')?.value).toBe('Los Angeles, CA')
    expect(out.gaps[0].label).toBe('gap_medical_records')
    expect(out.gaps[0].rationale).toBeUndefined()
    expect(out.known.some((k) => k.key === 'flags' && String(k.value).includes('gap_medical_records'))).toBe(true)
  })

  it('prepare defaults to keys_only when LLM_ALLOW_PHI is false', () => {
    ;(ENV as { LLM_ALLOW_PHI: boolean }).LLM_ALLOW_PHI = false
    const { intel, phiMode } = prepareCaseIntelligenceForLlm(sample)
    expect(phiMode).toBe('keys_only')
    expect(intel.narrative).toBeUndefined()
  })

  it('prepare allows redacted medical pack when LLM_ALLOW_PHI is true', () => {
    ;(ENV as { LLM_ALLOW_PHI: boolean }).LLM_ALLOW_PHI = true
    const { intel, phiMode } = prepareCaseIntelligenceForLlm(sample)
    expect(phiMode).toBe('phi_allowed')
    expect(intel.narrative).toContain('cervical herniation')
    expect(intel.known.find((k) => k.key === 'injuries')?.value).toContain('herniation')
    ;(ENV as { LLM_ALLOW_PHI: boolean }).LLM_ALLOW_PHI = false
  })
})

describe('isBlockedKnownFact', () => {
  it('blocks contact labels', () => {
    expect(isBlockedKnownFact('phone', 'Mobile')).toBe(true)
    expect(isBlockedKnownFact('ssn')).toBe(true)
    expect(isBlockedKnownFact('defendant', 'Defendant')).toBe(false)
  })
})

describe('sanitizeLlmMessages', () => {
  it('redacts string message content', () => {
    const out = sanitizeLlmMessages([
      { role: 'user', content: 'Reach me at a@b.co or 123-45-6789' },
    ])
    expect(out[0].content).toContain('[REDACTED_EMAIL]')
    expect(out[0].content).toContain('[REDACTED_SSN]')
  })
})
