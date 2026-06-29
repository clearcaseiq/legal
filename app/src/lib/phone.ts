// Shared phone-number validation/formatting for the web app.
//
// Mirrors the API rules (api/src/lib/phone.ts):
//  - US/NANP numbers: 10 digits, or 11 digits with a leading "1" country code,
//    where the area code starts with 2-9 (NANP area codes never start 0/1).
//    The stricter exchange rule is intentionally not enforced so placeholder/
//    test numbers like "(555) 123-4567" aren't rejected.
//  - International numbers: explicit E.164 with a leading "+" and 8-15 digits.

const NANP_TEN = /^[2-9]\d{9}$/

export const PHONE_ERROR_MESSAGE = 'Enter a valid phone number (e.g. (555) 555-0100).'

export interface ParsedPhone {
  valid: boolean
  e164?: string
  national?: string
  digits: string
}

function usResult(ten: string): ParsedPhone {
  return {
    valid: true,
    e164: `+1${ten}`,
    national: `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`,
    digits: ten,
  }
}

export function parsePhone(input: string | null | undefined): ParsedPhone {
  const raw = String(input ?? '').trim()
  if (!raw) return { valid: false, digits: '' }

  const hasPlus = raw.startsWith('+')
  const digits = raw.replace(/\D/g, '')
  if (!digits) return { valid: false, digits: '' }

  if (digits.length === 10 && NANP_TEN.test(digits)) return usResult(digits)
  if (digits.length === 11 && digits.startsWith('1') && NANP_TEN.test(digits.slice(1))) {
    return usResult(digits.slice(1))
  }
  if (hasPlus && digits.length >= 8 && digits.length <= 15) {
    return { valid: true, e164: `+${digits}`, national: `+${digits}`, digits }
  }
  return { valid: false, digits }
}

export function isValidPhone(input: string | null | undefined): boolean {
  return parsePhone(input).valid
}

/** Returns the E.164 form when valid, otherwise undefined. */
export function normalizePhone(input: string | null | undefined): string | undefined {
  const parsed = parsePhone(input)
  return parsed.valid ? parsed.e164 : undefined
}

/**
 * Returns a validation error message, or undefined when the value is acceptable.
 * Empty values pass unless `required` is set.
 */
export function validatePhoneField(
  value: string | null | undefined,
  opts: { required?: boolean } = {}
): string | undefined {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return opts.required ? 'Phone number is required.' : undefined
  return isValidPhone(trimmed) ? undefined : PHONE_ERROR_MESSAGE
}

/**
 * Progressive formatting for a text input as the user types. US numbers become
 * "(123) 456-7890"; explicit international entries (leading "+") are preserved.
 */
export function formatPhoneInput(value: string): string {
  if (!value) return ''
  if (value.trim().startsWith('+')) return value.replace(/[^\d+\s()-]/g, '')

  let digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
  digits = digits.slice(0, 10)

  const len = digits.length
  if (len === 0) return ''
  if (len < 4) return `(${digits}`
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}
