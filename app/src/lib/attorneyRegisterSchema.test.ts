import { describe, it, expect } from 'vitest'
import { AttorneyRegisterSchema } from './attorneyRegisterSchema'

const base = {
  email: 'amy@firm.test',
  password: 'password123',
  firstName: 'Amy',
  lastName: 'Advocate',
  specialties: ['auto'],
  venues: ['CA'],
}

describe('AttorneyRegisterSchema (web form)', () => {
  it('accepts minimal valid form', () => {
    expect(AttorneyRegisterSchema.safeParse(base).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false)
  })

  it('rejects password under 8 chars', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, password: '1234567' }).success).toBe(false)
  })

  it('rejects empty names', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, firstName: '' }).success).toBe(false)
    expect(AttorneyRegisterSchema.safeParse({ ...base, lastName: '' }).success).toBe(false)
  })

  it('requires at least one specialty and venue', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, specialties: [] }).success).toBe(false)
    expect(AttorneyRegisterSchema.safeParse({ ...base, venues: [] }).success).toBe(false)
  })

  it('accepts optional firmWebsite as URL or empty string', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, firmWebsite: '' }).success).toBe(true)
    expect(AttorneyRegisterSchema.safeParse({ ...base, firmWebsite: 'https://example.com' }).success).toBe(
      true
    )
    expect(AttorneyRegisterSchema.safeParse({ ...base, firmWebsite: 'not-url' }).success).toBe(false)
  })

  it('accepts insurance booleans as yes/no enum', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, insuranceRequired: 'yes' }).success).toBe(true)
    expect(AttorneyRegisterSchema.safeParse({ ...base, mustHaveMedicalTreatment: 'no' }).success).toBe(true)
    expect(AttorneyRegisterSchema.safeParse({ ...base, insuranceRequired: 'maybe' as any }).success).toBe(
      false
    )
  })

  it('coerces maxCasesPerWeek from numeric string', () => {
    const r = AttorneyRegisterSchema.safeParse({ ...base, maxCasesPerWeek: '5' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.maxCasesPerWeek).toBe(5)
  })

  it('accepts undefined when maxCasesPerWeek is empty string', () => {
    const r = AttorneyRegisterSchema.safeParse({ ...base, maxCasesPerWeek: '' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.maxCasesPerWeek).toBeUndefined()
  })

  it('rejects maxCasesPerWeek string that is not an integer', () => {
    const r = AttorneyRegisterSchema.safeParse({ ...base, maxCasesPerWeek: '2.5' })
    expect(r.success).toBe(false)
  })

  it('bounds minInjurySeverity 0–4', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, minInjurySeverity: 0 }).success).toBe(true)
    expect(AttorneyRegisterSchema.safeParse({ ...base, minInjurySeverity: 4 }).success).toBe(true)
    expect(AttorneyRegisterSchema.safeParse({ ...base, minInjurySeverity: 5 }).success).toBe(false)
  })

  it('accepts intake + consultation + pricing enums', () => {
    const r = AttorneyRegisterSchema.safeParse({
      ...base,
      intakeStatus: 'pause',
      preferredConsultationMethod: 'in_person',
      pricingModel: 'both',
      paymentModel: 'both',
    })
    expect(r.success).toBe(true)
  })

  it('treats empty string on optional pricing/payment selects as omitted (HTML selects)', () => {
    const r = AttorneyRegisterSchema.safeParse({
      ...base,
      pricingModel: '',
      paymentModel: '',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.pricingModel).toBeUndefined()
      expect(r.data.paymentModel).toBeUndefined()
    }
  })
})
