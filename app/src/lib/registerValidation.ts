export type RegisterInput = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
}

export type RegisterFieldErrors = Partial<Record<keyof RegisterInput, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRegisterInput(input: RegisterInput): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {}

  if (!input.firstName.trim()) {
    errors.firstName = 'First name is required'
  }

  if (!input.lastName.trim()) {
    errors.lastName = 'Last name is required'
  }

  const email = input.email.trim()
  if (!email) {
    errors.email = 'Email is required'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Invalid email address'
  }

  if (!input.password) {
    errors.password = 'Password is required'
  } else if (input.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  return errors
}
