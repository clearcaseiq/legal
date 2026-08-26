/**
 * Signature verification for the two inbound-SMS webhooks.
 *
 * Both endpoints act on the sender's phone number alone: replying "ACCEPT" to a
 * routing offer claims the case and hands the sender a claimant's contact
 * details and file. Until these checks existed, the sender was simply a field in
 * a request body, so anyone who knew an attorney's published number could POST
 * to the webhook and take that attorney's cases. The signature is what makes the
 * phone number evidence of anything.
 *
 * Both verifiers fail closed. A missing or unreadable credential rejects every
 * request rather than accepting every request — the opposite default is how this
 * was exploitable in the first place.
 */
import crypto from 'crypto'
import https from 'https'

export type WebhookVerification = { ok: true } | { ok: false; reason: string }

/** Reject anything older than this to bound replay of a captured message. */
const MAX_MESSAGE_AGE_MS = 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Twilio
// ---------------------------------------------------------------------------

/**
 * Twilio signs the exact URL it requested, so a proxy that rewrites scheme or
 * host will invalidate an otherwise-good signature. Nginx sets X-Forwarded-Proto
 * and Express honours it via `trust proxy`, but a deployment that terminates TLS
 * somewhere unexpected can still disagree — hence the explicit override.
 */
export function buildTwilioRequestUrl(req: {
  protocol: string
  originalUrl: string
  get(name: string): string | undefined
}): string {
  const override = process.env.TWILIO_WEBHOOK_URL
  if (override) return override
  const host = req.get('x-forwarded-host') || req.get('host') || ''
  return `${req.protocol}://${host}${req.originalUrl}`
}

/**
 * Twilio's scheme: HMAC-SHA1 over the request URL with every POST parameter
 * appended as key+value in sorted key order, base64-encoded.
 */
export function verifyTwilioSignature(opts: {
  signature: string | undefined
  url: string
  params: Record<string, unknown>
}): WebhookVerification {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    return { ok: false, reason: 'TWILIO_AUTH_TOKEN is not configured; cannot verify inbound SMS' }
  }
  if (!opts.signature) {
    return { ok: false, reason: 'missing X-Twilio-Signature header' }
  }

  const params = opts.params || {}
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + String(params[key] ?? ''), opts.url)

  const expected = crypto.createHmac('sha1', authToken).update(Buffer.from(payload, 'utf8')).digest('base64')

  if (!timingSafeEqual(expected, opts.signature)) {
    return { ok: false, reason: 'signature mismatch' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Amazon SNS
// ---------------------------------------------------------------------------

export interface SnsEnvelope {
  Type?: string
  MessageId?: string
  TopicArn?: string
  Subject?: string
  Message?: string
  Timestamp?: string
  SignatureVersion?: string
  Signature?: string
  SigningCertURL?: string
  SigningCertUrl?: string
  SubscribeURL?: string
  Token?: string
}

/**
 * The fields SNS includes in the signature, and the order it concatenates them
 * in. Anything outside this list is unsigned and must not be trusted.
 */
const SIGNED_FIELDS: Record<string, string[]> = {
  Notification: ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'],
  SubscriptionConfirmation: ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'],
  UnsubscribeConfirmation: ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'],
}

/** The cert is public and stable; refetching it per message would be a DoS on ourselves. */
const certCache = new Map<string, string>()
const CERT_CACHE_LIMIT = 8

export async function verifySnsSignature(envelope: SnsEnvelope): Promise<WebhookVerification> {
  const type = envelope.Type || ''
  const fields = SIGNED_FIELDS[type]
  if (!fields) return { ok: false, reason: `unsupported message type ${type || '(none)'}` }
  if (!envelope.Signature) return { ok: false, reason: 'missing Signature' }

  const certUrl = envelope.SigningCertURL || envelope.SigningCertUrl
  if (!certUrl) return { ok: false, reason: 'missing SigningCertURL' }

  const certUrlCheck = validateSigningCertUrl(certUrl)
  if (!certUrlCheck.ok) return certUrlCheck

  const freshness = checkFreshness(envelope.Timestamp)
  if (!freshness.ok) return freshness

  // SignatureVersion 1 is SHA1, 2 is SHA256. Anything else is not something we
  // know how to check, so it does not get the benefit of the doubt.
  const algorithm =
    envelope.SignatureVersion === '2'
      ? 'RSA-SHA256'
      : envelope.SignatureVersion === '1'
        ? 'RSA-SHA1'
        : null
  if (!algorithm) {
    return { ok: false, reason: `unsupported SignatureVersion ${envelope.SignatureVersion || '(none)'}` }
  }

  let stringToSign = ''
  for (const field of fields) {
    const value = (envelope as Record<string, unknown>)[field]
    // Subject is the only optional signed field; when absent it is omitted
    // entirely rather than signed as empty.
    if (value === undefined || value === null) continue
    stringToSign += `${field}\n${String(value)}\n`
  }

  let certificate: string
  try {
    certificate = await fetchSigningCert(certUrl)
  } catch (err: any) {
    return { ok: false, reason: `could not fetch signing certificate: ${err?.message || 'unknown error'}` }
  }

  try {
    const verifier = crypto.createVerify(algorithm)
    verifier.update(stringToSign, 'utf8')
    if (!verifier.verify(certificate, envelope.Signature, 'base64')) {
      return { ok: false, reason: 'signature mismatch' }
    }
  } catch (err: any) {
    return { ok: false, reason: `signature check failed: ${err?.message || 'unknown error'}` }
  }

  return { ok: true }
}

/**
 * The certificate URL arrives inside the very message we are trying to
 * authenticate, so an attacker controls it. Pinning it to an SNS host is what
 * stops them pointing us at a certificate they hold the private key for.
 */
function validateSigningCertUrl(certUrl: string): WebhookVerification {
  let parsed: URL
  try {
    parsed = new URL(certUrl)
  } catch {
    return { ok: false, reason: 'malformed SigningCertURL' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'SigningCertURL is not https' }
  }
  if (!/^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i.test(parsed.hostname)) {
    return { ok: false, reason: `SigningCertURL host not an SNS endpoint: ${parsed.hostname}` }
  }
  return { ok: true }
}

function checkFreshness(timestamp: string | undefined): WebhookVerification {
  if (!timestamp) return { ok: false, reason: 'missing Timestamp' }
  const sent = Date.parse(timestamp)
  if (Number.isNaN(sent)) return { ok: false, reason: 'unparseable Timestamp' }
  if (Math.abs(Date.now() - sent) > MAX_MESSAGE_AGE_MS) {
    return { ok: false, reason: 'message timestamp outside the accepted window' }
  }
  return { ok: true }
}

function fetchSigningCert(certUrl: string): Promise<string> {
  const cached = certCache.get(certUrl)
  if (cached) return Promise.resolve(cached)

  return new Promise((resolve, reject) => {
    const request = https.get(certUrl, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        body += chunk
        if (body.length > 64_000) {
          request.destroy()
          reject(new Error('certificate response too large'))
        }
      })
      res.on('end', () => {
        if (!body.includes('BEGIN CERTIFICATE')) {
          reject(new Error('response was not a PEM certificate'))
          return
        }
        if (certCache.size >= CERT_CACHE_LIMIT) {
          const oldest = certCache.keys().next().value
          if (oldest) certCache.delete(oldest)
        }
        certCache.set(certUrl, body)
        resolve(body)
      })
    })
    request.on('timeout', () => request.destroy(new Error('timed out fetching signing certificate')))
    request.on('error', reject)
  })
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/** Exposed for tests so the cert cache doesn't leak between cases. */
export function __clearSigningCertCache(): void {
  certCache.clear()
}
