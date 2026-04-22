import { describe, it, expect } from 'vitest'
import { AttorneyRegisterSchema } from './routes/attorney-register'

const base = {
  email: 'lawyer@test.local',
  password: 'password123',
  firstName: 'Jane',
  lastName: 'Doe',
  specialties: ['auto'],
  venues: ['CA'],
}

describe('AttorneyRegisterSchema (API)', () => {
  it('parses minimal valid payload', () => {
    const r = AttorneyRegisterSchema.safeParse(base)
    expect(r.success).toBe(true)
  })

  it('rejects bad email', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, email: 'x' }).success).toBe(false)
  })

  it('rejects short password', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, password: 'short' }).success).toBe(false)
  })

  it('rejects empty specialties', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, specialties: [] }).success).toBe(false)
  })

  it('rejects empty venues', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, venues: [] }).success).toBe(false)
  })

  it('accepts firmWebsite URL or empty literal', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, firmWebsite: 'https://firm.com' }).success).toBe(true)
    expect(AttorneyRegisterSchema.safeParse({ ...base, firmWebsite: '' }).success).toBe(true)
    expect(AttorneyRegisterSchema.safeParse({ ...base, firmWebsite: 'oops' }).success).toBe(false)
  })

  it('enforces stateBarState length 2 when set', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, stateBarState: 'CA' }).success).toBe(true)
    expect(AttorneyRegisterSchema.safeParse({ ...base, stateBarState: 'California' }).success).toBe(false)
  })

  it('accepts jurisdictions with optional counties/cities', () => {
    const r = AttorneyRegisterSchema.safeParse({
      ...base,
      jurisdictions: [
        { state: 'CA', counties: ['Los Angeles'] },
        { state: 'TX', cities: ['Houston'] },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('rejects jurisdiction state not length 2', () => {
    expect(
      AttorneyRegisterSchema.safeParse({
        ...base,
        jurisdictions: [{ state: 'CAL', counties: [] }],
      }).success
    ).toBe(false)
  })

  it('accepts intakeHours 24/7 or weekly schedule', () => {
    expect(AttorneyRegisterSchema.safeParse({ ...base, intakeHours: '24/7' }).success).toBe(true)
    expect(
      AttorneyRegisterSchema.safeParse({
        ...base,
        intakeHours: [{ dayOfWeek: 1, startTime: 9, endTime: 17 }],
      }).success
    ).toBe(true)
    expect(
      AttorneyRegisterSchema.safeParse({
        ...base,
        intakeHours: [{ dayOfWeek: 1, startTime: 9, endTime: 25 }],
      }).success
    ).toBe(false)
  })

  it('accepts optional pricing / payment / subscription tier enums', () => {
    const r = AttorneyRegisterSchema.safeParse({
      ...base,
      pricingModel: 'auction',
      paymentModel: 'pay_per_case',
      subscriptionTier: 'enterprise',
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid subscriptionTier', () => {
    expect(
      AttorneyRegisterSchema.safeParse({ ...base, subscriptionTier: 'gold' as any }).success
    ).toBe(false)
  })
})
