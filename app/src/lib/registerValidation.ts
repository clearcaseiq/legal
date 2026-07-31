import { validatePhoneField } from './phone'
import { isValidEmail } from './email'

export type RegisterInput = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
}

export type RegisterFieldErrors = Partial<Record<keyof RegisterInput, string>>

export function validateRegisterInput(input: RegisterInput): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {}

  if (!input.firstName.trim()) {
    errors.firstName = 'First name is required'
  }

  // Last name is optional: intake only ever collects a first name, so requiring
  // it here would force users to invent one to finish the streamlined signup.

  const phoneError = validatePhoneField(input.phone)
  if (phoneError) {
    errors.phone = phoneError
  }

  const email = input.email.trim()
  if (!email) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(email)) {
    errors.email = 'Invalid email address'
  }

  if (!input.password) {
    errors.password = 'Password is required'
  } else if (input.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  return errors
}
