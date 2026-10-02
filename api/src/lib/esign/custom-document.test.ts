import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'

vi.mock('../object-storage', () => ({
  persistUpload: vi.fn(async () => undefined),
  ensureLocalCopy: vi.fn(async (p: string) => fs.existsSync(p)),
}))
vi.mock('./firm-template-doc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./firm-template-doc')>()
  return { ...actual, resolveTemplateTokens: vi.fn(async () => ({ case_ref: 'CCIQ-TEST' })) }
})

import { buildCustomDocument } from './custom-document'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'custom-doc-'))
const written: string[] = []
afterAll(() => {
  for (const f of written) fs.rmSync(f, { force: true })
  fs.rmSync(tmp, { recursive: true, force: true })
})

async function writePdf(name: string, withFields: boolean): Promise<string> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  page.drawText('Clause 1. The firm keeps these words exactly.', { x: 50, y: 700, size: 12 })
  if (withFields) {
    const form = doc.getForm()
    const client = form.createTextField('Client Name')
    client.addToPage(page, { x: 50, y: 600, width: 200, height: 20 })
    const fee = form.createTextField('contingency_percent')
    fee.addToPage(page, { x: 50, y: 560, width: 100, height: 20 })
  }
  const file = path.join(tmp, name)
  fs.writeFileSync(file, await doc.save())
  return file
}

const retainerValues = {
  firm_name: 'Smith Law',
  client_name: 'Jane Doe',
  fee_percentage: '35%',
  incident_date: 'March 1, 2026',
}

describe('buildCustomDocument', () => {
  it('fills matching PDF form fields (by key or alias) and flattens them', async () => {
    const src = await writePdf('form.pdf', true)
    const built = await buildCustomDocument({
      leadId: 'lead1',
      docType: 'retainer',
      title: 'Retainer',
      values: retainerValues,
      source: { kind: 'file', filePath: src, mime: 'application/pdf' },
    })
    written.push(built.filePath)
    expect(built.mode).toBe('form_fields')
    expect(built.filledNames.sort()).toEqual(['Client Name', 'contingency_percent'])
    const out = await PDFDocument.load(fs.readFileSync(built.filePath))
    expect(out.getPageCount()).toBe(1)
    expect(out.getForm().getFields()).toHaveLength(0)
    expect(built.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('puts a key terms page in front of a PDF with no fillable fields, keeping its pages', async () => {
    const src = await writePdf('plain.pdf', false)
    const built = await buildCustomDocument({
      leadId: 'lead1',
      docType: 'hipaa_authorization',
      title: 'HIPAA',
      values: { patient_name: 'Jane Doe', provider_name: 'St. Mary' },
      source: { kind: 'file', filePath: src, mime: 'application/pdf' },
    })
    written.push(built.filePath)
    expect(built.mode).toBe('key_terms_page')
    const out = await PDFDocument.load(fs.readFileSync(built.filePath))
    expect(out.getPageCount()).toBe(2)
  })

  it('replaces essential-field and generic tokens in a text template', async () => {
    const built = await buildCustomDocument({
      leadId: 'lead1',
      docType: 'retainer',
      title: 'Retainer',
      values: retainerValues,
      source: { kind: 'body', body: '# Agreement\n\n{{client_name}} retains {{firm_name}} for {{fee_percentage}} on {{case_ref}}.' },
    })
    written.push(built.filePath)
    expect(built.mode).toBe('tokens')
    expect(built.filledNames).toEqual(expect.arrayContaining(['client_name', 'firm_name', 'fee_percentage', 'case_ref']))
  })

  it('adds the key terms page to a text template with no tokens', async () => {
    const built = await buildCustomDocument({
      leadId: 'lead1',
      docType: 'retainer',
      title: 'Retainer',
      values: retainerValues,
      source: { kind: 'body', body: 'The firm’s standard terms.' },
    })
    written.push(built.filePath)
    expect(built.mode).toBe('key_terms_page')
    const out = await PDFDocument.load(fs.readFileSync(built.filePath))
    expect(out.getPageCount()).toBeGreaterThanOrEqual(2)
  })
})
