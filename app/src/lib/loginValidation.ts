import { isValidEmail } from './email'

export type LoginInput = {
  email: string
  password: string
}

export type LoginFieldErrors = Partial<Record<keyof LoginInput, string>>

export function validateLoginInput(input: LoginInput): LoginFieldErrors {
  const errors: LoginFieldErrors = {}

  const email = input.email.trim()
  if (!email) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!input.password) {
    errors.password = 'Password is required'
  }

  return errors
}
