import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./llm-client', () => ({ getLlmChatClient: () => null, LLM_CHAT_MODEL: 'test' }))

import { DEFAULT_DEMAND_RECIPIENT, buildDemandExhibits, demandRecipientFor, exhibitSectionForFile } from './demand-drafting'

describe('exhibitSectionForFile', () => {
  it('maps claimant evidence to the section that cites it', () => {
    expect(exhibitSectionForFile({ category: 'police_report' })).toBe('liability')
    expect(exhibitSectionForFile({ category: 'medical_records' })).toBe('treatment')
    expect(exhibitSectionForFile({ category: 'bills' })).toBe('bills')
    expect(exhibitSectionForFile({ category: 'wage_verification' })).toBe('wages')
    expect(exhibitSectionForFile({ category: 'photos', subcategory: 'injury_photos' })).toBe('injuries')
    expect(exhibitSectionForFile({ category: 'photos', subcategory: 'vehicle_damage' })).toBe('damages')
  })

  it('never encloses insurance correspondence or unsorted files', () => {
    expect(exhibitSectionForFile({ category: 'dec_page' })).toBeNull()
    expect(exhibitSectionForFile({ category: 'insurance_letters' })).toBeNull()
    expect(exhibitSectionForFile({ category: 'other' })).toBeNull()
    expect(exhibitSectionForFile({ category: 'other', subcategory: 'custom:Gym log' })).toBe('other')
  })
})

describe('buildDemandExhibits', () => {
  it('numbers files in letter order and skips identity mismatches', () => {
    const exhibits = buildDemandExhibits([
      { category: 'bills', originalName: 'bill.pdf', createdAt: '2026-04-01' },
      { category: 'police_report', originalName: 'report.pdf', createdAt: '2026-05-01' },
      {
        category: 'medical_records',
        originalName: 'someone-else.pdf',
        identityCheck: JSON.stringify({ verdict: 'mismatch' }),
      },
      { category: 'other', subcategory: 'custom:Gym log', originalName: 'gym.pdf' },
    ])
    expect(exhibits).toEqual([
      { number: 1, section: 'liability', label: 'Police / incident report (report.pdf)' },
      { number: 2, section: 'bills', label: 'Medical bill (bill.pdf)' },
      { number: 3, section: 'other', label: 'Gym log (gym.pdf)' },
    ])
  })
})

describe('demandRecipientFor', () => {
  const claim = { carrierName: 'State Farm', adjusterName: 'Ann Adjuster', adjusterEmail: 'ann@sf.com' }

  it('addresses the adjuster when no recipient was chosen', () => {
    expect(demandRecipientFor(undefined, claim)).toEqual({ name: 'Ann Adjuster', address: 'State Farm', email: 'ann@sf.com' })
    expect(demandRecipientFor(DEFAULT_DEMAND_RECIPIENT, claim).name).toBe('Ann Adjuster')
  })

  it('falls back to the claims department without an adjuster', () => {
    expect(demandRecipientFor(undefined, { carrierName: 'Geico' }).name).toBe('Geico Claims Department')
  })

  it('keeps a recipient the attorney typed', () => {
    const typed = { name: 'Jo Supervisor', address: '1 Main St' }
    expect(demandRecipientFor(typed, claim)).toBe(typed)
  })
})
