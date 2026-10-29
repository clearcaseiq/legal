import { describe, expect, it } from 'vitest'
import { createLlmDeidentifier, deidentifyForLlm, restoreLlmAnswer } from './llm-deidentify'

const RECORD = [
  'Patient: Maria Lopez   DOB: 04/12/1958   MRN: 00482913',
  'Seen 03/14/2026 at Cedars clinic, 1200 Wilshire Blvd, Los Angeles, CA 90017.',
  'Ms. Lopez reports neck pain since the collision on March 1, 2026. Follow-up 2026-04-28.',
  'Claim number CLM-2026-88812. Call (310) 555-0142 or maria.lopez@example.com.',
  'Venue: Los Angeles County. Her father, aged 93, drove her home.',
].join('\n')

describe('createLlmDeidentifier', () => {
  const subject = { names: ['Maria Lopez'], places: ['Los Angeles'] }

  it('removes every Safe Harbor identifier but keeps the clinical content', () => {
    const masked = deidentifyForLlm(RECORD, subject)
    for (const leak of ['Maria', 'Lopez', '04/12/1958', '00482913', '03/14/2026', '1200 Wilshire', 'Los Angeles', '90017', 'March 1', '2026-04-28', 'CLM-2026-88812', '555-0142', 'example.com', '93']) {
      expect(masked).not.toContain(leak)
    }
    expect(masked).toContain('neck pain')
    expect(masked).toContain('collision')
    expect(masked).toContain('Cedars clinic')
    expect(masked).toContain('aged 90+')
  })

  it('keeps the year and the day offset so intervals survive', () => {
    const masked = deidentifyForLlm('Injured 2026-03-01. MRI 03/15/2026. Surgery May 1, 2026.')
    expect(masked).toContain('[DATE#1 2026 +0d]')
    expect(masked).toContain('[DATE#2 2026 +14d]')
    expect(masked).toContain('[DATE#3 2026 +61d]')
  })

  it('never measures offsets from a birth date, and drops a year that reveals age over 89', () => {
    const masked = deidentifyForLlm('DOB: 04/12/1958. Seen 03/14/2026 and 03/20/2026. Mother born 1/2/1930.')
    expect(masked).toContain('DOB: [DATE#1 1958]')
    expect(masked).toContain('[DATE#2 2026 +0d]')
    expect(masked).toContain('[DATE#3 2026 +6d]')
    expect(masked).toContain('born [DATE#4]')
  })

  it('catches account numbers, street names and greetings', () => {
    const masked = deidentifyForLlm('Acct #: 7781-22. Crash on Pico Blvd. Thanks, Raj')
    expect(masked).toBe('Acct [ID#1]. Crash on [PLACE#1 street]. Thanks, [NAME#1]')
  })

  it('gives the same date one placeholder however it is written', () => {
    const masked = deidentifyForLlm('Seen 03/14/2026; the note dated March 14, 2026 and 2026-03-14 agree.')
    expect(masked.match(/\[DATE#1[^\]]*\]/g)).toHaveLength(3)
    expect(masked).not.toContain('DATE#2')
  })

  it('ties first and last names to the full name without touching ordinary words', () => {
    const masked = deidentifyForLlm('Will Grant said Grant will call. Will agreed.', { names: ['Will Grant'] })
    expect(masked).toBe('[NAME#1] said [NAME#1 last] will call. [NAME#1 first] agreed.')
  })

  it('restores originals in the answer, including inside JSON', () => {
    const deid = createLlmDeidentifier(subject, [RECORD])
    const masked = deid.mask(RECORD)
    const name = masked.match(/\[NAME#1[^\]]*\]/)![0]
    const date = masked.match(/\[DATE#\d+[^\]]*\]/)![0]
    const answer = JSON.stringify({ summary: `${name} was seen on ${date}.` })
    const restored = JSON.parse(restoreLlmAnswer(deid, answer))
    expect(restored.summary).toMatch(/^Maria Lopez was seen on \S+\.$/)
    expect(restored.summary).not.toContain('[')
  })

  it('restores a placeholder the model shortened', () => {
    const deid = createLlmDeidentifier({ names: ['Maria Lopez'] }, [])
    deid.mask('Maria Lopez')
    expect(deid.restore('Client [NAME#1] agreed.')).toBe('Client Maria Lopez agreed.')
  })

  it('leaves dollar amounts, plain numbers and states alone', () => {
    const text = 'Billed $18,450 over 12 visits; policy limit $100,000 in CA.'
    expect(deidentifyForLlm(text)).toBe(text)
  })
})
