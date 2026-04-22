const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export type AttorneyRegisterSubmission = {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  firmName?: string
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
  firmWebsite: '',
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
  input: AttorneyRegisterFormInput
): { fieldErrors: AttorneyRegisterFieldErrors; data?: AttorneyRegisterSubmission } {
  const fieldErrors: AttorneyRegisterFieldErrors = {}

  const email = input.email.trim()
  if (!email) {
    fieldErrors.email = 'Email is required'
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'Invalid email address'
  }

  if (!input.password) {
    fieldErrors.password = 'Password is required'
  } else if (input.password.length < 8) {
    fieldErrors.password = 'Password must be at least 8 characters'
  }

  if (!input.firstName.trim()) {
    fieldErrors.firstName = 'First name is required'
  }

  if (!input.lastName.trim()) {
    fieldErrors.lastName = 'Last name is required'
  }

  if (input.firmWebsite.trim()) {
    try {
      new URL(input.firmWebsite.trim())
    } catch {
      fieldErrors.firmWebsite = 'Enter a valid website URL'
    }
  }

  if (input.specialties.length === 0) {
    fieldErrors.specialties = 'Select at least one case type'
  }

  if (input.venues.length === 0) {
    fieldErrors.venues = 'Select at least one state'
  }

  const minInjurySeverity = parseOptionalNumber(input.minInjurySeverity)
  if (input.minInjurySeverity.trim()) {
    if (minInjurySeverity === undefined || minInjurySeverity < 0 || minInjurySeverity > 4) {
      fieldErrors.minInjurySeverity = 'Choose a valid injury severity'
    }
  }

  const minDamagesRange = parseOptionalNumber(input.minDamagesRange)
  if (input.minDamagesRange.trim() && (minDamagesRange === undefined || minDamagesRange < 0)) {
    fieldErrors.minDamagesRange = 'Minimum damages must be 0 or higher'
  }

  const maxDamagesRange = parseOptionalNumber(input.maxDamagesRange)
  if (input.maxDamagesRange.trim() && (maxDamagesRange === undefined || maxDamagesRange < 0)) {
    fieldErrors.maxDamagesRange = 'Maximum damages must be 0 or higher'
  }

  const maxCasesPerWeek = parseOptionalNumber(input.maxCasesPerWeek)
  if (input.maxCasesPerWeek.trim() && (maxCasesPerWeek === undefined || maxCasesPerWeek < 0 || !Number.isInteger(maxCasesPerWeek))) {
    fieldErrors.maxCasesPerWeek = 'Weekly capacity must be a whole number'
  }

  const maxCasesPerMonth = parseOptionalNumber(input.maxCasesPerMonth)
  if (
    input.maxCasesPerMonth.trim() &&
    (maxCasesPerMonth === undefined || maxCasesPerMonth < 0 || !Number.isInteger(maxCasesPerMonth))
  ) {
    fieldErrors.maxCasesPerMonth = 'Monthly capacity must be a whole number'
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
      phone: input.phone.trim() || undefined,
      firmName: input.firmName.trim() || undefined,
      firmWebsite: input.firmWebsite.trim() || undefined,
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
