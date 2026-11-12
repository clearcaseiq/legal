import crypto from 'crypto'
import type { MatterPackageTables, MatterTableKind } from './matter-package'

export const MATTER_FIXTURE_SANITIZATION_VERSION = '1'

type Row = Record<string, unknown>

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function token(salt: string, namespace: string, value: string, prefix: string): string {
  const digest = crypto.createHmac('sha256', salt).update(`${namespace}\0${value}`).digest('hex')
  return `${prefix}-${digest.slice(0, 12)}`
}

function identifierNamespace(kind: MatterTableKind, key: string): { namespace: string; prefix: string } | null {
  const name = normalizedKey(key)
  const looksLikeId =
    name.endsWith('id') ||
    /__(?:c|r)$/i.test(key) ||
    ['id', 'matter', 'case', 'project'].includes(name)
  if (!looksLikeId) return null
  if (name === 'id') {
    if (kind === 'matters') return { namespace: 'matter', prefix: 'MAT' }
    if (kind === 'contacts') return { namespace: 'contact', prefix: 'CON' }
    if (kind === 'medicalVisits') return { namespace: 'visit', prefix: 'VIS' }
  }
  if (/matter|project|case|what|parent|subject|firstpublishlocation/.test(name)) {
    return { namespace: 'matter', prefix: 'MAT' }
  }
  if (/contact|client|person|party|account|who|plaintiff/.test(name)) {
    return { namespace: 'contact', prefix: 'CON' }
  }
  if (/visit|treatment|encounter|appointment/.test(name)) {
    return { namespace: 'visit', prefix: 'VIS' }
  }
  return { namespace: `${kind}:record`, prefix: kind.slice(0, 3).toUpperCase() }
}

function sanitizeScalar(
  kind: MatterTableKind,
  key: string,
  value: string,
  salt: string,
): string {
  const id = identifierNamespace(kind, key)
  if (id) return token(salt, id.namespace, value, id.prefix)

  const name = normalizedKey(key)
  if (/email/.test(name)) return `${token(salt, 'email', value, 'user').toLowerCase()}@example.invalid`
  if (/phone|fax|mobile|telephone/.test(name)) return '555-010-0000'
  if (/zip|postal/.test(name)) return '00000'
  if (/street|address|location/.test(name)) return '100 Example Avenue'
  if (/firstname|givenname/.test(name)) return token(salt, 'person-name', value, 'First')
  if (/lastname|surname|familyname/.test(name)) return token(salt, 'person-name', value, 'Last')
  if (/name|author|assignee|adjuster|provider|carrier|company|organization|firm|employer/.test(name)) {
    return token(salt, 'display-name', value, 'Entity')
  }
  if (/note|body|content|text|description|narrative|facts|summary|injur|diagnos|message|comment/.test(name)) {
    return `[sanitized ${token(salt, 'free-text', value, 'TXT')}]`
  }
  if (/filename|filepath|url|link|download/.test(name)) {
    return `${token(salt, 'document', value, 'DOC')}.dat`
  }
  return value.normalize('NFC').replace(/\r\n?/g, '\n')
}

function sanitizeValue(
  kind: MatterTableKind,
  key: string,
  value: unknown,
  salt: string,
): unknown {
  if (typeof value === 'string') return sanitizeScalar(kind, key, value, salt)
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(kind, key, item, salt))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Row).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizeValue(kind, `${key}.${nestedKey}`, nestedValue, salt),
      ]),
    )
  }
  return value
}

/**
 * Produces a repeatable QA fixture without retaining customer identifiers.
 * Identifier values are remapped by semantic namespace, so primary/foreign-key
 * relationships survive even when their original values do not.
 */
export function sanitizeMatterPackageTables(
  tables: MatterPackageTables,
  salt: string,
): MatterPackageTables {
  if (!salt) throw new Error('A non-empty sanitization salt is required')
  const result: MatterPackageTables = {}
  const kinds = Object.keys(tables).filter((key) => key !== 'unrecognized') as MatterTableKind[]
  for (const kind of kinds) {
    const rows = tables[kind]
    if (!rows) continue
    result[kind] = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, sanitizeValue(kind, key, value, salt)]),
      ),
    )
  }
  if (tables.unrecognized) result.unrecognized = [...tables.unrecognized]
  return result
}
