import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    firmTemplate: { findFirst: vi.fn(), findMany: vi.fn() },
    leadSubmission: { findUnique: vi.fn(async () => null) },
  },
}))
vi.mock('./workflow-step-tasks', () => ({ syncWorkflowItemFromTask: vi.fn(async () => undefined) }))

import { prisma } from './prisma'
import { listLetterTemplates, parseLetterUse, renderLetterTemplate } from './letter-templates'
import { UPLOAD_LINK_TOKEN, type LetterContext } from './representation-letters'

const ctx: LetterContext = {
  leadId: 'lead1',
  assessmentId: 'a1',
  clientName: 'Jamie Lee',
  dateOfLoss: 'March 3, 2026',
  attorneyName: 'Mike Pence',
  attorneyEmail: 'mike@firm.com',
  attorneyPhone: null,
  firmName: 'Pence Law',
  firmAddressLines: [],
  firmPhone: null,
  today: 'September 24, 2026',
}

const findFirst = prisma.firmTemplate.findFirst as unknown as ReturnType<typeof vi.fn>
const findMany = prisma.firmTemplate.findMany as unknown as ReturnType<typeof vi.fn>

describe('renderLetterTemplate', () => {
  beforeEach(() => {
    findFirst.mockReset()
  })

  it('fills case and recipient tokens and keeps the upload link for send time', async () => {
    findFirst.mockResolvedValue({
      body: 'To {{provider_name}}\nRE: {{client_name}}, injured {{date_of_loss}}\nUpload: {{records_upload_link}}\nDOB: {{client_dob}}\n\nSincerely,\n{{attorney_name}}',
    })
    const body = await renderLetterTemplate({
      lawFirmId: 'f1',
      templateId: 't1',
      use: 'provider_lor',
      ctx,
      recipient: { recipientName: 'Valley Ortho', providerName: 'Valley Ortho' },
    })
    expect(body).toContain('To Valley Ortho')
    expect(body).toContain('RE: Jamie Lee, injured March 3, 2026')
    expect(body).toContain(`Upload: ${UPLOAD_LINK_TOKEN}`)
    expect(body).toContain('DOB: __________')
    expect(body).toContain('Mike Pence')
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: 't1', lawFirmId: 'f1', letterUse: 'provider_lor', isActive: true })
  })

  it('puts the letter of protection before the sign-off', async () => {
    findFirst.mockResolvedValue({ body: 'Please send records.\n\nSincerely,\n{{attorney_name}}' })
    const body = (await renderLetterTemplate({
      lawFirmId: 'f1',
      templateId: 't1',
      use: 'provider_lor',
      ctx,
      recipient: { recipientName: 'Valley Ortho' },
      includeLop: true,
    }))!
    expect(body.indexOf('LETTER OF PROTECTION')).toBeGreaterThan(-1)
    expect(body.indexOf('LETTER OF PROTECTION')).toBeLessThan(body.indexOf('Sincerely,'))
  })

  it('returns null when the template is missing or has no body', async () => {
    findFirst.mockResolvedValue(null)
    expect(
      await renderLetterTemplate({ lawFirmId: 'f1', templateId: 'x', use: 'carrier_lor', ctx, recipient: { recipientName: 'GEICO' } }),
    ).toBeNull()
    findFirst.mockResolvedValue({ body: '   ' })
    expect(
      await renderLetterTemplate({ lawFirmId: 'f1', templateId: 'x', use: 'carrier_lor', ctx, recipient: { recipientName: 'GEICO' } }),
    ).toBeNull()
  })
})

describe('listLetterTemplates', () => {
  it('lists only templates with body text and flags the default', async () => {
    findMany.mockResolvedValue([
      { id: 'a', name: 'Our LOR', description: null, body: 'Hi', letterDefault: true },
      { id: 'b', name: 'File only', description: null, body: '  ', letterDefault: false },
    ])
    expect(await listLetterTemplates('f1', 'carrier_lor')).toEqual([
      { id: 'a', name: 'Our LOR', description: null, isDefault: true },
    ])
  })
})

describe('parseLetterUse', () => {
  it('accepts only the two letter kinds', () => {
    expect(parseLetterUse('provider_lor')).toBe('provider_lor')
    expect(parseLetterUse('carrier_lor')).toBe('carrier_lor')
    expect(parseLetterUse('retainer')).toBeNull()
    expect(parseLetterUse(undefined)).toBeNull()
  })
})
