import crypto from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import {
  buildMatterPackagePlan,
  bundleCounts,
  canonicalJson,
  detectMatterPackage,
  stableRecordHash,
} from './matter-package'
import {
  MATTER_FIXTURE_SANITIZATION_VERSION,
  sanitizeMatterPackageTables,
} from './matter-package-sanitize'

const fixtureDir = resolve(__dirname, '../../fixtures/matter-import/v1')

describe('matter package sanitization', () => {
  it('replaces identifiers consistently while preserving relationships', () => {
    const sanitized = sanitizeMatterPackageTables(
      {
        matters: [{ matter_id: 'customer-matter-42', client_id: 'person-7', incident_date: '2026-01-01', state: 'CA' }],
        contacts: [{
          contact_id: 'person-7',
          matter_id: 'customer-matter-42',
          first_name: 'Real',
          last_name: 'Customer',
          email: 'real@example.com',
          role: 'Client',
        }],
        medicalVisits: [{ visit_id: 'visit-9', matter_id: 'customer-matter-42', provider: 'Real Clinic' }],
        medicalBills: [{ bill_id: 'bill-3', matter_id: 'customer-matter-42', visit_id: 'visit-9', amount: 100 }],
      },
      'qa-only-secret',
    )

    expect(sanitized.matters?.[0].matter_id).not.toBe('customer-matter-42')
    expect(sanitized.contacts?.[0].matter_id).toBe(sanitized.matters?.[0].matter_id)
    expect(sanitized.matters?.[0].client_id).toBe(sanitized.contacts?.[0].contact_id)
    expect(sanitized.medicalBills?.[0].visit_id).toBe(sanitized.medicalVisits?.[0].visit_id)
    const text = JSON.stringify(sanitized)
    expect(text).not.toContain('Real')
    expect(text).not.toContain('real@example.com')
    expect(text).not.toContain('customer-matter-42')
  })

  it('uses canonical hashes independent of object key order and line endings', () => {
    expect(canonicalJson({ b: 'x\r\n', a: 1 })).toBe(canonicalJson({ a: 1, b: 'x\n' }))
    expect(stableRecordHash({ b: 2, a: 1 })).toBe(stableRecordHash({ a: 1, b: 2 }))
  })
})

describe('versioned native-vendor regression fixtures', () => {
  const manifest = JSON.parse(readFileSync(resolve(fixtureDir, 'manifest.json'), 'utf8')) as {
    sanitizationVersion: string
    fixtures: Record<string, {
      file: string
      sha256: string
      expected: Record<string, number>
    }>
  }

  it('uses the current sanitization format', () => {
    expect(manifest.sanitizationVersion).toBe(MATTER_FIXTURE_SANITIZATION_VERSION)
  })

  for (const [vendor, entry] of Object.entries(manifest.fixtures)) {
    it(`keeps the ${vendor} fixture checksum and expected relationships stable`, () => {
      const bytes = readFileSync(resolve(fixtureDir, entry.file))
      // Git may check fixtures out with CRLF on Windows and LF in CI. Hash the
      // canonical text so the regression fingerprint means the same thing on
      // every runner.
      const canonicalBytes = bytes.toString('utf8').replace(/\r\n?/g, '\n')
      expect(crypto.createHash('sha256').update(canonicalBytes).digest('hex')).toBe(entry.sha256)
      const pkg = detectMatterPackage(JSON.parse(bytes.toString('utf8')))
      expect(pkg).not.toBeNull()
      const plan = buildMatterPackagePlan(pkg!, { today: new Date('2026-11-01T12:00:00Z') })
      expect(plan.matters).toHaveLength(entry.expected.matters)
      expect(plan.matters.every((matter) => !matter.issues.some((issue) => issue.severity === 'error'))).toBe(true)
      const counts = plan.matters.reduce<Record<string, number>>((totals, matter) => {
        const next = bundleCounts(matter)
        for (const [key, value] of Object.entries(next)) totals[key] = (totals[key] ?? 0) + value
        return totals
      }, {})
      for (const [key, value] of Object.entries(entry.expected)) {
        if (key !== 'matters') expect(counts[key]).toBe(value)
      }
    })
  }
})
