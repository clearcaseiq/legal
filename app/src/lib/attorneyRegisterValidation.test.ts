import { describe, it, expect } from 'vitest'
import {
  ATTORNEY_REGISTER_DEFAULTS,
  ATTORNEY_REGISTER_STEP_FIELDS,
  validateAttorneyRegisterInput,
  type AttorneyRegisterFormInput,
} from './attorneyRegisterValidation'

/** A form that passes validation, so each test can break exactly one field. */
function validForm(overrides: Partial<AttorneyRegisterFormInput> = {}): AttorneyRegisterFormInput {
  return {
    ...ATTORNEY_REGISTER_DEFAULTS,
    email: 'attorney@example.com',
    password: 'correct-horse',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phone: '(555) 555-0100',
    specialties: ['vehicle'],
    venues: ['CA'],
    ...overrides,
  }
}

describe('validateAttorneyRegisterInput', () => {
  it('accepts a complete form', () => {
    const { fieldErrors, data } = validateAttorneyRegisterInput(validForm())
    expect(fieldErrors).toEqual({})
    expect(data?.email).toBe('attorney@example.com')
  })

  it('rejects a phone number that is not dialable', () => {
    expect(validateAttorneyRegisterInput(validForm({ phone: '123' })).fieldErrors.phone).toBeTruthy()
    expect(validateAttorneyRegisterInput(validForm({ phone: '(111) 555-0100' })).fieldErrors.phone).toBeTruthy()
  })

  it('treats a blank phone as optional', () => {
    expect(validateAttorneyRegisterInput(validForm({ phone: '' })).fieldErrors.phone).toBeUndefined()
  })

  it('ignores the bare http:// placeholder in the website field', () => {
    expect(validateAttorneyRegisterInput(validForm({ firmWebsite: 'http://' })).fieldErrors.firmWebsite).toBeUndefined()
    expect(validateAttorneyRegisterInput(validForm({ firmWebsite: 'not a url' })).fieldErrors.firmWebsite).toBeTruthy()
  })
})

describe('ATTORNEY_REGISTER_STEP_FIELDS', () => {
  // The bug behind CP-454: phone was validated and its error was rendered, but
  // no step claimed it, so "Next" advanced past an invalid number and it was
  // only caught at the final submit. Any field that can produce an error has to
  // be gated somewhere, or the same thing happens again silently.
  it('gates every field validation can reject', () => {
    const brokenEverything: AttorneyRegisterFormInput = {
      ...ATTORNEY_REGISTER_DEFAULTS,
      email: 'nope',
      password: 'short',
      firstName: '',
      lastName: '',
      phone: '123',
      firmWebsite: 'not a url',
      specialties: [],
      venues: [],
      minInjurySeverity: '99',
      minDamagesRange: '-1',
      maxDamagesRange: '-1',
      maxCasesPerWeek: '1.5',
      maxCasesPerMonth: '1.5',
    }

    const rejectable = Object.keys(validateAttorneyRegisterInput(brokenEverything).fieldErrors)
    const gated = new Set(Object.values(ATTORNEY_REGISTER_STEP_FIELDS).flat())

    expect(rejectable.length).toBeGreaterThan(0)
    for (const field of rejectable) {
      expect(gated.has(field as keyof AttorneyRegisterFormInput), `${field} is validated but no step blocks on it`).toBe(true)
    }
  })

  it('assigns each field to a single step', () => {
    const all = Object.values(ATTORNEY_REGISTER_STEP_FIELDS).flat()
    expect(new Set(all).size).toBe(all.length)
  })
})
