import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  SMS_CONSENT_CURRENT_VERSION,
  SMS_CONSENT_DISCLOSURES,
  hasSmsConsent,
  normalizeSmsConsentLocale,
  recordSmsConsent,
  smsConsentText,
} from './sms-consent'

const LOCALE_FILES = { en: 'en-app.json', es: 'es.json', zh: 'zh.json' } as const

function findKeyHolder(node: unknown): Record<string, string> | null {
  if (!node || typeof node !== 'object') return null
  const record = node as Record<string, unknown>
  if (typeof record.contact_smsConsent === 'string') return record as Record<string, string>
  for (const value of Object.values(record)) {
    const found = findKeyHolder(value)
    if (found) return found
  }
  return null
}

beforeEach(() => {
  resetUniversalPrismaMock()
})

describe('the stored disclosure', () => {
  // A consent record is only a defense if its text is what the person saw.
  it.each(Object.entries(LOCALE_FILES))('matches the %s wording the intake form renders', (locale, file) => {
    const json = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../app/src/i18n/locales', file), 'utf8'))
    const strings = findKeyHolder(json)
    expect(strings).not.toBeNull()
    const current = SMS_CONSENT_DISCLOSURES[SMS_CONSENT_CURRENT_VERSION][locale as 'en' | 'es' | 'zh']
    expect(current).toEqual({
      body: strings!.contact_smsConsent,
      terms: strings!.contact_smsConsentTerms,
      privacy: strings!.contact_smsConsentPrivacy,
    })
  })

  it('renders as the form lays it out', () => {
    expect(smsConsentText('1.0', 'en')).toMatch(/See our Terms of Service & Privacy Policy\.$/)
    expect(smsConsentText('0.1', 'en')).toBeNull()
  })

  it('falls back to English for an unsupported language', () => {
    expect(normalizeSmsConsentLocale('es-MX')).toBe('es')
    expect(normalizeSmsConsentLocale('fr')).toBe('en')
    expect(normalizeSmsConsentLocale(undefined)).toBe('en')
  })
})

describe('recordSmsConsent', () => {
  const input = {
    phone: '415-555-0100',
    version: '1.0',
    locale: 'en' as const,
    source: 'intake_quick',
    intakeLeadId: 'lead-1',
    ipAddress: '198.51.100.4',
    userAgent: 'UA',
  }

  it('stores the number in E.164 with a hash of the text', async () => {
    await expect(recordSmsConsent(input)).resolves.toBe(true)
    const data = vi.mocked(prisma.consent.create).mock.calls[0][0].data
    expect(data.phone).toBe('+14155550100')
    expect(data.consentHash).toMatch(/^[0-9a-f]{64}$/)
    expect(data.documentId).toBe('sms-consent-v1.0-en')
  })

  it('does not duplicate the record on every autosave of the same lead', async () => {
    vi.mocked(prisma.consent.findFirst).mockResolvedValue({ id: 'c1', metadata: JSON.stringify({ intakeLeadId: 'lead-1' }) })
    await expect(recordSmsConsent(input)).resolves.toBe(true)
    expect(prisma.consent.create).not.toHaveBeenCalled()
  })

  it('records again when the same number is entered on a new intake', async () => {
    vi.mocked(prisma.consent.findFirst).mockResolvedValue({ id: 'c1', metadata: JSON.stringify({ intakeLeadId: 'lead-0' }) })
    await recordSmsConsent(input)
    expect(prisma.consent.create).toHaveBeenCalledTimes(1)
  })

  it('refuses a number that cannot be dialled', async () => {
    await expect(recordSmsConsent({ ...input, phone: '123' })).resolves.toBe(false)
    expect(prisma.consent.create).not.toHaveBeenCalled()
  })
})

describe('hasSmsConsent', () => {
  it('looks the number up under the same key it was stored with', async () => {
    vi.mocked(prisma.consent.findFirst).mockResolvedValue({ id: 'c1' })
    await expect(hasSmsConsent('(415) 555-0100')).resolves.toBe(true)
    expect(vi.mocked(prisma.consent.findFirst).mock.calls[0][0].where).toMatchObject({
      phone: '+14155550100',
      consentType: 'sms',
      granted: true,
      revokedAt: null,
    })
  })

  it('fails closed when the lookup errors', async () => {
    vi.mocked(prisma.consent.findFirst).mockRejectedValue(new Error('db down'))
    await expect(hasSmsConsent('4155550100')).resolves.toBe(false)
  })
})
