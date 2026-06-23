/**
 * Symmetric encryption for CMS OAuth/PAT tokens stored at rest.
 *
 * Uses AES-256-GCM with a key derived from `CMS_TOKEN_ENCRYPTION_KEY`
 * (falling back to `JWT_SECRET` so the platform still works out of the box in
 * development). Ciphertext is serialized as `enc:v1:<ivHex>:<tagHex>:<dataHex>`
 * so we can detect — and transparently pass through — any legacy plaintext
 * values that predate encryption.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { ENV } from '../../env'
import { logger } from '../logger'

const PREFIX = 'enc:v1:'
const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.CMS_TOKEN_ENCRYPTION_KEY || ENV.JWT_SECRET
  // Normalize any-length secret to a 32-byte key.
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null
  try {
    const iv = randomBytes(12)
    const cipher = createCipheriv(ALGO, getKey(), iv)
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${data.toString('hex')}`
  } catch (error) {
    logger.error('Failed to encrypt CMS secret', { error })
    throw new Error('Encryption failed')
  }
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  if (!value.startsWith(PREFIX)) {
    // Legacy plaintext (e.g. written before encryption was added).
    return value
  }
  try {
    const [ivHex, tagHex, dataHex] = value.slice(PREFIX.length).split(':')
    const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    const out = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
    return out.toString('utf8')
  } catch (error) {
    logger.error('Failed to decrypt CMS secret', { error })
    return null
  }
}
