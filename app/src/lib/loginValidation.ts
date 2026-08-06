import { isValidEmail } from './email'

export type LoginInput = {
  email: string
  password: string
}

export type LoginFieldErrors = Partial<Record<keyof LoginInput, string>>

/**
 * Validates the login form. Pass `t` (the i18n translate function) to get
 * localized messages; callers that omit it (attorney/staff/admin logins, which
 * are English-only surfaces) get the English defaults.
 */
export function validateLoginInput(input: LoginInput, t?: (key: string) => string): LoginFieldErrors {
  const msg = (key: string, fallback: string) => (t ? t(key) : fallback)
  const errors: LoginFieldErrors = {}

  const email = input.email.trim()
  if (!email) {
    errors.email = msg('auth.errEmailRequired', 'Email is required.')
  } else if (!isValidEmail(email)) {
    errors.email = msg('auth.errEmailInvalid', 'Please enter a valid email address.')
  }

  if (!input.password) {
    errors.password = msg('auth.errPasswordRequired', 'Password is required.')
  }

  return errors
}
