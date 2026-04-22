import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercentage,
  formatDate,
  getStatusColor,
  AssessmentWriteSchema,
  RegisterSchema,
  LoginSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
} from './schemas'

describe('formatCurrency', () => {
  it('formats USD with no cents', () => {
    expect(formatCurrency(1234)).toBe('$1,234')
    expect(formatCurrency(0)).toBe('$0')
  })
})

describe('formatPercentage', () => {
  it('multiplies by 100 and appends percent', () => {
    expect(formatPercentage(0.42)).toBe('42%')
    expect(formatPercentage(1)).toBe('100%')
  })
})

describe('formatDate', () => {
  it('formats ISO date in en-US long form', () => {
    // Use noon UTC so calendar day is stable in US time zones (date-only strings parse as UTC midnight).
    const s = formatDate('2026-03-15T12:00:00Z')
    expect(s).toMatch(/March/)
    expect(s).toMatch(/15/)
    expect(s).toMatch(/2026/)
  })
})

describe('getStatusColor', () => {
  it('maps known statuses to tailwind classes', () => {
    expect(getStatusColor('draft')).toContain('gray')
    expect(getStatusColor('COMPLETED')).toContain('green')
    expect(getStatusColor('critical')).toContain('red')
  })

  it('defaults unknown status to gray', () => {
    expect(getStatusColor('unknown')).toBe('text-gray-600 bg-gray-100')
  })
})

describe('AssessmentWriteSchema', () => {
  it('accepts minimal valid assessment payload', () => {
    const parsed = AssessmentWriteSchema.safeParse({
      claimType: 'auto',
      venue: { state: 'CA', county: 'Los Angeles' },
      incident: { date: '2026-01-01', narrative: 'Long enough narrative here.' },
      injuries: [{ description: 'back pain' }],
      damages: {},
      consents: { tos: true, privacy: true, ml_use: true },
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects short narrative', () => {
    const parsed = AssessmentWriteSchema.safeParse({
      claimType: 'auto',
      venue: { state: 'CA', county: 'Los Angeles' },
      incident: { date: '2026-01-01', narrative: 'short' },
      injuries: [{ description: 'x' }],
      consents: { tos: true, privacy: true, ml_use: true },
    })
    expect(parsed.success).toBe(false)
  })
})

describe('RegisterSchema', () => {
  const valid = {
    email: 'a@b.com',
    password: 'password1',
    firstName: 'A',
    lastName: 'B',
  }

  it('accepts valid registration', () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts optional phone', () => {
    expect(RegisterSchema.safeParse({ ...valid, phone: '555-0100' }).success).toBe(true)
    expect(RegisterSchema.safeParse({ ...valid, phone: undefined }).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(RegisterSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects password under 8 characters', () => {
    expect(RegisterSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false)
  })

  it('rejects empty first or last name', () => {
    expect(RegisterSchema.safeParse({ ...valid, firstName: '' }).success).toBe(false)
    expect(RegisterSchema.safeParse({ ...valid, lastName: '' }).success).toBe(false)
  })

  it('matches API UserRegister shape for typical plaintiff signup', () => {
    const payload = {
      email: 'plaintiff@example.com',
      password: 'password123',
      firstName: 'Pat',
      lastName: 'Lee',
      phone: '+15555550199',
    }
    expect(RegisterSchema.safeParse(payload).success).toBe(true)
  })
})

describe('LoginSchema', () => {
  it('accepts valid login', () => {
    expect(LoginSchema.safeParse({ email: 'x@y.com', password: 'x' }).success).toBe(true)
  })
})

describe('UpdateProfileSchema', () => {
  it('accepts name fields', () => {
    expect(UpdateProfileSchema.safeParse({ firstName: 'A', lastName: 'B' }).success).toBe(true)
  })

  it('rejects empty first name', () => {
    expect(UpdateProfileSchema.safeParse({ firstName: '', lastName: 'B' }).success).toBe(false)
  })
})

describe('ChangePasswordSchema', () => {
  it('accepts matching passwords', () => {
    const r = ChangePasswordSchema.safeParse({
      currentPassword: 'oldoldold',
      newPassword: 'newnewnew',
      confirmPassword: 'newnewnew',
    })
    expect(r.success).toBe(true)
  })

  it('rejects mismatched confirmation', () => {
    const r = ChangePasswordSchema.safeParse({
      currentPassword: 'oldoldold',
      newPassword: 'newnewnew',
      confirmPassword: 'other',
    })
    expect(r.success).toBe(false)
  })
})
