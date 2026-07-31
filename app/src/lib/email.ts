/**
 * Shared email-format check.
 *
 * Deliberately permissive - one @, no spaces, a dot in the domain. It exists to
 * catch a typo before a request is sent, not to decide deliverability, and the
 * API validates properly on the other side.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string | null | undefined): boolean {
  return EMAIL_PATTERN.test(String(value ?? '').trim())
}
