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

/**
 * Validates the plaintiff signup form. Pass `t` (the i18n translate function)
 * to get localized messages; callers that omit it get the English defaults.
 */
export function validateRegisterInput(input: RegisterInput, t?: (key: string) => string): RegisterFieldErrors {
  const msg = (key: string, fallback: string) => (t ? t(key) : fallback)
  const errors: RegisterFieldErrors = {}

  if (!input.firstName.trim()) {
    errors.firstName = msg('auth.errFirstNameRequired', 'First name is required')
  }

  // Last name is optional: intake only ever collects a first name, so requiring
  // it here would force users to invent one to finish the streamlined signup.

  const phoneError = validatePhoneField(input.phone)
  if (phoneError) {
    // validatePhoneField returns English strings (it's shared by English-only
    // surfaces); localize with a generic invalid-phone message here.
    errors.phone = msg('auth.errPhoneInvalid', phoneError)
  }

  const email = input.email.trim()
  if (!email) {
    errors.email = msg('auth.errEmailRequired', 'Email is required')
  } else if (!isValidEmail(email)) {
    errors.email = msg('auth.errEmailInvalid', 'Invalid email address')
  }

  if (!input.password) {
    errors.password = msg('auth.errPasswordRequired', 'Password is required')
  } else if (input.password.length < 8) {
    errors.password = msg('auth.errPasswordMin', 'Password must be at least 8 characters')
  }

  return errors
}
