import { z } from 'zod'

// Canonical phone-number validation/normalization shared across the API.
//
// Rules:
//  - US/NANP numbers are the primary case (10 digits, or 11 digits with a
//    leading country code "1"). The area code must start with a digit 2-9
//    (NANP area codes never start with 0 or 1). We intentionally do NOT enforce
//    the stricter exchange rule, so common placeholder/test numbers such as
//    "(555) 123-4567" and legitimate inputs aren't rejected on a technicality.
//  - International numbers are accepted only when written in E.164 form with a
//    leading "+" and 8-15 digits, to avoid misreading partial US numbers.
//  - Valid numbers are normalized to E.164 (e.g. "+14155550100").

const NANP_TEN = /^[2-9]\d{9}$/

export const PHONE_ERROR_MESSAGE = 'Enter a valid phone number (e.g. (555) 555-0100)'

export interface ParsedPhone {
  valid: boolean
  /** E.164 form, e.g. "+14155550100" (only when valid). */
  e164?: string
  /** Human-friendly national form, e.g. "(415) 555-0100" (only when valid). */
  national?: string
  /** Digits only, no "+". */
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

  // US: bare 10-digit number.
  if (digits.length === 10 && NANP_TEN.test(digits)) return usResult(digits)
  // US: 11-digit number with leading country code "1".
  if (digits.length === 11 && digits.startsWith('1') && NANP_TEN.test(digits.slice(1))) {
    return usResult(digits.slice(1))
  }
  // International: must be explicit E.164 with a leading "+".
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

// Optional phone field: missing/empty is allowed; when present it must be a
// valid phone number and is normalized to E.164.
export const optionalPhone = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .string()
    .refine((v) => v === '' || isValidPhone(v), { message: PHONE_ERROR_MESSAGE })
    .transform((v) => (v === '' ? undefined : normalizePhone(v)))
    .optional()
)

// Required phone field: must be present and valid; normalized to E.164.
export const requiredPhone = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .string({ required_error: 'Phone number is required' })
    .min(1, 'Phone number is required')
    .refine(isValidPhone, { message: PHONE_ERROR_MESSAGE })
    .transform((v) => normalizePhone(v) as string)
)
