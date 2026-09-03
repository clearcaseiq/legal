import { describe, expect, it } from 'vitest'
import { checkUplBoundary } from './upl-guard'

/** Convenience: the categories flagged for a piece of text. */
function categories(text: string): string[] {
  const result = checkUplBoundary(text)
  return result.ok ? [] : result.violations.map((v) => v.category)
}

describe('checkUplBoundary blocks legal advice', () => {
  it('blocks an opinion on whether the claim is any good', () => {
    expect(categories('Honestly you have a strong case here.')).toContain('case_merit')
    expect(categories('I think this is a pretty weak claim, to be blunt.')).toContain('case_merit')
    expect(categories('You will definitely win this one.')).toContain('case_merit')
  })

  it('blocks putting a number on the case', () => {
    expect(categories('Your case is worth somewhere around $80,000.')).toContain('valuation')
    expect(categories('You should expect about $40,000 once this wraps up.')).toContain('valuation')
    expect(categories('I would settle for $25,000 if they offer it.')).toContain('valuation')
  })

  it('blocks telling the claimant what to do', () => {
    expect(categories('My advice is to get the police report first.')).toContain('legal_recommendation')
    expect(categories('You should sue the trucking company directly.')).toContain('legal_recommendation')
    expect(categories("Don't talk to the adjuster if they call you.")).toContain('legal_recommendation')
    expect(categories('You are entitled to lost wages for the whole period.')).toContain('legal_recommendation')
  })

  it('blocks implying a lawyer-client relationship the specialist does not have', () => {
    expect(categories('As your attorney I need the medical records.')).toContain('attorney_relationship')
    expect(categories('This is covered by attorney-client privilege.')).toContain('attorney_relationship')
  })

  it('blocks deciding who was at fault', () => {
    expect(categories('The other driver was clearly at fault here.')).toContain('liability_opinion')
    expect(categories('The employer is liable for what happened.')).toContain('liability_opinion')
    expect(categories('It was not your fault at all.')).toContain('liability_opinion')
  })

  it('blocks advising on an offer in hand', () => {
    expect(categories("Don't accept their first offer.")).toContain('settlement_advice')
    expect(categories('That offer is too low for injuries like yours.')).toContain('settlement_advice')
  })

  it('checks the subject line too, not only the body', () => {
    const result = checkUplBoundary('You have a strong case', 'Please send the police report when you can.')
    expect(result.ok).toBe(false)
  })

  it('returns the matched phrase so the specialist can see what to rewrite', () => {
    const result = checkUplBoundary('Your case is worth about $80,000, I would guess.')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.violations[0].matched.toLowerCase()).toContain('worth')
    expect(result.violations[0].guidance).toBeTruthy()
  })

  it('reports one violation per category, not one per phrasing', () => {
    // Three restatements of the same overreach is one thing to fix. A list of
    // near-identical complaints is noise a specialist learns to dismiss.
    const result = checkUplBoundary(
      'You have a strong case. You will win this. Your case has a good chance.',
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.violations.filter((v) => v.category === 'case_merit')).toHaveLength(1)
  })
})

describe('checkUplBoundary allows the specialist to do their job', () => {
  it('allows asking for information, which is the entire role', () => {
    for (const text of [
      'Could you send me the claim number from your insurance card?',
      'I still need the date you first saw a doctor. Do you have that handy?',
      'Your medical charges are listed as $12,400. Does that match your records?',
      'I have you down as treating at Valley Orthopedics. Is that right?',
      'Can you upload the police report when you get a chance?',
    ]) {
      expect(checkUplBoundary(text).ok, text).toBe(true)
    }
  })

  it('allows routing a legal question to the attorney, the compliant response', () => {
    for (const text of [
      "That's a legal question, so I'll flag it for the attorney on your case.",
      'I am not able to advise on that. I will pass it to your attorney to answer.',
      'The attorney will discuss what your case may be worth once records are in.',
      'I will ask the attorney whether you should respond to the adjuster.',
    ]) {
      expect(checkUplBoundary(text).ok, text).toBe(true)
    }
  })

  it('allows recording what the claimant said without endorsing it', () => {
    // The distinction the guard has to preserve: taking down an account is the
    // job; agreeing with its legal conclusion is not.
    for (const text of [
      'You mentioned the other driver ran the red light. I noted that.',
      'You told me you were not at fault. I have recorded your account.',
      'I noted that you believe the employer was responsible.',
    ]) {
      expect(checkUplBoundary(text).ok, text).toBe(true)
    }
  })

  it('allows empty and whitespace input rather than flagging it', () => {
    expect(checkUplBoundary('').ok).toBe(true)
    expect(checkUplBoundary('   ').ok).toBe(true)
    expect(checkUplBoundary(null, undefined).ok).toBe(true)
  })
})
