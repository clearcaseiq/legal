/**
 * SMS consent records — the other half of `sms-opt-out.ts`.
 *
 * The opt-out table proves we stopped when asked. Under the TCPA the defense to
 * a texting claim is the opposite record: when this number agreed, from where,
 * and to exactly what wording. That is a `Consent` row of type 'sms', keyed to
 * the phone number because the people we text from intake usually have no
 * account yet.
 *
 * The wording lives here as well as in the web app's locale files because the
 * API stores the text it was shown, not text the browser claims it was shown.
 * `sms-consent.test.ts` fails if the two copies drift; when the disclosure
 * changes, add a new version here rather than editing an old one, since stored
 * consents point at it.
 */
import crypto from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { optOutKey } from './sms-opt-out'

export const SMS_CONSENT_TYPE = 'sms'
export const SMS_CONSENT_CURRENT_VERSION = '1.0'

export type SmsConsentLocale = 'en' | 'es' | 'zh'

type DisclosureParts = { body: string; terms: string; privacy: string }

/** As rendered next to the intake phone field: `{body} {terms} & {privacy}.` */
export const SMS_CONSENT_DISCLOSURES: Record<string, Record<SmsConsentLocale, DisclosureParts>> = {
  '1.0': {
    en: {
      body: "By adding your phone, you agree to case-related SMS from ClearCaseIQ. Msg & data rates may apply; frequency varies.\nReply STOP to opt out, HELP for help. Consent isn't required to use our service. See our",
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
    },
    es: {
      body: 'Al agregar su teléfono, acepta recibir SMS sobre su caso de ClearCaseIQ. Pueden aplicarse tarifas de mensajes y datos; la frecuencia varía.\nResponda STOP para cancelar, HELP para ayuda. El consentimiento no es obligatorio para usar el servicio. Consulte nuestros',
      terms: 'Términos del Servicio',
      privacy: 'Política de Privacidad',
    },
    zh: {
      body: '添加电话号码即表示同意接收 ClearCaseIQ 关于您案件的短信。可能产生消息和数据费用；频率不定。\n回复 STOP 退订，HELP 获取帮助。同意并非使用服务的条件。请参阅我们的',
      terms: '服务条款',
      privacy: '隐私政策',
    },
  },
}

export function smsConsentText(version: string, locale: SmsConsentLocale): string | null {
  const parts = SMS_CONSENT_DISCLOSURES[version]?.[locale]
  if (!parts) return null
  return `${parts.body} ${parts.terms} & ${parts.privacy}.`
}

export function normalizeSmsConsentLocale(value: unknown): SmsConsentLocale {
  const lang = String(value || '').toLowerCase().slice(0, 2)
  return lang === 'es' || lang === 'zh' ? lang : 'en'
}

export type RecordSmsConsentInput = {
  phone: string
  version: string
  locale: SmsConsentLocale
  /** Where the number was entered, e.g. 'intake_quick'. */
  source: string
  intakeLeadId?: string | null
  userId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Record that a number agreed to texts. Idempotent per number, version and
 * lead, because the wizard re-sends the same phone on every autosave. Never
 * throws: a failed write is logged, and `hasSmsConsent` then keeps the
 * automated texts from going out.
 */
export async function recordSmsConsent(input: RecordSmsConsentInput): Promise<boolean> {
  const phone = optOutKey(input.phone)
  const consentText = smsConsentText(input.version, input.locale)
  if (!phone || !consentText) {
    logger.warn('SMS consent not recorded: unusable phone or unknown disclosure version', {
      tail: (input.phone || '').slice(-4),
      version: input.version,
      locale: input.locale,
    })
    return false
  }
  try {
    const existing = await prisma.consent.findFirst({
      where: { phone, consentType: SMS_CONSENT_TYPE, version: input.version, granted: true, revokedAt: null },
      select: { id: true, metadata: true },
      orderBy: { createdAt: 'desc' },
    })
    if (existing && sameLead(existing.metadata, input.intakeLeadId)) return true

    const consent = await prisma.consent.create({
      data: {
        userId: input.userId || null,
        phone,
        consentType: SMS_CONSENT_TYPE,
        version: input.version,
        documentId: `sms-consent-v${input.version}-${input.locale}`,
        granted: true,
        grantedAt: new Date(),
        signatureMethod: 'phone_entry',
        ipAddress: input.ipAddress || undefined,
        userAgent: input.userAgent || undefined,
        consentText,
        consentHash: crypto.createHash('sha256').update(consentText).digest('hex'),
        metadata: JSON.stringify({
          locale: input.locale,
          source: input.source,
          intakeLeadId: input.intakeLeadId || null,
        }),
      },
      select: { id: true },
    })
    logger.info('SMS consent recorded', { consentId: consent.id, tail: phone.slice(-4), source: input.source })
    return true
  } catch (error: any) {
    logger.error('Failed to record SMS consent', { tail: phone.slice(-4), error: error?.message })
    return false
  }
}

function sameLead(metadata: string | null, intakeLeadId: string | null | undefined): boolean {
  if (!metadata) return !intakeLeadId
  try {
    return (JSON.parse(metadata)?.intakeLeadId ?? null) === (intakeLeadId ?? null)
  } catch {
    return false
  }
}

/**
 * Whether we hold a consent for automated texts to this number. Fails closed:
 * an unsent reminder is recoverable, an unconsented one is the liability.
 */
export async function hasSmsConsent(phone: string | null | undefined): Promise<boolean> {
  const key = optOutKey(phone)
  if (!key) return false
  try {
    const row = await prisma.consent.findFirst({
      where: { phone: key, consentType: SMS_CONSENT_TYPE, granted: true, revokedAt: null },
      select: { id: true },
    })
    return Boolean(row)
  } catch (error: any) {
    logger.error('SMS consent check failed; treating as not consented', { tail: key.slice(-4), error: error?.message })
    return false
  }
}
