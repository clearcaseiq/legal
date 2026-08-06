import { validatePhoneField } from './phone'
import { isValidEmail } from './email'

const INTAKE_STATUS_OPTIONS = ['accept_immediately', 'pause', 'vacation'] as const
const CONSULTATION_OPTIONS = ['phone', 'zoom', 'in_person'] as const
const PRICING_OPTIONS = ['fixed_price', 'auction', 'both'] as const
const PAYMENT_OPTIONS = ['subscription', 'pay_per_case', 'both'] as const

type InsurancePreference = '' | 'yes' | 'no'

export type AttorneyRegisterFormInput = {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  firmName: string
  firmWebsite: string
  stateBarNumber: string
  stateBarState: string
  specialties: string[]
  secondaryCaseTypes: string[]
  venues: string[]
  preferredCounties: string[]
  preferredCities: string
  excludedCaseTypes: string[]
  minInjurySeverity: string
  minDamagesRange: string
  maxDamagesRange: string
  insuranceRequired: InsurancePreference
  mustHaveMedicalTreatment: InsurancePreference
  requirePoliceReport: boolean
  requireMedicalRecords: boolean
  maxCasesPerWeek: string
  maxCasesPerMonth: string
  intakeStatus: (typeof INTAKE_STATUS_OPTIONS)[number]
  preferredConsultationMethod: '' | (typeof CONSULTATION_OPTIONS)[number]
  pricingModel: '' | (typeof PRICING_OPTIONS)[number]
  paymentModel: '' | (typeof PAYMENT_OPTIONS)[number]
}

export type AttorneyRegisterFieldErrors = Partial<Record<keyof AttorneyRegisterFormInput, string>>

/**
 * Which validated fields each step of the registration wizard is responsible
 * for gating on "Next".
 *
 * This lived inline in AttorneyRegister as an ad-hoc list per step, and phone
 * and firmWebsite were simply left out of step 1: both were validated and both
 * rendered an error under the input, but "Next" advanced regardless, so an
 * invalid phone number wasn't rejected until the final submit five steps later
 * (CP-454). Keeping the mapping here lets a test assert that every field
 * validateAttorneyRegisterInput can reject is gated by some step.
 */
export const ATTORNEY_REGISTER_STEP_FIELDS: Record<number, Array<keyof AttorneyRegisterFormInput>> = {
  1: ['email', 'password', 'firstName', 'lastName', 'firmName', 'phone', 'firmWebsite'],
  2: ['specialties', 'venues', 'preferredCounties'],
  3: ['maxCasesPerWeek', 'maxCasesPerMonth', 'minInjurySeverity', 'minDamagesRange', 'maxDamagesRange'],
}

export type AttorneyRegisterSubmission = {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  firmName: string
  firmWebsite?: string
  stateBarNumber?: string
  stateBarState?: string
  specialties: string[]
  secondaryCaseTypes: string[]
  venues: string[]
  preferredCounties: string[]
  preferredCities?: string
  excludedCaseTypes: string[]
  minInjurySeverity?: number
  minDamagesRange?: number
  maxDamagesRange?: number
  insuranceRequired?: 'yes' | 'no'
  mustHaveMedicalTreatment?: 'yes' | 'no'
  requirePoliceReport?: boolean
  requireMedicalRecords?: boolean
  maxCasesPerWeek?: number
  maxCasesPerMonth?: number
  intakeStatus?: (typeof INTAKE_STATUS_OPTIONS)[number]
  preferredConsultationMethod?: (typeof CONSULTATION_OPTIONS)[number]
  pricingModel?: (typeof PRICING_OPTIONS)[number]
  paymentModel?: (typeof PAYMENT_OPTIONS)[number]
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const ATTORNEY_REGISTER_DEFAULTS: AttorneyRegisterFormInput = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  firmName: '',
  firmWebsite: 'http://',
  stateBarNumber: '',
  stateBarState: '',
  specialties: [],
  secondaryCaseTypes: [],
  venues: [],
  preferredCounties: [],
  preferredCities: '',
  excludedCaseTypes: [],
  minInjurySeverity: '',
  minDamagesRange: '',
  maxDamagesRange: '',
  insuranceRequired: '',
  mustHaveMedicalTreatment: '',
  requirePoliceReport: false,
  requireMedicalRecords: false,
  maxCasesPerWeek: '',
  maxCasesPerMonth: '',
  intakeStatus: 'accept_immediately',
  preferredConsultationMethod: '',
  pricingModel: '',
  paymentModel: '',
}

export function validateAttorneyRegisterInput(
  input: AttorneyRegisterFormInput,
  t?: (key: string) => string
): { fieldErrors: AttorneyRegisterFieldErrors; data?: AttorneyRegisterSubmission } {
  // Localizes a message when a translator is provided; falls back to English so
  // callers that never pass `t` keep their current behavior.
  const msg = (key: string, fallback: string) => {
    if (!t) return fallback
    const translated = t(`attorneyReg.${key}`)
    return translated === `attorneyReg.${key}` ? fallback : translated
  }
  const fieldErrors: AttorneyRegisterFieldErrors = {}

  const email = input.email.trim()
  if (!email) {
    fieldErrors.email = msg('errEmailRequired', 'Email is required.')
  } else if (!isValidEmail(email)) {
    fieldErrors.email = msg('errEmailInvalid', 'Invalid email address.')
  }

  if (!input.password) {
    fieldErrors.password = msg('errPasswordRequired', 'Password is required.')
  } else if (input.password.length < 8) {
    fieldErrors.password = msg('errPasswordMin', 'Password must be at least 8 characters.')
  }

  if (!input.firstName.trim()) {
    fieldErrors.firstName = msg('errFirstNameRequired', 'First name is required.')
  }

  if (!input.lastName.trim()) {
    fieldErrors.lastName = msg('errLastNameRequired', 'Last name is required.')
  }

  if (!input.firmName.trim()) {
    fieldErrors.firmName = msg('errFirmNameRequired', 'Firm name is required.')
  }

  const phoneError = validatePhoneField(input.phone, { required: true })
  if (phoneError) {
    fieldErrors.phone = t ? msg('errPhoneInvalid', phoneError) : phoneError
  }

  const firmWebsite = input.firmWebsite.trim()
  const hasFirmWebsite = firmWebsite && firmWebsite !== 'http://' && firmWebsite !== 'https://'
  if (hasFirmWebsite) {
    try {
      new URL(firmWebsite)
    } catch {
      fieldErrors.firmWebsite = msg('errWebsiteInvalid', 'Enter a valid website URL.')
    }
  }

  if (input.specialties.length === 0) {
    fieldErrors.specialties = msg('errSpecialtiesRequired', 'Select at least one case type.')
  }

  if (input.venues.length === 0) {
    fieldErrors.venues = msg('errVenuesRequired', 'Select at least one state.')
  }

  const minInjurySeverity = parseOptionalNumber(input.minInjurySeverity)
  if (input.minInjurySeverity.trim()) {
    if (minInjurySeverity === undefined || minInjurySeverity < 0 || minInjurySeverity > 4) {
      fieldErrors.minInjurySeverity = msg('errSeverityInvalid', 'Choose a valid injury severity.')
    }
  }

  const minDamagesRange = parseOptionalNumber(input.minDamagesRange)
  if (input.minDamagesRange.trim() && (minDamagesRange === undefined || minDamagesRange < 0)) {
    fieldErrors.minDamagesRange = msg('errMinDamages', 'Minimum damages must be 0 or higher.')
  }

  const maxDamagesRange = parseOptionalNumber(input.maxDamagesRange)
  if (input.maxDamagesRange.trim() && (maxDamagesRange === undefined || maxDamagesRange < 0)) {
    fieldErrors.maxDamagesRange = msg('errMaxDamages', 'Maximum damages must be 0 or higher.')
  }

  const maxCasesPerWeek = parseOptionalNumber(input.maxCasesPerWeek)
  if (input.maxCasesPerWeek.trim() && (maxCasesPerWeek === undefined || maxCasesPerWeek < 0 || !Number.isInteger(maxCasesPerWeek))) {
    fieldErrors.maxCasesPerWeek = msg('errWeeklyCapacity', 'Weekly capacity must be a whole number.')
  }

  const maxCasesPerMonth = parseOptionalNumber(input.maxCasesPerMonth)
  if (
    input.maxCasesPerMonth.trim() &&
    (maxCasesPerMonth === undefined || maxCasesPerMonth < 0 || !Number.isInteger(maxCasesPerMonth))
  ) {
    fieldErrors.maxCasesPerMonth = msg('errMonthlyCapacity', 'Monthly capacity must be a whole number.')
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  return {
    fieldErrors,
    data: {
      email,
      password: input.password,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      firmName: input.firmName.trim(),
      firmWebsite: hasFirmWebsite ? firmWebsite : undefined,
      stateBarNumber: input.stateBarNumber.trim() || undefined,
      stateBarState: input.stateBarState.trim() || undefined,
      specialties: input.specialties,
      secondaryCaseTypes: input.secondaryCaseTypes,
      venues: input.venues,
      preferredCounties: input.preferredCounties,
      preferredCities: input.preferredCities.trim() || undefined,
      excludedCaseTypes: input.excludedCaseTypes,
      minInjurySeverity,
      minDamagesRange,
      maxDamagesRange,
      insuranceRequired: input.insuranceRequired || undefined,
      mustHaveMedicalTreatment: input.mustHaveMedicalTreatment || undefined,
      requirePoliceReport: input.requirePoliceReport || undefined,
      requireMedicalRecords: input.requireMedicalRecords || undefined,
      maxCasesPerWeek,
      maxCasesPerMonth,
      intakeStatus: input.intakeStatus || undefined,
      preferredConsultationMethod: input.preferredConsultationMethod || undefined,
      pricingModel: input.pricingModel || undefined,
      paymentModel: input.paymentModel || undefined,
    },
  }
}
