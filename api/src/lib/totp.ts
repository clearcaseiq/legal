/**
 * RFC 6238 TOTP (SHA-1, 6 digits, 30-second steps) — the parameters every
 * authenticator app (Google Authenticator, 1Password, Authy, Microsoft
 * Authenticator) assumes when an otpauth:// URI does not override them.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export const TOTP_STEP_SECONDS = 30
export const TOTP_DIGITS = 6

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error('Invalid base32 character')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** 160-bit secret, the size RFC 4226 recommends for HMAC-SHA1. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

export function totpStep(atMs: number = Date.now()): number {
  return Math.floor(atMs / 1000 / TOTP_STEP_SECONDS)
}

export function hotp(secret: Buffer, counter: number, digits: number = TOTP_DIGITS): string {
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', secret).update(message).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3]
  return String(binary % 10 ** digits).padStart(digits, '0')
}

export function totpAt(base32Secret: string, step: number, digits: number = TOTP_DIGITS): string {
  return hotp(base32Decode(base32Secret), step, digits)
}

/**
 * The time step a code matches, or null. Accepts one step either side of now
 * to absorb clock drift between the server and the phone.
 */
export function matchTotpStep(base32Secret: string, code: string, atMs: number = Date.now()): number | null {
  const normalized = code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(normalized)) return null
  const current = totpStep(atMs)
  for (const step of [current - 1, current, current + 1]) {
    const expected = Buffer.from(totpAt(base32Secret, step))
    if (timingSafeEqual(expected, Buffer.from(normalized))) return step
  }
  return null
}

export function otpauthUri(params: { secret: string; accountName: string; issuer: string }): string {
  const label = encodeURIComponent(`${params.issuer}:${params.accountName}`)
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${query.toString()}`
}
